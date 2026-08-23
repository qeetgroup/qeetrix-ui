/**
 * The controlled/uncontrolled contract, as observed through the components that implement it.
 *
 * `use-controllable-state.test.ts` next to this file proves the hook. This file proves the
 * *contract*, which is a different claim: a component can hold the hook and still get it wrong
 * (read the prop once, seed from a default that later changes, notify twice), and half of the
 * stateful families in these two categories do not use the hook at all — they hand-roll the same
 * three lines. So the questions are asked of the rendered component, from the outside, and the
 * table is the point: a per-component spot check reproduces exactly the drift it is meant to
 * catch.
 *
 * Five questions per family:
 *
 *   1. uncontrolled — `defaultValue` seeds it and the component owns it afterwards
 *   2. controlled — the prop stays authoritative when the parent ignores the callback
 *   3. notification — the callback fires *exactly once* per interaction, with the intended value
 *   4. defaults are initial — a `defaultValue` that changes after mount is ignored
 *   5. takeover — a `value` that arrives mid-life takes over from the component's own state
 *
 * Deliberately out of scope: families with no uncontrolled mode at all (TagInput, MentionInput,
 * CountryPicker, TimezonePicker, CurrencyInput take a required `value`), for which questions 1,
 * 4 and 5 have no meaning. The reverse transition — a `value` that *disappears* mid-life — is a
 * hook-level property with a documented answer, and is pinned in the `.ts` file rather than here.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { ColorPicker } from "@/components/ColorPicker/color-picker";
import { DatePicker } from "@/components/DatePicker/date-picker";
import { TimePicker } from "@/components/DatePicker/time-picker";
import { Editable, EditableInput, EditablePreview } from "@/components/Editable/editable";
import { MaskInput } from "@/components/MaskInput/mask-input";
import { OTPInput } from "@/components/OTPInput/otp-input";
import { Rating } from "@/components/Rating/rating";
import { AngleSlider } from "@/components/Slider/angle-slider";

/** The uniform shape every case is rendered through, whichever prop names it really uses. */
interface CaseProps {
  value?: unknown;
  defaultValue?: unknown;
  onChange: (next: never) => void;
}

interface ControlledCase {
  label: string;
  /** The real prop names, so a failure names the API it is talking about. */
  axis: string;
  /** The seed (uncontrolled) or authoritative value (controlled). */
  a: unknown;
  /** What one interaction is expected to produce, as the callback reports it. */
  b: unknown;
  /** A third value, supplied by a parent that takes control mid-life. */
  c: unknown;
  /** How `a`, `b` and `c` read back off the screen. */
  reads: [string, string, string];
  render: (props: CaseProps) => React.ReactElement;
  /** Perform exactly one user interaction that should produce `b`. */
  interact: () => Promise<void>;
  /** The value currently on screen. */
  read: () => Promise<string> | string;
}

const digits = () =>
  (screen.getAllByRole("textbox") as HTMLInputElement[]).map((i) => i.value).join("");

const sliderNow = () => screen.getByRole("slider").getAttribute("aria-valuenow") ?? "";

const textboxValue = () => (screen.getByRole("textbox") as HTMLInputElement).value;

/** Pick an option out of an open Select listbox by its visible label. */
async function chooseOption(comboboxName: string, label: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: comboboxName }));
  const list = await screen.findByRole("listbox");
  const option = Array.from(list.querySelectorAll('[role="option"]')).find(
    (o) => o.textContent === label,
  );
  await user.click(option as Element);
}

