import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Progress } from "@/components/Progress/progress";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

const indicator = (c: HTMLElement) =>
  c.querySelector('[data-slot="progress-indicator"]') as HTMLElement;
const track = (c: HTMLElement) => c.querySelector('[data-slot="progress-track"]') as HTMLElement;

describe("Progress", () => {
  it("exposes progressbar value", () => {
    render(<Progress value={40} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
  });

  it("paints the track and fill from the progress component tokens", () => {
    const { container } = render(<Progress value={40} aria-label="Upload" />);
    expect(track(container)).toHaveClass("bg-(--qx-component-progress-track)");
    // The Qeet indicator role (≥3:1 on the track), not the #F26D0E action fill (2.8:1).
    expect(indicator(container)).toHaveClass(
      "[--progress-fill:var(--qx-component-progress-indicator)]",
      "bg-(--progress-fill)",
    );
    expect(indicator(container).className).not.toMatch(/(^|\s)bg-primary(\s|$)/);
  });

  it("repoints the fill to a system colour under forced colors", () => {
    const { container } = render(<Progress value={40} aria-label="Upload" />);
    expect(indicator(container)).toHaveClass(
      "forced-color-adjust-none",
      "forced-colors:[--progress-fill:Highlight]",
    );
    expect(track(container)).toHaveClass("forced-colors:border");
  });

  it("names itself from a visible label and shows the value", () => {
    render(<Progress value={64} label="Uploading audit.csv" />);
    const bar = screen.getByRole("progressbar", { name: "Uploading audit.csv" });
    expect(bar).toHaveTextContent("64%");
  });

  it("hides the value with hideValue", () => {
    render(<Progress value={64} label="Uploading" hideValue />);
    expect(screen.getByRole("progressbar")).not.toHaveTextContent("64%");
  });

  it.each([
    ["sm", "h-1"],
    ["md", "h-2"],
    ["lg", "h-3"],
  ] as const)("size=%s sizes the track (%s)", (size, cls) => {
    const { container } = render(<Progress value={10} size={size} aria-label="p" />);
    expect(track(container)).toHaveClass(cls);
    expect(container.querySelector('[data-slot="progress"]')).toHaveAttribute("data-size", size);
  });

  it("renders indeterminate as a travelling segment with a static, not-complete, reduced-motion form", () => {
    const { container } = render(<Progress value={null} aria-label="Working" />);
    const bar = screen.getByRole("progressbar", { name: "Working" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    const fill = indicator(container);
    expect(fill).toHaveAttribute("data-indeterminate");
    // Motion: a 40% segment sweeping start → end, linear (the progress motion role).
    expect(fill).toHaveClass(
      "motion-safe:data-indeterminate:w-2/5",
      "motion-safe:data-indeterminate:animate-in",
      "motion-safe:data-indeterminate:slide-in-from-start-[350%]",
      "motion-safe:data-indeterminate:ease-(--qx-motion-easing-linear)",
      "motion-safe:rtl:data-indeterminate:-translate-x-[250%]",
    );
    // Without motion: a full-width hatch — never the solid full bar that means "done".
    expect(fill.className).toContain("data-indeterminate:bg-[repeating-linear-gradient(");
    expect(fill.className).not.toContain("animate-pulse");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <>
        <Progress value={40} aria-label="Upload" />
        <Progress value={null} aria-label="Working" />
        <Progress value={70} label="Labelled" />
      </>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
