import { render, screen, waitFor } from "@testing-library/react";
import * as Recharts from "recharts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  type ChartConfig,
  ChartContainer,
  ChartDataTable,
  ChartLegend,
  ChartLegendContent,
} from "@/components/data-display/chart";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

// jsdom limitation: ChartContainer only mounts the Recharts ResponsiveContainer
// once its wrapper reports a non-zero size, and jsdom performs no layout — so
// the shipped no-op ResizeObserver never fires and the plot area stays gated
// off. We install a ResizeObserver that reports a fixed size for the duration
// of this file so the real SVG renders and can be asserted + axe-scanned.
class FiringResizeObserver {
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe(el: Element) {
    this.cb(
      [
        {
          target: el,
          contentRect: { width: 480, height: 320 } as DOMRectReadOnly,
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

let originalRO: typeof ResizeObserver;
beforeAll(() => {
  originalRO = window.ResizeObserver;
  window.ResizeObserver = FiringResizeObserver as unknown as typeof ResizeObserver;
  global.ResizeObserver = window.ResizeObserver;
});
afterAll(() => {
  window.ResizeObserver = originalRO;
  global.ResizeObserver = originalRO;
});

const config = {
  desktop: { label: "Desktop", color: "#2563eb" },
  mobile: { label: "Mobile", color: "#60a5fa" },
} satisfies ChartConfig;

const data = [
  { month: "Jan", desktop: 120, mobile: 80 },
  { month: "Feb", desktop: 90, mobile: 110 },
];

function Bars() {
  return (
    <ChartContainer config={config}>
      <Recharts.BarChart data={data}>
        <Recharts.XAxis dataKey="month" />
        <Recharts.Bar dataKey="desktop" fill="var(--color-desktop)" isAnimationActive={false} />
        <Recharts.Bar dataKey="mobile" fill="var(--color-mobile)" isAnimationActive={false} />
        <ChartLegend content={<ChartLegendContent />} />
      </Recharts.BarChart>
    </ChartContainer>
  );
}

describe("Chart", () => {
  it("renders the chart wrapper with a scoped data-chart id", () => {
    const { container } = render(<Bars />);
    const chart = container.querySelector('[data-slot="chart"]');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute("data-chart");
  });

  it("injects per-series color CSS variables via ChartStyle", () => {
    const { container } = render(<Bars />);
    const style = container.querySelector("style");
    expect(style?.innerHTML).toContain("--color-desktop");
    expect(style?.innerHTML).toContain("--color-mobile");
  });

  it("renders the Recharts SVG surface once the container is sized", async () => {
    const { container } = render(<Bars />);
    await waitFor(() => expect(container.querySelector(".recharts-surface")).toBeInTheDocument());
  });

  it("renders legend entries from the config labels", async () => {
    const { findByText } = render(<Bars />);
    expect(await findByText("Desktop")).toBeInTheDocument();
    expect(await findByText("Mobile")).toBeInTheDocument();
  });

  it("exposes an accessible title, summary, and data-table fallback", () => {
    render(
      <ChartContainer
        config={config}
        accessibleTitle="Monthly device sessions"
        accessibleDescription="Desktop and mobile sessions for January and February."
        accessibleSummary="Mobile overtakes desktop in February."
        accessibilityTable={
          <ChartDataTable
            caption="Monthly device session data"
            data={data}
            columns={[
              { key: "month", header: "Month" },
              { key: "desktop", header: "Desktop" },
              { key: "mobile", header: "Mobile" },
            ]}
          />
        }
      >
        <Recharts.BarChart data={data}>
          <Recharts.Bar dataKey="desktop" isAnimationActive={false} />
        </Recharts.BarChart>
      </ChartContainer>,
    );

    const figure = screen.getByRole("figure", { name: "Monthly device sessions" });
    expect(figure).toHaveAccessibleDescription(
      "Desktop and mobile sessions for January and February. Mobile overtakes desktop in February.",
    );
    expect(screen.getByRole("table", { name: "Monthly device session data" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "110" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Bars />);
    await waitFor(() => expect(container.querySelector(".recharts-surface")).toBeInTheDocument());
    expect(await a11y(container)).toHaveNoViolations();
  });
});
