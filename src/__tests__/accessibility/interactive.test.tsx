/**
 * The interactive audit — native controls and the widgets built directly on them.
 *
 * The split from `audit.test.tsx` is by tier, not by rigour: that file covers the Tier 1–4 pilots,
 * this one continues through the form controls and the simpler composites. Same standard —
 * `pass` in the registry means something here covers it.
 *
 * These components mostly wrap native elements, so much of the audit is *checking that they still
 * are native*: a `<textarea>` that became a contenteditable div, or a link that became a div with
 * an onClick, loses its keyboard model, its focus behaviour and its role in one edit.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAccessibleName,
  expectAriaRelationship,
  expectAriaState,
  expectFocus,
  expectNoA11yViolations,
  pressArrowDown,
  pressArrowLeft,
  pressArrowRight,
  pressArrowUp,
  pressEnd,
  pressEnter,
  pressHome,
  pressSpace,
  pressTab,
} from "@/__tests__/accessibility";
import { Button } from "@/components/Button/button";
import { Toggle, ToggleGroup } from "@/components/Button/toggle";
import { InputGroup, InputGroupInput } from "@/components/Input/input-group";
import { NumberField } from "@/components/NumberField/number-field";
import { OTPInput } from "@/components/OTPInput/otp-input";
import { PasswordInput } from "@/components/PasswordInput/password-input";
import { Rating } from "@/components/Rating/rating";
import { Slider } from "@/components/Slider/slider";
import { Textarea } from "@/components/Input/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/Accordion/collapsible";
import { SkipNav, SkipNavContent } from "@/components/SkipNav/skip-nav";
import { CheckboxCard, CheckboxCardGroup } from "@/components/Checkbox/checkbox-card";
import { Listbox } from "@/components/Listbox/listbox";
import { NativeSelect } from "@/components/Select/native-select";
import { RadioCard, RadioCardGroup } from "@/components/RadioGroup/radio-card";
import { Radio, RadioGroup } from "@/components/RadioGroup/radio-group";
import { CopyButton } from "@/components/Clipboard/clipboard";
import { Link } from "@/components/Link/link";
import { Spoiler } from "@/components/Spoiler/spoiler";
import { DirectionProvider } from "@/providers/direction-provider";

// ── native text controls ─────────────────────────────────────────────────────────────────
describe("Textarea", () => {
  it("is a native textarea, named by its label", async () => {
    const { container } = render(
      <>
        <label htmlFor="bio">Biography</label>
        <Textarea id="bio" />
      </>,
    );
    const field = screen.getByRole("textbox", { name: "Biography" });
    expect(field.tagName).toBe("TEXTAREA");
    await expectNoA11yViolations(container);
  });

  it("distinguishes disabled from read-only in behaviour, not just appearance", async () => {
    render(
      <>
        <Textarea aria-label="Disabled" disabled defaultValue="a" />
        <Textarea aria-label="Read only" readOnly defaultValue="b" />
      </>,
    );
    const disabled = screen.getByRole("textbox", { name: "Disabled" });
    const readOnly = screen.getByRole("textbox", { name: "Read only" });
    // Read-only stays focusable so a keyboard user can read and copy it; disabled does not.
    readOnly.focus();
    expectFocus(readOnly);
    expect(disabled).toBeDisabled();
    await userEvent.type(readOnly, "x");
    expect(readOnly).toHaveValue("b");
  });
});

describe("PasswordInput", () => {
  it("has a labelled reveal control that reports its state", async () => {
    const { container } = render(<PasswordInput aria-label="Password" />);
    const toggle = screen.getByRole("button");
    // The control must say what it does and what state it is in — an unlabelled eye icon does not.
    expect(toggle).toHaveAccessibleName();
    await userEvent.click(toggle);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    await expectNoA11yViolations(container);
  });
});

describe("NumberField", () => {
  it("is a named numeric field, driven by arrow keys", async () => {
    const { container } = render(
      <NumberField aria-label="Quantity" defaultValue={5} min={0} max={10} />,
    );
    // Base UI's NumberField is a text input with numeric behaviour, not a spinbutton role.
    const field = screen.getByRole("textbox", { name: "Quantity" });
    field.focus();
    await pressArrowUp();
    await waitFor(() => expect(field).toHaveValue("6"));
    await pressArrowDown();
    await waitFor(() => expect(field).toHaveValue("5"));
    await expectNoA11yViolations(container);
  });

  it("labels its increment and decrement buttons", () => {
    render(<NumberField aria-label="Quantity" defaultValue={5} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAccessibleName();
    }
  });
});

describe("OTPInput", () => {
  it("exposes one labelled field per digit and advances as you type", async () => {
    const { container } = render(
      <OTPInput length={4} defaultValue="" aria-label="One-time code" />,
    );
    const boxes = screen.getAllByRole("textbox");
    expect(boxes).toHaveLength(4);
    for (const box of boxes) expect(box).toHaveAccessibleName();
    boxes[0].focus();
    await userEvent.keyboard("12");
    await waitFor(() => expectFocus(boxes[2]));
    await expectNoA11yViolations(container);
  });

  it("steps back on Backspace from an empty box, so a typo is correctable", async () => {
    render(<OTPInput length={4} defaultValue="" aria-label="One-time code" />);
    const boxes = screen.getAllByRole("textbox");
    boxes[0].focus();
    await userEvent.keyboard("1");
    await userEvent.keyboard("{Backspace}{Backspace}");
    await waitFor(() => expectFocus(boxes[0]));
  });
});

describe("InputGroup", () => {
  it("keeps the inner control a real input, reachable and named", async () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput aria-label="Search" />
      </InputGroup>,
    );
    const field = screen.getByRole("textbox", { name: "Search" });
    expect(field.tagName).toBe("INPUT");
    field.focus();
    expectFocus(field);
    await expectNoA11yViolations(container);
  });
});

// ── selection ────────────────────────────────────────────────────────────────────────────
describe("RadioGroup", () => {
  it("is a radiogroup whose members share one tab stop", async () => {
    const { container } = render(
      <RadioGroup aria-label="Plan" defaultValue="free">
        <Radio value="free" aria-label="Free" />
        <Radio value="pro" aria-label="Pro" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Plan" })).toBeInTheDocument();
    const [free, pro] = screen.getAllByRole("radio");
    expectAriaState(free, "aria-checked", "true");
    free.focus();
    await pressArrowDown();
    expectFocus(pro);
    expectAriaState(pro, "aria-checked", "true");
    await expectNoA11yViolations(container);
  });
});

describe("RadioCardGroup", () => {
  it("uses native radios, so the browser supplies roving focus", async () => {
    const { container } = render(
      <RadioCardGroup aria-label="Tier" defaultValue="a">
        <RadioCard value="a">Starter</RadioCard>
        <RadioCard value="b">Growth</RadioCard>
      </RadioCardGroup>,
    );
    const radios = screen.getAllByRole("radio");
    expect(radios[0].tagName).toBe("INPUT");
    // The group is named, which an unlabelled radiogroup role would not be.
    expect(screen.getByRole("radiogroup", { name: "Tier" })).toBeInTheDocument();
    radios[0].focus();
    await pressArrowDown();
    expectFocus(radios[1]);
    await expectNoA11yViolations(container);
  });
});

describe("CheckboxCardGroup", () => {
  it("exposes each card as a checkbox with a name", async () => {
    const { container } = render(
      <CheckboxCardGroup aria-label="Add-ons">
        <CheckboxCard value="a">Backups</CheckboxCard>
        <CheckboxCard value="b">Support</CheckboxCard>
      </CheckboxCardGroup>,
    );
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    expectAccessibleName(boxes[0], "Backups");
    boxes[0].focus();
    await pressSpace();
    expect(boxes[0]).toBeChecked();
    await expectNoA11yViolations(container);
  });
});

describe("NativeSelect", () => {
  it("is a real select — the platform's picker, keyboard and AT support", async () => {
    const { container } = render(
      <NativeSelect aria-label="Country">
        <option value="in">India</option>
        <option value="gb">United Kingdom</option>
      </NativeSelect>,
    );
    const select = screen.getByRole("combobox", { name: "Country" });
    expect(select.tagName).toBe("SELECT");
    await userEvent.selectOptions(select, "gb");
    expect(select).toHaveValue("gb");
    await expectNoA11yViolations(container);
  });
});

describe("Listbox", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Bravo" },
    { value: "c", label: "Charlie" },
  ];

  it("uses the active-descendant model, so highlight and announcement cannot diverge", async () => {
    const { container } = render(<Listbox options={options} aria-label="Letters" />);
    const listbox = screen.getByRole("listbox", { name: "Letters" });
    listbox.focus();
    await pressArrowDown();
    // The container keeps DOM focus; aria-activedescendant names the active option.
    expectFocus(listbox);
    expectAriaRelationship(listbox, "aria-activedescendant");
    await expectNoA11yViolations(container);
  });

  it("moves the active option with arrows, Home and End", async () => {
    render(<Listbox options={options} aria-label="Letters" />);
    const listbox = screen.getByRole("listbox");
    const active = () => listbox.getAttribute("aria-activedescendant");
    listbox.focus();
    await pressArrowDown();
    const first = active();
    await pressArrowDown();
    expect(active()).not.toBe(first);
    await pressEnd();
    const last = active();
    await pressHome();
    expect(active()).not.toBe(last);
  });

  it("reports selection on the option, not just visually", async () => {
    render(<Listbox options={options} aria-label="Letters" defaultValue="b" />);
    const selected = screen.getByRole("option", { selected: true });
    expectAccessibleName(selected, "Bravo");
  });
});

// ── ranges ───────────────────────────────────────────────────────────────────────────────
describe("Slider", () => {
  /**
   * KNOWN LIMITATION: Base UI's thumb is hidden until it has measured the track, and jsdom has no
   * layout, so the measurement never resolves and the thumb's range input stays out of the
   * computed accessibility tree here. `hidden: true` queries past that. In a browser the thumb
   * measures and is exposed normally — which is why Slider's `focus` dimension is recorded as
   * `partial` rather than `pass`.
   */
  // Queried without a name: the accessible-name computation returns nothing for an element the
  // tree considers hidden, so the label is asserted as an attribute instead.
  const slider = () => screen.getByRole("slider", { hidden: true });

  it("is a slider with value, bounds and a name", async () => {
    const { container } = render(
      <Slider aria-label="Volume" defaultValue={40} min={0} max={100} />,
    );
    const control = slider();
    expect(control).toHaveAttribute("aria-label", "Volume");
    expect(control).toHaveAttribute("aria-valuenow", "40");
    expect(control).toHaveAttribute("min", "0");
    expect(control).toHaveAttribute("max", "100");
    await expectNoA11yViolations(container);
  });

  it("renders exactly one thumb for a single value", () => {
    // Regression: the thumb count fell back to [min, max], so every single-value slider rendered
    // two thumbs — a duplicate slider in the accessibility tree and a phantom tab stop.
    render(<Slider aria-label="Volume" defaultValue={40} />);
    expect(screen.getAllByRole("slider", { hidden: true })).toHaveLength(1);
  });

  it("renders one thumb per value for a range", () => {
    render(<Slider aria-label="Range" defaultValue={[20, 80]} />);
    expect(screen.getAllByRole("slider", { hidden: true })).toHaveLength(2);
  });

  it("steps with arrows and jumps with Home/End", async () => {
    render(<Slider aria-label="Volume" defaultValue={40} min={0} max={100} />);
    const control = slider();
    control.focus();
    await pressArrowRight();
    await waitFor(() => expect(control).toHaveAttribute("aria-valuenow", "41"));
    await pressHome();
    await waitFor(() => expect(control).toHaveAttribute("aria-valuenow", "0"));
    await pressEnd();
    await waitFor(() => expect(control).toHaveAttribute("aria-valuenow", "100"));
  });

  it("mirrors the inline axis under rtl without inverting the value", async () => {
    render(
      <DirectionProvider direction="rtl">
        <Slider aria-label="Volume" defaultValue={40} min={0} max={100} />
      </DirectionProvider>,
    );
    const control = slider();
    control.focus();
    // In RTL, ArrowLeft moves toward the *end* of the inline axis, so the value increases.
    await pressArrowLeft();
    await waitFor(() => expect(Number(control.getAttribute("aria-valuenow"))).toBeGreaterThan(40));
  });
});

