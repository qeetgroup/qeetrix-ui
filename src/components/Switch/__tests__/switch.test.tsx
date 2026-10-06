import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Switch } from "@/components/Switch/switch";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const hasClass = (el: Element | null, token: string) =>
  Boolean(el?.className.split(/\s+/).includes(token));

describe("Switch", () => {
  it("toggles on click", () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Notifications" onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole("switch", { name: "Notifications" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    fireEvent.click(sw);
    expect(onCheckedChange).toHaveBeenCalled();
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Switch aria-label="Notifications" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Switch label relationship", () => {
  it("is named by a <label htmlFor>, and the label toggles it", () => {
    const onCheckedChange = vi.fn();
    render(
      <>
        <label htmlFor="digest">Weekly digest</label>
        <Switch id="digest" onCheckedChange={onCheckedChange} />
      </>,
    );
    const sw = screen.getByRole("switch", { name: "Weekly digest" });
    fireEvent.click(screen.getByText("Weekly digest"));
    expect(onCheckedChange).toHaveBeenCalled();
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("can be described by help text", () => {
    render(
      <>
        <Switch aria-label="Two-factor" aria-describedby="tfa-help" />
        <p id="tfa-help">Required for administrators.</p>
      </>,
    );
    expect(screen.getByRole("switch", { name: "Two-factor" })).toHaveAccessibleDescription(
      "Required for administrators.",
    );
  });
});

describe("Switch states", () => {
  it("ignores changes when disabled or read-only", () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Switch aria-label="Sync" disabled onCheckedChange={onCheckedChange} />,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Sync" }));
    expect(screen.getByRole("switch", { name: "Sync" })).toHaveAttribute("data-disabled");
    rerender(<Switch aria-label="Sync" readOnly onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("switch", { name: "Sync" }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("forwards aria-invalid", () => {
    render(<Switch aria-label="Consent" aria-invalid />);
    expect(screen.getByRole("switch", { name: "Consent" })).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Switch styling contract", () => {
  // The Ember track and the grey track are 1.26:1 apart, so hue cannot be the signal. The thumb
  // inverts from light (off) to graphite (on), on top of moving.
  it("inverts the thumb between states rather than relying on the track hue", () => {
    const { container } = render(<Switch aria-label="Inverts" />);
    const thumb = container.querySelector("[data-slot=switch-thumb]");
    expect(hasClass(thumb, "bg-(--qx-component-switch-thumb)")).toBe(true);
    expect(hasClass(thumb, "data-checked:bg-(--qx-component-switch-thumb-checked)")).toBe(true);
  });

  it("paints the track from its component tokens", () => {
    render(<Switch aria-label="Tokens" />);
    const sw = screen.getByRole("switch", { name: "Tokens" });
    expect(hasClass(sw, "data-unchecked:bg-(--qx-component-switch-track)")).toBe(true);
    expect(hasClass(sw, "data-checked:bg-(--qx-component-switch-track-checked)")).toBe(true);
    expect(sw.className).not.toMatch(/dark:/);
  });

  it("keeps a high-contrast mapping for forced colors", () => {
    render(<Switch aria-label="HC" />);
    const sw = screen.getByRole("switch", { name: "HC" });
    expect(hasClass(sw, "forced-colors:data-checked:bg-[Highlight]")).toBe(true);
    expect(hasClass(sw, "forced-colors:border-[CanvasText]")).toBe(true);
  });

  it("uses the foundation focus ring", () => {
    render(<Switch aria-label="Focus" />);
    const sw = screen.getByRole("switch", { name: "Focus" });
    expect(hasClass(sw, "focus-visible:focus-ring")).toBe(true);
    expect(sw.className).not.toMatch(/ring-ring\/disabled/);
  });
});
