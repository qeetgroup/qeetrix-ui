import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Textarea } from "@/components/Input/textarea";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Textarea", () => {
  it("accepts input", () => {
    render(<Textarea aria-label="Bio" />);
    const ta = screen.getByRole("textbox", { name: "Bio" });
    fireEvent.change(ta, { target: { value: "hello" } });
    expect(ta).toHaveValue("hello");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Textarea aria-label="Bio" />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("resizes vertically only and caps its growth so long content scrolls", () => {
    render(<Textarea aria-label="Notes" />);
    const ta = screen.getByRole("textbox", { name: "Notes" });
    expect(ta.className).toMatch(/\bresize-y\b/);
    expect(ta.className).toMatch(/\bmax-h-96\b/);
    expect(ta.className).toMatch(/field-sizing-content/);
  });

  it("lets a consumer lift the cap", () => {
    render(<Textarea aria-label="Notes" className="max-h-[none]" />);
    const ta = screen.getByRole("textbox", { name: "Notes" });
    expect(ta.className).toContain("max-h-[none]");
    expect(ta.className).not.toMatch(/\bmax-h-96\b/);
  });

  it("forwards read-only and disabled", () => {
    render(
      <>
        <Textarea aria-label="Read" readOnly defaultValue="x" />
        <Textarea aria-label="Off" disabled />
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Read" })).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox", { name: "Off" })).toBeDisabled();
  });
});