describe("Rating", () => {
  it("is a slider — a value in a range — with a name and value text", async () => {
    const { container } = render(<Rating aria-label="Quality" defaultValue={3} max={5} />);
    const rating = screen.getByRole("slider", { name: /Quality/ });
    expectAriaState(rating, "aria-valuenow", "3");
    expectAriaState(rating, "aria-valuemax", "5");
    await expectNoA11yViolations(container);
  });

  it("steps with arrows, and Home/End reach the ends of the scale", async () => {
    render(<Rating aria-label="Quality" defaultValue={3} max={5} />);
    const rating = screen.getByRole("slider");
    rating.focus();
    await pressArrowRight();
    expectAriaState(rating, "aria-valuenow", "4");
    await pressArrowLeft();
    expectAriaState(rating, "aria-valuenow", "3");
    await pressHome();
    expectAriaState(rating, "aria-valuenow", "0");
    await pressEnd();
    expectAriaState(rating, "aria-valuenow", "5");
  });
});

// ── disclosure and toggles ───────────────────────────────────────────────────────────────
describe("Collapsible", () => {
  it("reports expanded state and controls a panel that exists", async () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleTrigger render={<Button>Details</Button>} />
        <CollapsibleContent>Panel body</CollapsibleContent>
      </Collapsible>,
    );
    const trigger = screen.getByRole("button", { name: "Details" });
    expectAriaState(trigger, "aria-expanded", "false");
    await userEvent.click(trigger);
    expectAriaState(trigger, "aria-expanded", "true");
    expectAriaRelationship(trigger, "aria-controls");
    await expectNoA11yViolations(container);
  });

  it("toggles on Enter and Space", async () => {
    render(
      <Collapsible>
        <CollapsibleTrigger render={<Button>Details</Button>} />
        <CollapsibleContent>Panel body</CollapsibleContent>
      </Collapsible>,
    );
    const trigger = screen.getByRole("button", { name: "Details" });
    trigger.focus();
    await pressEnter();
    expectAriaState(trigger, "aria-expanded", "true");
    await pressSpace();
    expectAriaState(trigger, "aria-expanded", "false");
  });
});

