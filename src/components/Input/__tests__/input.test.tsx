import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Input } from "@/components/Input/input";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("Input", () => {
  it("renders a textbox", () => {
    render(<Input aria-label="Email" />);
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
  });

  it("forwards the type attribute", () => {
    render(<Input type="email" aria-label="Email" />);
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("type", "email");
  });

  it("accepts typing (uncontrolled)", () => {
    render(<Input aria-label="Name" />);
    const input = screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Ada" } });
    expect(input.value).toBe("Ada");
  });

  it("fires onChange with the typed value", () => {
    const onChange = vi.fn();
    render(<Input aria-label="Name" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "hi" },
    });
    expect(onChange).toHaveBeenCalled();
  });

  it("respects the disabled state", () => {
    render(<Input aria-label="Name" disabled />);
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
  });

  it("exposes the invalid state via aria-invalid", () => {
    render(<Input aria-label="Name" aria-invalid="true" />);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute("aria-invalid", "true");
  });

  it("has no axe violations when associated with a label", async () => {
    const { container } = render(
      <div>
        <label htmlFor="email">Email address</label>
        <Input id="email" type="email" />
      </div>,
    );
    expect(screen.getByRole("textbox", { name: "Email address" })).toBeInTheDocument();
    expect(await a11y(container)).toHaveNoViolations();
  });
});
