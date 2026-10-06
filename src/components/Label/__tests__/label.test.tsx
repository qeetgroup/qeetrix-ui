import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Label } from "@/components/Label/label";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Label", () => {
  it("associates with a control via htmlFor", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" type="email" />
      </>,
    );
    expect(screen.getByText("Email")).toHaveAttribute("for", "email");
    // the control is now named by the label
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" type="email" />
      </>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("shows an aria-hidden required indicator", () => {
    render(
      <>
        <Label htmlFor="email" required>
          Email
        </Label>
        <input id="email" type="email" required />
      </>,
    );
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
    // The name stays "Email": the asterisk is not read, the control's `required` is.
    expect(screen.getByRole("textbox", { name: "Email" })).toBeRequired();
  });

  it("shows an optional indicator, translatable, and part of the name", () => {
    const { rerender } = render(
      <>
        <Label htmlFor="nick" optional>
          Nickname
        </Label>
        <input id="nick" />
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Nickname (optional)" })).toBeInTheDocument();
    rerender(
      <>
        <Label htmlFor="nick" optional="(facultatif)">
          Surnom
        </Label>
        <input id="nick" />
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Surnom (facultatif)" })).toBeInTheDocument();
  });

  it("prefers required over optional", () => {
    render(
      <Label required optional>
        Email
      </Label>,
    );
    expect(screen.queryByText("(optional)")).toBeNull();
    expect(screen.getByText("*")).toBeInTheDocument();
  });
});

describe("Label beside a disabled Base UI control (integration pass)", () => {
  it("dims after a peer marked data-disabled, since Checkbox/Switch/Radio roots are spans", () => {
    render(<Label htmlFor="x">Notify me</Label>);
    expect(screen.getByText("Notify me")).toHaveClass(
      "peer-data-disabled:opacity-disabled",
      "peer-disabled:opacity-disabled",
    );
  });
});