describe("Spoiler", () => {
  it("is a disclosure: a labelled button controlling the content it reveals", async () => {
    const { container } = render(<Spoiler>Long text</Spoiler>);
    const trigger = screen.getByRole("button", { name: "Show more" });
    expectAriaState(trigger, "aria-expanded", "false");
    expectAriaRelationship(trigger, "aria-controls");
    await userEvent.click(trigger);
    expectAriaState(trigger, "aria-expanded", "true");
    await expectNoA11yViolations(container);
  });
});

describe("Toggle", () => {
  it("reports pressed state, so a toggle is distinguishable from a plain button", async () => {
    const { container } = render(<Toggle aria-label="Bold" />);
    const toggle = screen.getByRole("button", { name: "Bold" });
    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-pressed", "true"));
    await expectNoA11yViolations(container);
  });

  it("ToggleGroup keeps each member individually named and operable", async () => {
    render(
      <ToggleGroup aria-label="Alignment">
        <Toggle value="left" aria-label="Left" />
        <Toggle value="right" aria-label="Right" />
      </ToggleGroup>,
    );
    const toggles = screen.getAllByRole("button");
    for (const toggle of toggles) expect(toggle).toHaveAccessibleName();
    toggles[0].focus();
    await pressSpace();
    await waitFor(() => expect(toggles[0]).toHaveAttribute("aria-pressed", "true"));
  });
});

