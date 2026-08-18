import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { NumberField } from "@/components/ui/number-field";

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
});
