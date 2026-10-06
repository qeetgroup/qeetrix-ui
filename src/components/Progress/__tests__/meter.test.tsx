import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Meter } from "@/components/Progress/meter";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Meter", () => {
  it("exposes meter semantics and value", () => {
    render(<Meter value={72} aria-label="Storage" hideValue />);
    const m = screen.getByRole("meter", { name: "Storage" });
    expect(m).toHaveAttribute("aria-valuenow", "72");
  });

  it.each([
    ["default", "[--meter-fill:var(--qx-component-progress-indicator)]"],
    ["success", "[--meter-fill:var(--success)]"],
    ["warning", "[--meter-fill:var(--warning)]"],
    ["danger", "[--meter-fill:var(--destructive)]"],
  ] as const)("intent=%s sets the fill", (intent, cls) => {
    const { container } = render(<Meter value={50} intent={intent} label="Quota" />);
    const fill = container.querySelector('[data-slot="meter-indicator"]');
    expect(fill).toHaveClass(cls, "bg-(--meter-fill)", "forced-colors:[--meter-fill:Highlight]");
    expect(container.querySelector('[data-slot="meter"]')).toHaveAttribute("data-intent", intent);
  });

  it("shares the Progress track and its sizes", () => {
    const { container } = render(<Meter value={50} size="sm" label="Seats" />);
    expect(container.querySelector('[data-slot="meter-track"]')).toHaveClass(
      "h-1",
      "bg-(--qx-component-progress-track)",
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(<Meter value={72} label="Storage" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