const cases: ControlledCase[] = [
  {
    label: "OTPInput",
    axis: "value / defaultValue / onChange",
    a: "12",
    b: "13",
    c: "99",
    reads: ["12", "13", "99"],
    render: ({ onChange, ...props }) => (
      <OTPInput
        {...(props as { value?: string; defaultValue?: string })}
        length={2}
        onChange={onChange}
        aria-label="Code"
      />
    ),
    interact: async () => {
      fireEvent.change(screen.getAllByRole("textbox")[1], { target: { value: "3" } });
    },
    read: digits,
  },
  {
    label: "Rating",
    axis: "value / defaultValue / onChange",
    a: 2,
    b: 3,
    c: 5,
    reads: ["2", "3", "5"],
    render: ({ onChange, ...props }) => (
      <Rating
        {...(props as { value?: number; defaultValue?: number })}
        onChange={onChange}
        aria-label="Rate"
      />
    ),
    interact: async () => {
      fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    },
    read: sliderNow,
  },
  {
    label: "AngleSlider",
    axis: "value / defaultValue / onValueChange",
    a: 10,
    b: 11,
    c: 200,
    reads: ["10", "11", "200"],
    render: ({ onChange, ...props }) => (
      <AngleSlider
        {...(props as { value?: number; defaultValue?: number })}
        onValueChange={onChange}
        aria-label="Angle"
      />
    ),
    interact: async () => {
      fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    },
    read: sliderNow,
  },
  {
    label: "MaskInput",
    axis: "value / defaultValue / onValueChange",
    // The callback reports the raw digits; the input displays the masked form. With a bare "###"
    // mask the two coincide, which keeps the case about state ownership rather than masking.
    a: "12",
    b: "123",
    c: "456",
    reads: ["12", "123", "456"],
    render: ({ onChange, ...props }) => (
      <MaskInput
        {...(props as { value?: string; defaultValue?: string })}
        mask="###"
        onValueChange={(raw) => onChange(raw as never)}
        aria-label="Code"
      />
    ),
    interact: async () => {
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "123" } });
    },
    read: textboxValue,
  },
  {
    label: "ColorPicker",
    axis: "value / defaultValue / onChange",
    a: "#abc",
    b: "#def",
    c: "#010101",
    reads: ["#abc", "#def", "#010101"],
    render: ({ onChange, ...props }) => (
      <ColorPicker
        {...(props as { value?: string; defaultValue?: string })}
        presets={[]}
        onChange={onChange}
        ariaLabel="Colour"
      />
    ),
    interact: async () => {
      fireEvent.change(screen.getByRole("textbox", { name: "Colour" }), {
        target: { value: "#def" },
      });
    },
    read: textboxValue,
  },
  {
    label: "Editable",
    axis: "value / defaultValue / onValueChange",
    a: "Alpha",
    b: "Beta",
    c: "Gamma",
    reads: ["Alpha", "Beta", "Gamma"],
    render: ({ onChange, ...props }) => (
      <Editable {...(props as { value?: string; defaultValue?: string })} onValueChange={onChange}>
        <EditablePreview aria-label="Name" />
        <EditableInput aria-label="Edit name" />
      </Editable>
    ),
    interact: async () => {
      fireEvent.click(screen.getByRole("button", { name: "Name" }));
      const input = screen.getByRole("textbox", { name: "Edit name" });
      fireEvent.change(input, { target: { value: "Beta" } });
      fireEvent.keyDown(input, { key: "Enter" });
    },
    read: () => screen.getByRole("button", { name: "Name" }).textContent ?? "",
  },
  {
    label: "TimePicker",
    axis: "value / defaultValue / onValueChange",
    a: "09:00",
    b: "10:00",
    c: "23:00",
    reads: ["09:00", "10:00", "23:00"],
    render: ({ onChange, ...props }) => (
      <TimePicker
        {...(props as { value?: string; defaultValue?: string })}
        onValueChange={onChange}
        aria-label="Time"
      />
    ),
    interact: () => chooseOption("Hours", "10"),
    // The Select trigger's textContent carries the chevron's own text fallback as well as the
    // value, so only the digits are read.
    read: () =>
      ["Hours", "Minutes"]
        .map((column) =>
          (screen.getByRole("combobox", { name: column }).textContent ?? "").replace(/\D/g, ""),
        )
        .join(":"),
  },
  {
    label: "DatePicker",
    axis: "value / defaultValue / onValueChange",
    // Local parts, so the ISO the hidden input submits is not timezone-dependent.
    a: new Date(2026, 7, 4),
    b: new Date(2026, 7, 17),
    c: new Date(2026, 7, 21),
    reads: ["2026-08-04", "2026-08-17", "2026-08-21"],
    render: ({ onChange, ...props }) => (
      <DatePicker
        {...(props as { value?: Date; defaultValue?: Date })}
        onValueChange={onChange}
        name="day"
        aria-label="Day"
      />
    ),
    interact: async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Day" }));
      const cell = (await screen.findAllByRole("button")).find(
        (b) => b.textContent?.trim() === "17",
      );
      await user.click(cell as Element);
    },
    // Read through the submitted value: the visible trigger text is locale-formatted, the
    // hidden canonical value is not.
    read: () =>
      (document.querySelector("[data-slot=field-hidden-input]") as HTMLInputElement).value,
  },
];

describe.each(cases)("$label controlled/uncontrolled contract ($axis)", (testCase) => {
  const { a, b, c, reads, render: renderCase, interact, read } = testCase;
  const [readA, readB, readC] = reads;

  it("uncontrolled: the default seeds it and it owns the value afterwards", async () => {
    const onChange = vi.fn();
    render(renderCase({ defaultValue: a, onChange }));
    expect(await read()).toBe(readA);

    await interact();
    await waitFor(async () => expect(await read()).toBe(readB));
  });

  it("controlled: the prop stays authoritative when the parent ignores the callback", async () => {
    const onChange = vi.fn();
    render(renderCase({ value: a, onChange }));
    expect(await read()).toBe(readA);

    await interact();
    expect(onChange).toHaveBeenCalled();
    // The parent did not update the prop, so nothing on screen may have moved.
    expect(await read()).toBe(readA);
  });

  it("notifies exactly once, with the value the interaction intended", async () => {
    const onChange = vi.fn();
    render(renderCase({ defaultValue: a, onChange }));
    await interact();
    expect(onChange).toHaveBeenCalledExactlyOnceWith(b);
  });

  it("ignores a defaultValue that changes after mount", async () => {
    const onChange = vi.fn();
    const { rerender } = render(renderCase({ defaultValue: a, onChange }));
    rerender(renderCase({ defaultValue: c, onChange }));
    // `defaultValue` is an initial value, not a fallback: re-seeding here would discard whatever
    // the user had done.
    expect(await read()).toBe(readA);
  });

  it("hands authority over when a value arrives mid-life", async () => {
    const onChange = vi.fn();
    const { rerender } = render(renderCase({ defaultValue: a, onChange }));
    await interact();
    await waitFor(async () => expect(await read()).toBe(readB));

    rerender(renderCase({ value: c, onChange }));
    await waitFor(async () => expect(await read()).toBe(readC));

    // And it stays authoritative: the component's own state is no longer in charge.
    onChange.mockClear();
    await interact();
    expect(await read()).toBe(readC);
  });
});
