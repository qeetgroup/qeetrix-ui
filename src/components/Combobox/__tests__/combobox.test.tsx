import { CheckIcon } from "@qeetrix/icons/icons/check";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { findIcon } from "@/__tests__/icon-match";
import { Combobox, MultiSelect } from "@/components/Combobox/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/Input/field";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

const ITEMS = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Cherry", value: "cherry", disabled: true },
];

describe("Combobox", () => {
  it("renders an input with combobox role and an accessible name", () => {
    render(
      <>
        <label htmlFor="fruit">Fruit</label>
        <Combobox id="fruit" items={ITEMS} />
      </>,
    );
    expect(screen.getByRole("combobox", { name: "Fruit" })).toBeInTheDocument();
  });

  it("keeps the listbox closed until opened", () => {
    render(
      <>
        <label htmlFor="fruit">Fruit</label>
        <Combobox id="fruit" items={ITEMS} />
      </>,
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens the listbox and exposes option roles", () => {
    render(
      <>
        <label htmlFor="fruit">Fruit</label>
        <Combobox id="fruit" items={ITEMS} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const listbox = screen.getByRole("listbox");
    const options = within(listbox).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Apple", "Banana", "Cherry"]);
    expect(within(listbox).getByRole("option", { name: "Cherry" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("reports the chosen value on selection", () => {
    const onValueChange = vi.fn();
    render(
      <>
        <label htmlFor="fruit">Fruit</label>
        <Combobox id="fruit" items={ITEMS} onValueChange={onValueChange} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("option", { name: "Banana" }));
    expect(onValueChange).toHaveBeenCalledWith("banana");
  });

  it("marks the trigger expanded when open", () => {
    render(
      <>
        <label htmlFor="fruit">Fruit</label>
        <Combobox id="fruit" items={ITEMS} />
      </>,
    );
    const input = screen.getByRole("combobox", { name: "Fruit" });
    expect(input).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("renders a disabled input when disabled", () => {
    render(
      <>
        <label htmlFor="fruit">Fruit</label>
        <Combobox id="fruit" items={ITEMS} disabled />
      </>,
    );
    expect(screen.getByRole("combobox", { name: "Fruit" })).toBeDisabled();
  });

  it("has no axe violations when closed", async () => {
    const { container } = render(
      <>
        <label htmlFor="fruit">Fruit</label>
        <Combobox id="fruit" items={ITEMS} />
      </>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations when open", async () => {
    render(
      <>
        <label htmlFor="fruit">Fruit</label>
        <Combobox id="fruit" items={ITEMS} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});

describe("MultiSelect", () => {
  it("renders an input with combobox role and an accessible name", () => {
    render(
      <>
        <label htmlFor="tags">Tags</label>
        <MultiSelect id="tags" items={ITEMS} />
      </>,
    );
    expect(screen.getByRole("combobox", { name: "Tags" })).toBeInTheDocument();
  });

  it("renders selected values as removable chips", () => {
    render(
      <>
        <label htmlFor="tags">Tags</label>
        <MultiSelect id="tags" items={ITEMS} defaultValue={["apple", "banana"]} />
      </>,
    );
    expect(screen.getByRole("button", { name: "Remove Apple" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Banana" })).toBeInTheDocument();
  });

  it("removes a chip and reports the new value", () => {
    const onValueChange = vi.fn();
    render(
      <>
        <label htmlFor="tags">Tags</label>
        <MultiSelect
          id="tags"
          items={ITEMS}
          defaultValue={["apple", "banana"]}
          onValueChange={onValueChange}
        />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove Apple" }));
    expect(onValueChange).toHaveBeenCalledWith(["banana"]);
  });

  it("has no axe violations with chips selected", async () => {
    const { container } = render(
      <>
        <label htmlFor="tags">Tags</label>
        <MultiSelect id="tags" items={ITEMS} defaultValue={["apple"]} />
      </>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Combobox enterprise behaviour", () => {
  const PEOPLE = [
    { label: "Ada Lovelace", value: "ada", description: "Engineering", detail: "EMP-001" },
    { label: "Grace Hopper", value: "grace", description: "Platform", detail: "EMP-002" },
    { label: "Alan Turing", value: "alan", description: "Research", keywords: ["codebreaker"] },
  ];
  const type = async (text: string) => {
    const input = screen.getByRole("combobox", { name: "Owner" });
    await userEvent.clear(input);
    await userEvent.type(input, text);
  };
  const optionNames = () =>
    within(screen.getByRole("listbox"))
      .queryAllByRole("option")
      .map((o) => o.textContent);

  it("is named by aria-label when there is no visible label", () => {
    render(<Combobox items={ITEMS} aria-label="Fruit" />);
    expect(screen.getByRole("combobox", { name: "Fruit" })).toBeInTheDocument();
  });

  it("searches descriptions, details and hidden keywords, not only labels", async () => {
    render(<Combobox items={PEOPLE} aria-label="Owner" />);
    await type("platform");
    expect(optionNames()).toEqual(["Grace HopperPlatformEMP-002"]);
    await type("emp-001");
    expect(optionNames()).toEqual(["Ada LovelaceEngineeringEMP-001"]);
    await type("codebreaker");
    expect(optionNames()).toEqual(["Alan TuringResearch"]);
  });

  it("ignores accents and case", async () => {
    render(
      <Combobox
        items={[
          { label: "Côte d'Ivoire", value: "ci" },
          { label: "Cuba", value: "cu" },
        ]}
        aria-label="Owner"
      />,
    );
    await type("cote");
    expect(optionNames()).toEqual(["Côte d'Ivoire"]);
  });

  it("leaves filtering to the caller with filter={null} (server-side search)", async () => {
    const onInputValueChange = vi.fn();
    render(
      <Combobox
        items={PEOPLE}
        aria-label="Owner"
        filter={null}
        onInputValueChange={onInputValueChange}
      />,
    );
    await type("zzz");
    expect(onInputValueChange).toHaveBeenLastCalledWith("zzz");
    expect(optionNames()).toHaveLength(3);
  });

  it("caps the list with `limit` and says so", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ label: `Item ${i}`, value: `${i}` }));
    render(<Combobox items={many} aria-label="Owner" limit={10} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(optionNames()).toHaveLength(10);
    expect(screen.getByText("Keep typing to narrow the results.")).toBeInTheDocument();
  });

  it("shows and announces loading, marks the popup busy, and holds back the empty message", () => {
    const { container } = render(<Combobox items={[]} aria-label="Owner" loading />);
    expect(container.querySelector("[data-slot=combobox-spinner]")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    // Status and Empty are both polite live regions; the loading text belongs to Status.
    expect(document.querySelector("[data-slot=combobox-status]")).toHaveTextContent("Loading");
    expect(document.querySelector("[data-slot=combobox-content]")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.queryByText("No results.")).not.toBeInTheDocument();
  });

  it("shows the empty message once loading has finished", async () => {
    render(<Combobox items={PEOPLE} aria-label="Owner" />);
    await type("nobody-matches");
    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("marks the selected option with data-selected and a check", () => {
    render(<Combobox items={ITEMS} aria-label="Fruit" defaultValue="banana" />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const banana = screen.getByRole("option", { name: "Banana" });
    expect(banana).toHaveAttribute("aria-selected", "true");
    expect(banana).toHaveAttribute("data-selected");
    expect(findIcon(banana, CheckIcon)).not.toBeNull();
    // `data-selected:` (shadcn's custom variant) matches only ="true"; Base UI writes "".
    expect(banana.className).toContain("data-[selected]:bg-brand-subtle");
    expect(banana.className).not.toMatch(/(^|\s)data-selected:/);
  });

  it("takes its label, description and invalid state from a Field", () => {
    render(
      <Field>
        <FieldLabel>Owner</FieldLabel>
        <Combobox items={PEOPLE} />
        <FieldDescription>Who is accountable.</FieldDescription>
        <FieldError>Choose an owner.</FieldError>
      </Field>,
    );
    const input = screen.getByRole("combobox", { name: "Owner" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/Who is accountable\./);
  });

  it("submits the option's value under `name`", () => {
    render(
      <form aria-label="assign">
        <Combobox items={PEOPLE} aria-label="Owner" name="owner" defaultValue="grace" />
      </form>,
    );
    const data = new FormData(screen.getByRole("form", { name: "assign" }) as HTMLFormElement);
    expect(data.get("owner")).toBe("grace");
  });

  it("ignores changes when read-only", () => {
    const onValueChange = vi.fn();
    render(<Combobox items={ITEMS} aria-label="Owner" readOnly onValueChange={onValueChange} />);
    expect(screen.getByRole("combobox", { name: "Owner" })).toHaveAttribute("readonly");
  });

  it("marks the field required", () => {
    render(<Combobox items={ITEMS} aria-label="Owner" required />);
    expect(screen.getByRole("combobox", { name: "Owner" })).toHaveAttribute(
      "aria-required",
      "true",
    );
  });

  it("draws the field from Input's tokens and focus recipe", () => {
    render(<Combobox items={ITEMS} aria-label="Owner" />);
    const input = screen.getByRole("combobox", { name: "Owner" });
    expect(input.className.split(/\s+/)).toEqual(
      expect.arrayContaining([
        "[--field-edge:var(--qx-component-input-border)]",
        "bg-(--qx-component-input-background)",
        "focus-visible:focus-ring-field",
      ]),
    );
    expect(input.className).not.toMatch(/ring-ring\/disabled|dark:bg-input/);
  });

  it("has no axe violations while loading", async () => {
    render(<Combobox items={[]} aria-label="Owner" loading />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});

describe("MultiSelect states", () => {
  it("is named by aria-label, and the chips field reads invalid from its input", () => {
    const { container } = render(<MultiSelect items={ITEMS} aria-label="Tags" aria-invalid />);
    expect(screen.getByRole("combobox", { name: "Tags" })).toHaveAttribute("aria-invalid", "true");
    const fieldEl = container.querySelector("[data-slot=multi-select-field]");
    // fieldGroupSurface: the container takes the invalid edge through :has(), so a chip's own
    // remove button never rings or fades the field.
    expect(fieldEl?.className).toContain(
      "has-[[aria-invalid=true]]:[--field-status:var(--qx-component-input-border-invalid)]",
    );
  });

  it("keeps selected options checked in the list", () => {
    render(<MultiSelect items={ITEMS} aria-label="Tags" defaultValue={["apple"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("option", { name: "Apple" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });
});

describe("MultiSelect read-only chips (integration pass)", () => {
  it("does not put aria-readonly on a generic chip element", async () => {
    const { container } = render(
      <MultiSelect aria-label="Scopes" items={ITEMS} defaultValue={[ITEMS[0].value]} readOnly />,
    );
    const chip = container.querySelector("[data-slot=multi-select-chip]");
    expect(chip).not.toBeNull();
    expect(chip).not.toHaveAttribute("aria-readonly");
    expect(
      await axe(container, { rules: { "color-contrast": { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
