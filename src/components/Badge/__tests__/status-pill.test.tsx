import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { StatusPill } from "@/components/Badge/status-pill";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("StatusPill", () => {
  it("resolves a known status to its label", () => {
    render(<StatusPill status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("title-cases an unknown status", () => {
    render(<StatusPill status="throttled" />);
    expect(screen.getByText("Throttled")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<StatusPill status="expired" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
