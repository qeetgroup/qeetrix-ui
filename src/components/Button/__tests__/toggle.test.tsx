import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Toggle } from "@/components/Button/toggle";

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

describe("Toggle selected vocabulary", () => {
  it("marks pressed with the brand-subtle tint and a ≥3:1 border-brand hairline", () => {
    render(
      <Toggle aria-label="Bold" defaultPressed>
        B
      </Toggle>,
    );
    const t = screen.getByRole("button", { name: "Bold" });
    expect(t).toHaveAttribute("aria-pressed", "true");
    expect(t).toHaveAttribute("data-pressed");
    expect(t.className).toContain("data-pressed:bg-brand-subtle");
    expect(t.className).toContain("data-pressed:inset-ring-border-brand");
    // The label stays at full foreground; the tint is not a text colour.
    expect(t.className).toContain("data-pressed:text-foreground");
  });

  it("turns the outline variant's own edge brand instead of adding a second ring", () => {
    render(
      <Toggle aria-label="Archived" variant="outline" defaultPressed>
        Archived
      </Toggle>,
    );
    const cls = screen.getByRole("button", { name: "Archived" }).className;
    expect(cls).toContain("data-pressed:border-border-brand");
    expect(cls).toContain("data-pressed:inset-ring-0");
  });

  it("uses the foundation focus ring and keeps a forced-colours pressed cue", () => {
    render(<Toggle aria-label="Bold">B</Toggle>);
    const cls = screen.getByRole("button", { name: "Bold" }).className;
    expect(cls).toContain("focus-visible:focus-ring");
    expect(cls).not.toContain("ring-ring/disabled");
    // The library forced-colours recipe: the system selection, opted out of the text backplate.
    expect(cls).toContain("data-pressed:forced-colors-selected");
  });
});
