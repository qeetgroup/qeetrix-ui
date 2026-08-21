import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Toggle } from "@/components/actions/toggle";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Toggle", () => {
  it("toggles its pressed state", () => {
    render(<Toggle aria-label="Bold">B</Toggle>);
    const t = screen.getByRole("button", { name: "Bold" });
    expect(t).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(t);
    expect(t).toHaveAttribute("aria-pressed", "true");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Toggle aria-label="Bold">B</Toggle>);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
