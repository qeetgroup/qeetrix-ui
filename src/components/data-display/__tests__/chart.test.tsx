import { render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Recharts from "recharts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  type ChartConfig,
  ChartContainer,
  ChartDataTable,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
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

  it("exposes per-series colors as inline custom properties, with no generated stylesheet", () => {
    const { container } = render(<Bars />);
    const chart = container.querySelector('[data-slot="chart"]') as HTMLElement;
    expect(chart.style.getPropertyValue("--color-desktop")).toBe("#2563eb");
    expect(chart.style.getPropertyValue("--color-mobile")).toBe("#60a5fa");
    // A `color` series needs no rule, so the CSS-injection surface is not reached at all.
    expect(container.querySelector("style")).toBeNull();
  });

  it("merges a consumer style prop over the generated series variables", () => {
    const { container } = render(
      <ChartContainer config={config} style={{ marginTop: 8 }}>
        <Recharts.BarChart data={data}>
          <Recharts.Bar dataKey="desktop" isAnimationActive={false} />
        </Recharts.BarChart>
      </ChartContainer>,
    );
    const chart = container.querySelector('[data-slot="chart"]') as HTMLElement;
    expect(chart.style.marginTop).toBe("8px");
    expect(chart.style.getPropertyValue("--color-desktop")).toBe("#2563eb");
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

// SEC-001. A chart config is consumer data: keys come from datasets, colours come from tenant
// themes and API responses. These assert that an untrusted config can only ever produce fewer
// declarations — never a rule, a selector or a request Qeetrix did not author.
describe("Chart generated-CSS safety", () => {
  const themed = {
    revenue: { label: "Revenue", theme: { light: "#2563eb", dark: "#60a5fa" } },
  } satisfies ChartConfig;

  function Themed(props: { id?: string; nonce?: string }) {
    return (
      <ChartContainer config={themed} {...props}>
        <Recharts.BarChart data={data}>
          <Recharts.Bar dataKey="desktop" isAnimationActive={false} />
        </Recharts.BarChart>
      </ChartContainer>
    );
  }

  it("scopes a theme-varying series to the generated id, never the consumer id", () => {
    const { container } = render(<Themed id={'"] , body { display: none } [x="'} />);
    const css = container.querySelector("style")?.textContent ?? "";
    const scope = container.querySelector('[data-slot="chart"]')?.getAttribute("data-chart-scope");

    expect(scope).toMatch(/^chart-[a-zA-Z0-9_-]+$/);
    expect(css).toContain(`[data-chart-scope="${scope}"]`);
    expect(css).toContain("--color-revenue: #2563eb;");
    expect(css).toContain(".dark [data-chart-scope=");
    expect(css).toContain("--color-revenue: #60a5fa;");
    expect(css).not.toContain("display: none");
    expect(css).not.toContain("body");
  });

  it("forwards a CSP nonce to the generated stylesheet", () => {
    const { container } = render(<Themed nonce="test-nonce" />);
    expect(container.querySelector("style")).toHaveAttribute("nonce", "test-nonce");
  });

  it("renders nothing for a scope id that is not a CSS identifier", () => {
    const { container } = render(
      <ChartStyle id={'x"] , body { display: none } [y="'} config={themed} />,
    );
    expect(container.querySelector("style")).toBeNull();
  });

  it("drops keys and values that would escape the declaration", () => {
    const both = (light: string) => ({ theme: { light, dark: light } });
    const hostile = {
      safe: { theme: { light: "#2563eb", dark: "#60a5fa" } },
      'unsafe"] { color: red } body': both("red"),
      terminator: both("red; } body { display: none"),
      closer: both("red } body { display: none"),
      markup: both("red</style><img src=x onerror=alert(1)>"),
      comment: both("red /*"),
      escape: both("\\3c /style\\3e "),
      important: both("red !important"),
      request: both("url(https://attacker.example/beacon)"),
      atRule: both("red @import 'x'"),
    } satisfies ChartConfig;

    const { container } = render(<ChartStyle id="chart-scope" config={hostile} />);
    const css = container.querySelector("style")?.textContent ?? "";

    expect(css).toContain("--color-safe: #2563eb;");
    for (const rejected of [
      "unsafe",
      "terminator",
      "closer",
      "markup",
      "comment",
      "escape",
      "important",
      "request",
      "atRule",
    ]) {
      expect(css).not.toContain(`--color-${rejected}`);
    }
    expect(css).not.toContain("display: none");
    expect(css).not.toContain("url(");
    expect(css).not.toContain("@import");
    expect(css).not.toContain("</style");
    // Two declarations total — the `safe` series once per theme block. Every hostile entry is
    // gone from both blocks, and no empty rule is left behind.
    expect(css.match(/--color-/g)).toHaveLength(2);
  });

  it.each([
    ["#2563eb", true],
    ["#2563ebcc", true],
    ["rebeccapurple", true],
    ["currentColor", true],
    ["transparent", true],
    ["var(--chart-1)", true],
    ["var(--chart-1, oklch(0.5 0.2 260))", true],
    ["oklch(0.488 0.243 264.376)", true],
    ["rgb(37 99 235 / 80%)", true],
    ["color-mix(in oklab, var(--chart-1) 60%, white)", true],
    ["url(https://attacker.example/beacon)", false],
    ["image-set(https://attacker.example/x)", false],
    ["attr(data-x)", false],
    ["(--chart-1)", false],
    ["var(--chart-1", false],
    ["red;color:blue", false],
    ["red\u0000", false],
    ["#".repeat(200), false],
  ])("%s is accepted: %s", (color, accepted) => {
    const { container } = render(
      <ChartStyle id="chart-probe" config={{ probe: { theme: { light: color, dark: color } } }} />,
    );
    const css = container.querySelector("style")?.textContent ?? "";
    expect(css.includes("--color-probe")).toBe(accepted);
  });

  it("validates each half of a theme pair independently", () => {
    const half = {
      revenue: { theme: { light: "red; } body { display: none", dark: "#60a5fa" } },
    } satisfies ChartConfig;
    const { container } = render(<ChartStyle id="chart-half" config={half} />);
    const css = container.querySelector("style")?.textContent ?? "";

    // The dark value is well formed and survives; the light value is dropped, and dropping it
    // leaves no empty rule behind.
    expect(css).toContain(".dark [data-chart-scope=");
    expect(css).toContain("--color-revenue: #60a5fa;");
    expect(css.match(/--color-/g)).toHaveLength(1);
    expect(css).not.toContain("display: none");
  });

  it("never emits raw markup when the stylesheet is server-rendered", () => {
    const payload = "red</style><img src=x onerror=alert(1)>";
    const hostile = {
      escape: { theme: { light: payload, dark: payload } },
    } satisfies ChartConfig;

    // Server rendering is where generated CSS reaches the document as text. React additionally
    // CSS-escapes a `</style` sequence in a style child, but the allowlist means one never
    // reaches it: no declaration survives, so no element is emitted.
    const html = renderToStaticMarkup(<ChartStyle id="chart-ssr" config={hostile} />);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror");
    expect(html).toBe("");
  });
});
