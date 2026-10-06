import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Autocomplete } from "@/components/Combobox/autocomplete";
import { Field, FieldError, FieldLabel } from "@/components/Input/field";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("Autocomplete", () => {
  it("renders an input with an accessible name", () => {
    render(<Autocomplete aria-label="Search fruit" items={["Apple", "Banana"]} />);
    expect(screen.getByLabelText("Search fruit")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Autocomplete aria-label="Search" items={["Apple"]} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Autocomplete states", () => {
  it("suggests while typing and keeps the typed text as the value", async () => {
    render(<Autocomplete aria-label="City" items={["Mumbai", "Pune", "Bengaluru"]} />);
    const input = screen.getByRole("combobox", { name: "City" });
    await userEvent.type(input, "pu");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Pune"]);
    expect(input).toHaveValue("pu");
  });

  it("takes its label and invalid state from a Field", () => {
    render(
      <Field>
        <FieldLabel>City</FieldLabel>
        <Autocomplete items={["Pune"]} />
        <FieldError>Enter a city.</FieldError>
      </Field>,
    );
    expect(screen.getByRole("combobox", { name: "City" })).toHaveAttribute("aria-invalid", "true");
  });

  it("marks the input required — browser-enforced, the input is the form control", () => {
    render(<Autocomplete aria-label="City" items={["Pune"]} required />);
    expect(screen.getByRole("combobox", { name: "City" })).toBeRequired();
  });

  it("shows and announces loading, and holds back the empty message", async () => {
    const { container } = render(<Autocomplete aria-label="City" items={[]} loading />);
    expect(container.querySelector("[data-slot=autocomplete-spinner]")).not.toBeNull();
    await userEvent.type(screen.getByRole("combobox", { name: "City" }), "x");
    expect(document.querySelector("[data-slot=autocomplete-status]")).toHaveTextContent("Loading");
    expect(screen.queryByText("No suggestions.")).not.toBeInTheDocument();
  });

  it("draws the field from Input's tokens and focus recipe", () => {
    render(<Autocomplete aria-label="City" items={["Pune"]} />);
    const input = screen.getByRole("combobox", { name: "City" });
    expect(input.className.split(/\s+/)).toEqual(
      expect.arrayContaining([
        "[--field-edge:var(--qx-component-input-border)]",
        "focus-visible:focus-ring-field",
      ]),
    );
  });

  it("ignores typing when read-only", () => {
    render(<Autocomplete aria-label="City" items={["Pune"]} readOnly defaultValue="Pune" />);
    const input = screen.getByRole("combobox", { name: "City" });
    fireEvent.change(input, { target: { value: "x" } });
    expect(input).toHaveAttribute("readonly");
  });
});
