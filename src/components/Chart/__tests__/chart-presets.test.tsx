import { render, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import type { ChartConfig } from "@/components/Chart/chart";
import {
  AreaChart,
  BarChart,
  DonutChart,
  LineChart,
  RadialChart,
  Sparkline,
} from "@/components/Chart/chart-presets";

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

let originalMatchMedia: typeof window.matchMedia;
afterEach(() => {
  if (originalMatchMedia) window.matchMedia = originalMatchMedia;
});

let originalRO: typeof ResizeObserver;
beforeAll(() => {
  originalMatchMedia = window.matchMedia;
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

/**
 * Recharts reads `prefers-reduced-motion` only through the component tree, and
 * jsdom's stub always answers `false`, so each branch has to install its own
 * `matchMedia`.
 */
function setPrefersReducedMotion(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

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

describe("Chart presets and reduced motion", () => {
  // These assert the *rendered geometry on the first frame*, which is the only
  // observable difference between an animated and a non-animated Recharts series.
  // An animated series starts from nothing (empty rectangle group, zero-width
  // reveal clip, dash-array draw-on) and fills in over subsequent frames.
  const cartesian = {
    data: cartesianData,
    config: cartesianConfig,
    categoryKey: "month",
    dataKeys: ["visitors"],
  };

  it("BarChart paints its bars immediately under reduced motion", async () => {
    setPrefersReducedMotion(true);
    const { container } = render(<BarChart {...cartesian} />);
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    expect(container.querySelectorAll(".recharts-bar path.recharts-rectangle").length).toBe(
      cartesianData.length,
    );
  });

  it("BarChart animates its bars in from nothing when motion is allowed", async () => {
    setPrefersReducedMotion(false);
    const { container } = render(<BarChart {...cartesian} />);
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    // Baseline for the assertion above: with animation on, no bar geometry yet.
    expect(container.querySelectorAll(".recharts-bar path.recharts-rectangle").length).toBe(0);
  });

  it("LineChart skips the draw-on dash animation under reduced motion", async () => {
    setPrefersReducedMotion(true);
    const { container } = render(<LineChart {...cartesian} />);
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    const curve = container.querySelector(".recharts-line-curve");
    expect(curve).not.toBeNull();
    expect(curve).not.toHaveAttribute("stroke-dasharray");
  });

  it("LineChart uses the dash animation when motion is allowed", async () => {
    setPrefersReducedMotion(false);
    const { container } = render(<LineChart {...cartesian} />);
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    expect(container.querySelector(".recharts-line-curve")).toHaveAttribute("stroke-dasharray");
  });

  it("AreaChart skips the reveal clip under reduced motion", async () => {
    setPrefersReducedMotion(true);
    const { container } = render(<AreaChart {...cartesian} />);
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    expect(container.querySelector(".recharts-area clipPath")).toBeNull();
    expect(container.querySelector(".recharts-area-area")).toBeInTheDocument();
  });

  it("AreaChart reveals through a zero-width clip when motion is allowed", async () => {
    setPrefersReducedMotion(false);
    const { container } = render(<AreaChart {...cartesian} />);
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    expect(container.querySelector(".recharts-area clipPath rect")).toHaveAttribute("width", "0");
  });

  it("DonutChart paints its sectors immediately under reduced motion", async () => {
    setPrefersReducedMotion(true);
    const { container } = render(
      <DonutChart data={sliceData} config={sliceConfig} dataKey="count" nameKey="browser" />,
    );
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    expect(container.querySelectorAll(".recharts-pie-sector").length).toBe(sliceData.length);
  });

  it("DonutChart grows its sectors when motion is allowed", async () => {
    setPrefersReducedMotion(false);
    const { container } = render(
      <DonutChart data={sliceData} config={sliceConfig} dataKey="count" nameKey="browser" />,
    );
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    expect(container.querySelectorAll(".recharts-pie-sector").length).toBe(0);
  });

  it("RadialChart paints its value sectors immediately under reduced motion", async () => {
    setPrefersReducedMotion(true);
    const { container } = render(
      <RadialChart data={sliceData} config={sliceConfig} dataKey="count" nameKey="browser" />,
    );
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    // Background sectors always render; the value sectors are the animated ones.
    expect(container.querySelectorAll("path.recharts-sector").length).toBe(sliceData.length * 2);
  });

  it("RadialChart animates its value sectors when motion is allowed", async () => {
    setPrefersReducedMotion(false);
    const { container } = render(
      <RadialChart data={sliceData} config={sliceConfig} dataKey="count" nameKey="browser" />,
    );
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    expect(container.querySelectorAll("path.recharts-sector").length).toBe(sliceData.length);
  });

  it("Sparkline stays static in both branches", async () => {
    for (const reduced of [true, false]) {
      setPrefersReducedMotion(reduced);
      const { container, unmount } = render(<Sparkline data={[1, 4, 2, 8]} />);
      await waitFor(() => expect(surface(container)).toBeInTheDocument());
      expect(container.querySelector(".recharts-line-curve")).not.toHaveAttribute(
        "stroke-dasharray",
      );
      unmount();
    }
  });
});

describe("Chart preset defaults", () => {
  const twoSeries = {
    data: [
      { month: "Jan", a: 1, b: 2 },
      { month: "Feb", a: 3, b: 1 },
    ],
    config: { a: { label: "Alpha" }, b: { label: "Beta" } } satisfies ChartConfig,
    categoryKey: "month",
  };

  it("shows a legend for two or more series, so identity is not colour alone", async () => {
    const { container, findByText } = render(<LineChart {...twoSeries} dataKeys={["a", "b"]} />);
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    expect(await findByText("Alpha")).toBeInTheDocument();
    expect(await findByText("Beta")).toBeInTheDocument();
  });

  it("shows no legend box for a single series", async () => {
    const { container } = render(<BarChart {...twoSeries} dataKeys={["a"]} />);
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    expect(container.querySelector('[data-slot="chart-legend"]')).toBeNull();
  });

  it("keeps an explicit showLegend={false}", async () => {
    const { container } = render(
      <AreaChart {...twoSeries} dataKeys={["a", "b"]} showLegend={false} />,
    );
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    expect(container.querySelector('[data-slot="chart-legend"]')).toBeNull();
  });

  it("caps bar thickness and rounds only the data end", async () => {
    setPrefersReducedMotion(true);
    const { container } = render(<BarChart {...twoSeries} dataKeys={["a"]} />);
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    const bar = container.querySelector(".recharts-bar path.recharts-rectangle");
    expect(Number(bar?.getAttribute("width"))).toBeLessThanOrEqual(24);
  });
});

describe("Sparkline", () => {
  it("defaults to categorical series 1, not the brand primary", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} />);
    const spark = container.querySelector('[data-slot="sparkline"]');
    expect(spark).toHaveClass("text-chart-1");
    expect(spark).not.toHaveClass("text-primary");
  });

  it.each([
    ["positive", "text-chart-positive"],
    ["negative", "text-chart-negative"],
    ["neutral", "text-muted-foreground"],
  ] as const)("maps tone %s onto %s", (tone, className) => {
    const { container } = render(<Sparkline data={[1, 2, 3]} tone={tone} />);
    expect(container.querySelector('[data-slot="sparkline"]')).toHaveClass(className);
  });

  it("is decorative without a label and an image with one", () => {
    const { container, rerender } = render(<Sparkline data={[1, 2, 3]} />);
    const spark = () => container.querySelector('[data-slot="sparkline"]');
    expect(spark()).toHaveAttribute("aria-hidden", "true");
    rerender(<Sparkline data={[1, 2, 3]} label="Revenue, last 12 weeks, rising" />);
    expect(spark()).toHaveAttribute("role", "img");
    expect(spark()).toHaveAccessibleName("Revenue, last 12 weeks, rising");
  });

  it("adds no tab stop to the tile it sits in", async () => {
    const { container } = render(<Sparkline data={[1, 4, 2]} />);
    await waitFor(() => expect(surface(container)).toBeInTheDocument());
    // Recharts' z-index layers carry tabindex="-1", which is focusable by script only.
    expect(container.querySelector('[tabindex]:not([tabindex="-1"])')).toBeNull();
  });
});
