import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ColorPicker } from "@/components/pickers/color-picker";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("ColorPicker", () => {
  it("renders a hex text input with an accessible name", () => {
    render(<ColorPicker value="#4f46e5" onChange={vi.fn()} ariaLabel="Brand colour" />);
    expect(screen.getByRole("textbox", { name: "Brand colour" })).toBeInTheDocument();
  });

  it("falls back to a default accessible name", () => {
    render(<ColorPicker value="" onChange={vi.fn()} presets={[]} />);
    expect(screen.getByRole("textbox", { name: "Hex colour" })).toBeInTheDocument();
  });

  it("reports typed values through onChange", () => {
    const onChange = vi.fn();
    render(<ColorPicker value="" onChange={onChange} ariaLabel="Colour" presets={[]} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Colour" }), {
      target: { value: "#abc" },
    });
    expect(onChange).toHaveBeenCalledWith("#abc");
  });

  it("marks an invalid hex value as invalid", () => {
    render(<ColorPicker value="not-a-hex" onChange={vi.fn()} ariaLabel="Colour" presets={[]} />);
    expect(screen.getByRole("textbox", { name: "Colour" })).toHaveAttribute("aria-invalid", "true");
  });

  it("does not flag a valid hex value as invalid", () => {
    render(<ColorPicker value="#10b981" onChange={vi.fn()} ariaLabel="Colour" presets={[]} />);
    expect(screen.getByRole("textbox", { name: "Colour" })).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("renders preset swatches with accessible names and pressed state", () => {
    render(<ColorPicker value="#3b82f6" onChange={vi.fn()} presets={["#3b82f6", "#ef4444"]} />);
    const active = screen.getByRole("button", { name: "Set colour #3b82f6" });
    const inactive = screen.getByRole("button", { name: "Set colour #ef4444" });
    expect(active).toHaveAttribute("aria-pressed", "true");
    expect(inactive).toHaveAttribute("aria-pressed", "false");
  });

  it("reports a preset selection through onChange", () => {
    const onChange = vi.fn();
    render(<ColorPicker value="" onChange={onChange} presets={["#ec4899"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Set colour #ec4899" }));
    expect(onChange).toHaveBeenCalledWith("#ec4899");
  });

  it("disables the input and presets when disabled", () => {
    render(
      <ColorPicker
        value="#4f46e5"
        onChange={vi.fn()}
        disabled
        presets={["#4f46e5"]}
        ariaLabel="Colour"
      />,
    );
    expect(screen.getByRole("textbox", { name: "Colour" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Set colour #4f46e5" })).toBeDisabled();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <ColorPicker value="#4f46e5" onChange={vi.fn()} ariaLabel="Brand colour" />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations in the empty (no colour) state", async () => {
    const { container } = render(
      <ColorPicker value="" onChange={vi.fn()} ariaLabel="Brand colour" />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
