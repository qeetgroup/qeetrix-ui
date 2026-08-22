import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import type { ChartConfig } from "@/components/data-display/chart";
import {
  AreaChart,
  BarChart,
  DonutChart,
  LineChart,
  RadialChart,
  Sparkline,
} from "@/components/data-display/chart-presets";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

// See chart.test.tsx: presets render through ChartContainer / ResponsiveContainer,
// which stay gated off in jsdom until a ResizeObserver reports a non-zero size.
// Install a firing observer so the actual SVG plot renders.
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

const cartesianConfig = {
  visitors: { label: "Visitors", color: "#2563eb" },
} satisfies ChartConfig;
const cartesianData = [
  { month: "Jan", visitors: 120 },
  { month: "Feb", visitors: 90 },
  { month: "Mar", visitors: 150 },
];

const sliceConfig = {
  chrome: { label: "Chrome", color: "#2563eb" },
  safari: { label: "Safari", color: "#60a5fa" },
} satisfies ChartConfig;
const sliceData = [
  { browser: "chrome", count: 275 },
  { browser: "safari", count: 200 },
];

const surface = (c: Element) => c.querySelector(".recharts-surface");

describe("Chart presets", () => {
  it("renders a BarChart preset as an SVG surface", async () => {
    const { container } = render(
      <BarChart
        data={cartesianData}
        config={cartesianConfig}
        categoryKey="month"
        dataKeys={["visitors"]}
      />,
    );
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument();
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
  });

  it("renders an AreaChart preset", async () => {
    const { container } = render(
      <AreaChart
        data={cartesianData}
        config={cartesianConfig}
        categoryKey="month"
        dataKeys={["visitors"]}
      />,
    );
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
  });

  it("renders a LineChart preset", async () => {
    const { container } = render(
      <LineChart
        data={cartesianData}
        config={cartesianConfig}
        categoryKey="month"
        dataKeys={["visitors"]}
      />,
    );
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
  });

  it("renders a DonutChart preset", async () => {
    const { container } = render(
      <DonutChart data={sliceData} config={sliceConfig} dataKey="count" nameKey="browser" />,
    );
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument();
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
  });

  it("renders a RadialChart preset", async () => {
    const { container } = render(
      <RadialChart data={sliceData} config={sliceConfig} dataKey="count" nameKey="browser" />,
    );
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
  });

  it("renders a Sparkline wrapper", async () => {
    const { container } = render(<Sparkline data={[1, 4, 2, 8, 5, 3]} />);
    expect(container.querySelector('[data-slot="sparkline"]')).toBeInTheDocument();
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
  });

  it("has no axe violations (BarChart)", async () => {
    const { container } = render(
      <BarChart
        data={cartesianData}
        config={cartesianConfig}
        categoryKey="month"
        dataKeys={["visitors"]}
      />,
    );
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations (DonutChart)", async () => {
    const { container } = render(
      <DonutChart
        data={sliceData}
        config={sliceConfig}
        dataKey="count"
        nameKey="browser"
        showLegend
      />,
    );
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    expect(await a11y(container)).toHaveNoViolations();
  });
});
