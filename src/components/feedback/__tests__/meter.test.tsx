import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Meter } from "@/components/feedback/meter";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Meter", () => {
  it("exposes meter semantics and value", () => {
    render(<Meter value={72} aria-label="Storage" hideValue />);
    const m = screen.getByRole("meter", { name: "Storage" });
    expect(m).toHaveAttribute("aria-valuenow", "72");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Meter value={72} label="Storage" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
