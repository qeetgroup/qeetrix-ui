import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Badge } from "@/components/data-display/badge";
import { OverflowList } from "@/components/layout/overflow-list";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("OverflowList", () => {
  it("renders its items when width is unconstrained", () => {
    render(
      <OverflowList
        items={[
          <Badge key="1">One</Badge>,
          <Badge key="2">Two</Badge>,
          <Badge key="3">Three</Badge>,
        ]}
      />,
    );
    expect(screen.getAllByText("One").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Three").length).toBeGreaterThan(0);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <OverflowList items={[<span key="1">A</span>, <span key="2">B</span>]} />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
