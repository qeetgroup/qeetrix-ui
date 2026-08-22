import { render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
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

  // ── Single mount ─────────────────────────────────────────────────────────────────────────
  // Measurement used to render a duplicate hidden copy of every item, so a caller's node was
  // mounted twice: duplicate ids in the document and two of every mount effect.

  it("puts each item in the document exactly once", () => {
    const { container } = render(
      <OverflowList
        items={[
          <span key="a" id="chip-a">
            One
          </span>,
          <span key="b" id="chip-b">
            Two
          </span>,
        ]}
      />,
    );

    expect(container.querySelectorAll("#chip-a")).toHaveLength(1);
    expect(container.querySelectorAll("#chip-b")).toHaveLength(1);
    expect(screen.getAllByText("One")).toHaveLength(1);
  });

  it("runs an item's mount effect once", () => {
    const onMount = vi.fn();
    function Probe() {
      React.useEffect(() => onMount(), []);
      return <span>probe</span>;
    }

    render(<OverflowList items={[<Probe key="probe" />]} />);

    expect(onMount).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <OverflowList items={[<span key="1">A</span>, <span key="2">B</span>]} />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