// ── navigation primitives ────────────────────────────────────────────────────────────────
describe("Link", () => {
  it("is an anchor with an href, so it behaves like a link", async () => {
    const { container } = render(<Link href="/settings">Settings</Link>);
    const link = screen.getByRole("link", { name: "Settings" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/settings");
    await expectNoA11yViolations(container);
  });

  it("activates on Enter — a link, not a button", async () => {
    const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault());
    render(
      <Link href="#x" onClick={onClick}>
        Go
      </Link>,
    );
    screen.getByRole("link").focus();
    await pressEnter();
    expect(onClick).toHaveBeenCalled();
  });
});

describe("SkipNav", () => {
  it("is the first thing Tab reaches, and points at a real target", async () => {
    const { container } = render(
      <>
        <SkipNav />
        <Button>Nav item</Button>
        <SkipNavContent />
      </>,
    );
    await pressTab();
    const skip = screen.getByRole("link");
    expectFocus(skip);
    // The target must exist, or the link sends the user nowhere.
    const target = skip.getAttribute("href")?.replace("#", "");
    expect(document.getElementById(target ?? "")).not.toBeNull();
    await expectNoA11yViolations(container);
  });
});

describe("CopyButton", () => {
  // jsdom has no Clipboard API, and an unstubbed writeText rejects unhandled.
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("is a named button that reports the outcome without stealing focus", async () => {
    const { container } = render(<CopyButton value="secret" />);
    const button = screen.getByRole("button");
    expect(button).toHaveAccessibleName();
    button.focus();
    await userEvent.click(button);
    // Feedback must not move focus — the user is mid-task.
    expectFocus(button);
    await expectNoA11yViolations(container);
  });
});
