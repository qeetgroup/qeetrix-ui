import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { ColorPicker } from "@/components/ColorPicker/color-picker";
import { Field, FieldError, FieldLabel } from "@/components/Input/field";

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

describe("ColorPicker controlled and uncontrolled", () => {
  it("owns the value when only defaultValue is given", () => {
    render(<ColorPicker defaultValue="#10b981" presets={[]} ariaLabel="Colour" />);
    const input = screen.getByRole("textbox", { name: "Colour" });
    expect(input).toHaveValue("#10b981");
    fireEvent.change(input, { target: { value: "#ef4444" } });
    expect(input).toHaveValue("#ef4444");
  });

  it("keeps the controlled value authoritative when the parent ignores onChange", () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#10b981" onChange={onChange} presets={[]} ariaLabel="Colour" />);
    const input = screen.getByRole("textbox", { name: "Colour" });
    fireEvent.change(input, { target: { value: "#ef4444" } });
    expect(onChange).toHaveBeenCalledExactlyOnceWith("#ef4444");
    expect(input).toHaveValue("#10b981");
  });

  it("reports a preset selection while uncontrolled and takes the value", () => {
    const onChange = vi.fn();
    render(<ColorPicker defaultValue="" onChange={onChange} presets={["#ec4899"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Set colour #ec4899" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith("#ec4899");
    expect(screen.getByRole("textbox", { name: "Hex colour" })).toHaveValue("#ec4899");
  });

  it("works with no value, no defaultValue and no onChange at all", () => {
    render(<ColorPicker presets={[]} ariaLabel="Colour" />);
    const input = screen.getByRole("textbox", { name: "Colour" });
    expect(input).toHaveValue("");
    fireEvent.change(input, { target: { value: "#abc" } });
    expect(input).toHaveValue("#abc");
  });
});

describe("ColorPicker form participation", () => {
  const data = () => new FormData(screen.getByRole("form", { name: "brand" }) as HTMLFormElement);

  it("submits the hex from the visible input, with no hidden duplicate", () => {
    const { container } = render(
      <form aria-label="brand">
        <ColorPicker name="accent" defaultValue="#10b981" presets={[]} ariaLabel="Colour" />
      </form>,
    );
    expect(data().get("accent")).toBe("#10b981");
    expect(data().getAll("accent")).toHaveLength(1);
    expect(container.querySelector("[data-slot=field-hidden-input]")).toBeNull();
  });

  it("does not submit the native colour input alongside the hex", () => {
    const { container } = render(
      <form aria-label="brand">
        <ColorPicker name="accent" defaultValue="#10b981" presets={[]} ariaLabel="Colour" />
      </form>,
    );
    expect(container.querySelector('input[type="color"]')).not.toHaveAttribute("name");
  });

  it("takes the hex input's label from a Field, and the label points at it", () => {
    render(
      <Field>
        <FieldLabel>Accent colour</FieldLabel>
        <ColorPicker name="accent" presets={[]} />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Accent colour" });
    // The hex input is a labelable element, so `htmlFor` resolves for real: clicking the label
    // focuses the control, which is not true of the composites built from non-native elements.
    expect(screen.getByText("Accent colour")).toHaveAttribute("for", input.id);
  });

  it("lets a Field's error mark the hex input invalid even when the hex parses", () => {
    render(
      <Field>
        <FieldLabel>Accent colour</FieldLabel>
        <ColorPicker defaultValue="#10b981" presets={[]} />
        <FieldError>That colour fails contrast.</FieldError>
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: "Accent colour" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
