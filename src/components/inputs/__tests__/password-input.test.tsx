import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PasswordInput } from "@/components/inputs/password-input";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("PasswordInput", () => {
  it("renders as a password input by default", () => {
    render(<PasswordInput aria-label="Password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("clicking toggle reveals text input", () => {
    render(<PasswordInput aria-label="Password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
  });

  it("toggle button has accessible aria-label switching between Show/Hide password", () => {
    render(<PasswordInput aria-label="Password" />);
    const toggle = screen.getByRole("button", { name: "Show password" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Hide password" })).toBeTruthy();
  });

  it("has no axe violations", async () => {
    const { container } = render(<PasswordInput aria-label="Password" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
