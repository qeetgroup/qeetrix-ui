import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { PasswordInput } from "@/components/PasswordInput/password-input";

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

  it("keeps focus on the toggle and is operable from the keyboard", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" />);
    await user.tab();
    await user.tab();
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveFocus();
  });

  it("never submits the form it sits in", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <PasswordInput aria-label="Password" />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps one stable element for password managers, and does not spellcheck", () => {
    render(<PasswordInput aria-label="Password" name="password" autoComplete="current-password" />);
    const input = screen.getByLabelText("Password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toBe(input);
    expect(input).toHaveAttribute("name", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");
    expect(input).toHaveAttribute("spellcheck", "false");
    expect(input).toHaveAttribute("autocorrect", "off");
    expect(input).toHaveAttribute("autocapitalize", "none");
  });

  it("re-masks a revealed password when its form submits", () => {
    render(
      <form aria-label="sign in" onSubmit={(e) => e.preventDefault()}>
        <PasswordInput aria-label="Password" />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    fireEvent.submit(screen.getByRole("form", { name: "sign in" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("disables the toggle with the field", () => {
    render(<PasswordInput aria-label="Password" disabled />);
    expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
  });
});
