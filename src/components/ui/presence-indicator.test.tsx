import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PresenceIndicator } from "@/components/ui/presence-indicator";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("PresenceIndicator", () => {
  it("exposes the status as an accessible label", () => {
    render(<PresenceIndicator status="online" />);
    expect(screen.getByRole("status", { name: "online" })).toBeInTheDocument();
  });

  it("accepts a custom label", () => {
    render(<PresenceIndicator status="busy" label="In a meeting" />);
    expect(screen.getByRole("status", { name: "In a meeting" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<PresenceIndicator status="away" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
