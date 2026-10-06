import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/Input/field";
import { NumberField } from "@/components/NumberField/number-field";
import { DirectionProvider } from "@/providers/direction-provider";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("NumberField", () => {
  it("renders decrement and increment buttons", () => {
    render(<NumberField defaultValue={5} aria-label="Quantity" />);
    expect(screen.getByRole("button", { name: "Decrease" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase" })).toBeInTheDocument();
  });

  it("renders a text input (Base UI uses type=text with aria-roledescription)", () => {
    render(<NumberField defaultValue={5} aria-label="Quantity" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders a group with the provided label", () => {
    const { container } = render(<NumberField defaultValue={5} aria-label="Score" />);
    expect(container.querySelector('[data-slot="number-field"]')).toBeInTheDocument();
  });

  it("disables both buttons when disabled=true", () => {
    render(<NumberField defaultValue={5} disabled aria-label="Qty" />);
    expect(screen.getByRole("button", { name: "Decrease" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();
  });

  it("renders the number-field slot", () => {
    const { container } = render(
      <NumberField defaultValue={3} min={0} max={100} aria-label="Count" />,
    );
    expect(container.querySelector('[data-slot="number-field"]')).toBeInTheDocument();
  });

  it("has no axe violations when the input is labelled", async () => {
    // Base UI puts `aria-label` on the wrapper, so the textbox itself needs a
    // real associated label. Root forwards `id` to the input, so a <label
    // htmlFor> gives the control an accessible name.
    const { container } = render(
      <div>
        <label htmlFor="qty">Quantity</label>
        <NumberField id="qty" defaultValue={5} min={0} max={10} />
      </div>,
    );
    expect(screen.getByRole("textbox", { name: "Quantity" })).toBeInTheDocument();
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("takes its label, description and error from a Field", () => {
    render(
      <Field>
        <FieldLabel>Seats</FieldLabel>
        <NumberField defaultValue={3} min={1} />
        <FieldDescription>One per person.</FieldDescription>
        <FieldError>At least one seat.</FieldError>
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Seats" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/One per person\..*At least one seat\./);
  });

  it("follows the DirectionProvider's locale for formatting", () => {
    render(
      <DirectionProvider locale="de-DE">
        <NumberField defaultValue={1234.5} aria-label="Betrag" />
      </DirectionProvider>,
    );
    expect(screen.getByRole("textbox", { name: "Betrag" })).toHaveValue("1.234,5");
  });

  it("steps with the keyboard and stops at the bounds", () => {
    render(<NumberField defaultValue={9} min={0} max={10} aria-label="Score" />);
    const input = screen.getByRole("textbox", { name: "Score" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveValue("10");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveValue("10");
    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();
    fireEvent.keyDown(input, { key: "Home" });
    expect(input).toHaveValue("0");
  });

  it("accepts negative values and decimals", () => {
    render(<NumberField defaultValue={-1.5} step={0.5} aria-label="Offset" />);
    const input = screen.getByRole("textbox", { name: "Offset" });
    expect(input).toHaveValue("-1.5");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveValue("-2");
  });

  it("keeps the stepper buttons out of the tab order", () => {
    render(<NumberField defaultValue={1} aria-label="Qty" />);
    expect(screen.getByRole("button", { name: "Increase" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("button", { name: "Decrease" })).toHaveAttribute("tabindex", "-1");
  });
});

describe("NumberField stepper at a limit (integration pass)", () => {
  it("dims and disarms a stepper Base UI marks data-disabled, not just a natively disabled one", () => {
    // Base UI steppers are focusableWhenDisabled: at min/max they get aria-disabled and
    // data-disabled, never the `disabled` attribute, so `disabled:` utilities alone were dead.
    render(<NumberField aria-label="Seats" defaultValue={10} max={10} />);
    const increment = document.querySelector('[data-slot="number-field-increment"]') as HTMLElement;
    expect(increment).toHaveAttribute("data-disabled");
    expect(increment).toHaveClass(
      "data-disabled:pointer-events-none",
      "data-disabled:text-(--qx-color-text-disabled)",
    );
  });
});
