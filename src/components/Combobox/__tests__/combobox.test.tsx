import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Combobox, MultiSelect } from "@/components/Combobox/combobox";

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
