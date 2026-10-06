import {
  AreaChart,
  BarChart,
  type ChartConfig,
  ChartContainer,
  ChartDataTable,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  DonutChart,
  LineChart,
  RadialChart,
  Sparkline,
  Stat,
  usePrefersReducedMotion,
} from "@qeetrix/ui";
import type { ReactNode } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  Label,
  Line,
  Pie,
  PieChart,
  AreaChart as RechartsAreaChart,
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { formatInr, formatInrCompact, monthlyRevenue, paymentMethods } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/* ── Data ──────────────────────────────────────────────────────────────────────────────────── */

const revenueRows = monthlyRevenue.map((row) => ({ ...row }));
const lastSixMonths = revenueRows.slice(-7, -1);

const revenueConfig = {
  collected: { label: "Collected", color: "var(--chart-1)" },
  invoiced: { label: "Invoiced", color: "var(--chart-2)" },
} satisfies ChartConfig;

const refundsConfig = {
  refunds: { label: "Refunds", color: "var(--chart-1)" },
} satisfies ChartConfig;

const methodRows = paymentMethods.map((row) => ({ ...row }));
const methodTotal = methodRows.reduce((sum, row) => sum + row.volume, 0);
const methodConfig = {
  volume: { label: "Volume" },
  upi: { label: "UPI", color: "var(--chart-1)" },
  cards: { label: "Cards", color: "var(--chart-2)" },
  netbanking: { label: "Net banking", color: "var(--chart-3)" },
  nach: { label: "NACH mandates", color: "var(--chart-4)" },
} satisfies ChartConfig;

/** Qeet Logs: 5xx responses as a share of requests, hourly, 06:00–17:00 IST. */
const errorRateRows = [
  { hour: "06:00", id: 0.12, pay: 0.31, notify: 0.4 },
  { hour: "07:00", id: 0.14, pay: 0.28, notify: 0.38 },
  { hour: "08:00", id: 0.18, pay: 0.35, notify: 0.52 },
  { hour: "09:00", id: 0.22, pay: 0.41, notify: 0.61 },
  { hour: "10:00", id: 0.26, pay: 1.42, notify: 0.74 },
  { hour: "11:00", id: 0.21, pay: 1.18, notify: 1.36 },
  { hour: "12:00", id: 0.19, pay: 0.62, notify: 0.92 },
  { hour: "13:00", id: 0.17, pay: 0.44, notify: 0.58 },
  { hour: "14:00", id: 0.2, pay: 0.39, notify: 0.47 },
  { hour: "15:00", id: 0.23, pay: 0.36, notify: 0.45 },
  { hour: "16:00", id: 0.18, pay: 0.33, notify: 0.41 },
  { hour: "17:00", id: 0.16, pay: 0.3, notify: 0.39 },
];

const errorRateConfig = {
  id: { label: "qeet-id-server", color: "var(--chart-1)" },
  pay: { label: "qeet-pay-api", color: "var(--chart-2)" },
  notify: { label: "notify-worker", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** Qeet ID sign-ins by second factor, per ISO week. */
const signInRows = [
  { week: "W35", passkey: 18400, totp: 9800, sms: 5200 },
  { week: "W36", passkey: 20100, totp: 9300, sms: 4700 },
  { week: "W37", passkey: 22900, totp: 8600, sms: 4100 },
  { week: "W38", passkey: 25300, totp: 7700, sms: 3500 },
  { week: "W39", passkey: 28800, totp: 6900, sms: 2900 },
  { week: "W40", passkey: 31200, totp: 6100, sms: 2400 },
];

const signInConfig = {
  passkey: { label: "Passkey", color: "var(--chart-1)" },
  totp: { label: "Authenticator app", color: "var(--chart-2)" },
  sms: { label: "SMS OTP", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** Collections in ₹ lakh, so the presets' compact Y axis reads cleanly. */
const lakhRows = revenueRows.map((row) => ({
  month: row.month,
  collected: Math.round(row.collected / 10_000) / 10,
  invoiced: Math.round(row.invoiced / 10_000) / 10,
}));

const lakhConfig = {
  collected: { label: "Collected (₹ lakh)", color: "var(--chart-1)" },
  invoiced: { label: "Invoiced (₹ lakh)", color: "var(--chart-2)" },
} satisfies ChartConfig;

const p95Rows = [
  { hour: "09:00", authorize: 182, token: 96, userinfo: 41 },
  { hour: "10:00", authorize: 214, token: 118, userinfo: 44 },
  { hour: "11:00", authorize: 238, token: 131, userinfo: 52 },
  { hour: "12:00", authorize: 201, token: 104, userinfo: 47 },
  { hour: "13:00", authorize: 176, token: 92, userinfo: 39 },
  { hour: "14:00", authorize: 169, token: 88, userinfo: 38 },
];

const p95Config = {
  authorize: { label: "/authorize", color: "var(--chart-1)" },
  token: { label: "/token", color: "var(--chart-2)" },
  userinfo: { label: "/userinfo", color: "var(--chart-3)" },
} satisfies ChartConfig;

const productSessionRows = [
  { product: "pay", sessions: 1240 },
  { product: "people", sessions: 860 },
  { product: "logs", sessions: 410 },
];

const productSessionConfig = {
  sessions: { label: "Active sessions" },
  pay: { label: "Qeet Pay console", color: "var(--chart-1)" },
  people: { label: "Qeet People", color: "var(--chart-2)" },
  logs: { label: "Qeet Logs", color: "var(--chart-3)" },
} satisfies ChartConfig;

/* ── Pieces ────────────────────────────────────────────────────────────────────────────────── */

/** A tooltip row with a formatted value — what `ChartTooltipContent`'s `formatter` returns. */
function TooltipRow({ color, label, value }: { color?: string; label: ReactNode; value: string }) {
  return (
    <>
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-xs"
        style={{ backgroundColor: color }}
      />
      <span className="flex flex-1 items-center justify-between gap-4 leading-none">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium text-foreground tabular-nums">{value}</span>
      </span>
    </>
  );
}

function seriesLabel(config: ChartConfig, name: string | number): ReactNode {
  return config[String(name)]?.label ?? name;
}

/** A plain legend for presets without one, so identity never rests on colour alone. */
function SeriesKey({ config, keys }: { config: ChartConfig; keys: readonly string[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
      {keys.map((key) => (
        <li key={key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 rounded-xs"
            style={{ backgroundColor: config[key]?.color }}
          />
          {config[key]?.label}
        </li>
      ))}
    </ul>
  );
}

function CollectionsAreaChart() {
  // Recharts animates in JavaScript, so honour reduced motion explicitly (as the presets do).
  const animate = !usePrefersReducedMotion();
  return (
    <ChartContainer
      config={revenueConfig}
      className="aspect-auto h-72 w-full"
      accessibleTitle="Qeet Pay monthly collections"
      accessibleDescription="Amount invoiced and collected each month, in rupees, November 2025 to October 2026."
      accessibleSummary="Collections grew from ₹38.4 lakh in November to ₹67.4 lakh in September; October is month-to-date."
      accessibilityTable={
        <ChartDataTable
          caption="Monthly collections (₹)"
          data={revenueRows}
          getRowKey={(row) => row.month}
          columns={[
            { key: "month", header: "Month" },
            { key: "invoiced", header: "Invoiced", format: (value) => formatInr(Number(value)) },
            { key: "collected", header: "Collected", format: (value) => formatInr(Number(value)) },
          ]}
        />
      }
    >
      <RechartsAreaChart data={revenueRows} margin={{ top: 8, left: 4, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={56}
          tickFormatter={(value: number) => formatInrCompact(value)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
                <TooltipRow
                  color={item.color}
                  label={seriesLabel(revenueConfig, name)}
                  value={formatInr(Number(value))}
                />
              )}
            />
          }
        />
        <Area
          dataKey="collected"
          type="monotone"
          stroke="var(--color-collected)"
          fill="var(--color-collected)"
          fillOpacity={0.2}
          strokeWidth={2}
          isAnimationActive={animate}
        />
        <Area
          dataKey="invoiced"
          type="monotone"
          stroke="var(--color-invoiced)"
          fill="var(--color-invoiced)"
          fillOpacity={0.08}
          strokeWidth={2}
          isAnimationActive={animate}
        />
        <ChartLegend itemSorter={null} content={<ChartLegendContent />} />
      </RechartsAreaChart>
    </ChartContainer>
  );
}

function PaymentMethodDonut() {
  const animate = !usePrefersReducedMotion();
  return (
    <ChartContainer
      config={methodConfig}
      className="mx-auto aspect-square w-72"
      accessibleTitle="Payment volume by method"
      accessibleDescription="Share of Qeet Pay volume by payment method over the last 30 days."
      accessibleSummary="UPI carries 46% of volume; NACH mandates are the smallest share at 15%."
      accessibilityTable={
        <ChartDataTable
          caption="Payment volume by method, last 30 days"
          data={methodRows}
          getRowKey={(row) => row.key}
          columns={[
            { key: "method", header: "Method" },
            { key: "share", header: "Share", format: (value) => `${value}%` },
            { key: "volume", header: "Volume", format: (value) => formatInr(Number(value)) },
          ]}
        />
      }
    >
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="key"
              hideLabel
              formatter={(value, _name, item) => (
                <TooltipRow
                  color={item.payload?.fill}
                  label={seriesLabel(methodConfig, String(item.payload?.key))}
                  value={formatInr(Number(value))}
                />
              )}
            />
          }
        />
        <Pie
          data={methodRows}
          dataKey="volume"
          nameKey="key"
          innerRadius="62%"
          paddingAngle={2}
          cornerRadius={4}
          isAnimationActive={animate}
        >
          {methodRows.map((row) => (
            <Cell key={row.key} fill={`var(--color-${row.key})`} />
          ))}
          <Label
            content={({ viewBox }) =>
              viewBox && "cx" in viewBox ? (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan
                    x={viewBox.cx}
                    dy="-0.4em"
                    className="fill-foreground font-heading text-xl font-semibold"
                  >
                    {formatInrCompact(methodTotal)}
                  </tspan>
                  <tspan x={viewBox.cx} dy="1.6em" className="fill-muted-foreground text-xs">
                    last 30 days
                  </tspan>
                </text>
              ) : null
            }
          />
        </Pie>
        <ChartLegend
          itemSorter={null}
          content={<ChartLegendContent nameKey="key" className="flex-wrap" />}
        />
      </PieChart>
    </ChartContainer>
  );
}

function ErrorRateLineChart() {
  const animate = !usePrefersReducedMotion();
  return (
    <ChartContainer
      config={errorRateConfig}
      className="aspect-auto h-72 w-full"
      accessibleTitle="5xx error rate by service"
      accessibleDescription="Server errors as a percentage of requests, hourly from 06:00 to 17:00 IST today, against a 1% SLO."
      accessibleSummary="qeet-pay-api breached the 1% SLO at 10:00 and 11:00 during the UPI timeout incident; notify-worker breached it at 11:00."
      accessibilityTable={
        <ChartDataTable
          caption="Hourly 5xx error rate (%)"
          data={errorRateRows}
          getRowKey={(row) => row.hour}
          columns={[
            { key: "hour", header: "Hour (IST)" },
            { key: "id", header: "qeet-id-server", format: (value) => `${value}%` },
            { key: "pay", header: "qeet-pay-api", format: (value) => `${value}%` },
            { key: "notify", header: "notify-worker", format: (value) => `${value}%` },
          ]}
        />
      }
    >
      <RechartsLineChart data={errorRateRows} margin={{ top: 16, left: 4, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={44}
          tickFormatter={(value: number) => `${value}%`}
        />
        <ReferenceLine y={1} strokeDasharray="4 4">
          <Label
            value="SLO 1%"
            position="insideTopRight"
            className="fill-muted-foreground text-xs"
          />
        </ReferenceLine>
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={(value, name, item) => (
                <TooltipRow
                  color={item.color}
                  label={seriesLabel(errorRateConfig, name)}
                  value={`${value}%`}
                />
              )}
            />
          }
        />
        {(["id", "pay", "notify"] as const).map((key) => (
          <Line
            key={key}
            dataKey={key}
            type="monotone"
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={false}
            isAnimationActive={animate}
            activeDot={{ r: 4 }}
          />
        ))}
        <ChartLegend itemSorter={null} content={<ChartLegendContent />} />
      </RechartsLineChart>
    </ChartContainer>
  );
}

function RefundsBarChart() {
  const animate = !usePrefersReducedMotion();
  return (
    <ChartContainer
      config={refundsConfig}
      className="aspect-auto h-56 w-full"
      accessibleTitle="Refunds issued per month"
      accessibleDescription="Total refunds issued through Qeet Pay, in rupees, April to September 2026."
      accessibleSummary="Refunds peaked at ₹83,000 in September."
      accessibilityTableVisibility="visible"
      accessibilityTable={
        <ChartDataTable
          caption="Refunds issued (₹)"
          data={lastSixMonths}
          getRowKey={(row) => row.month}
          columns={[
            { key: "month", header: "Month" },
            { key: "refunds", header: "Refunds", format: (value) => formatInr(Number(value)) },
          ]}
        />
      }
    >
      <RechartsBarChart data={lastSixMonths} margin={{ top: 8, left: 4, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={56}
          tickFormatter={(value: number) => formatInrCompact(value)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
                <TooltipRow
                  color={item.color}
                  label={seriesLabel(refundsConfig, name)}
                  value={formatInr(Number(value))}
                />
              )}
            />
          }
        />
        <Bar
          dataKey="refunds"
          fill="var(--color-refunds)"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
          isAnimationActive={animate}
        />
      </RechartsBarChart>
    </ChartContainer>
  );
}

/* ── Playground: ChartContainer ────────────────────────────────────────────────────────────── */

const chartControls = {
  kind: select(["area", "bar", "line"] as const, "bar", "Recharts chart"),
  showGrid: bool(true, "Grid"),
  showYAxis: bool(true, "Y axis"),
  showTooltip: bool(true, "Tooltip"),
  showLegend: bool(true, "Legend"),
  accessibleTitle: text("Invoiced vs collected, last six months", "accessibleTitle"),
  accessibilityTableVisibility: select(
    ["screen-reader", "visible"] as const,
    "screen-reader",
    "Data table",
  ),
};

function ContainerPlayground({
  kind,
  showGrid,
  showYAxis,
  showTooltip,
  showLegend,
  accessibleTitle,
  accessibilityTableVisibility,
}: {
  kind: "area" | "bar" | "line";
  showGrid: boolean;
  showYAxis: boolean;
  showTooltip: boolean;
  showLegend: boolean;
  accessibleTitle: string;
  accessibilityTableVisibility: "screen-reader" | "visible";
}) {
  const animate = !usePrefersReducedMotion();
  const keys = ["collected", "invoiced"] as const;
  const frame = [
    showGrid && <CartesianGrid key="grid" vertical={false} />,
    <XAxis key="x" dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />,
    showYAxis && (
      <YAxis
        key="y"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        width={56}
        tickFormatter={(value: number) => formatInrCompact(value)}
      />
    ),
    showTooltip && (
      <ChartTooltip
        key="tooltip"
        content={
          <ChartTooltipContent
            formatter={(value, name, item) => (
              <TooltipRow
                color={item.color}
                label={seriesLabel(revenueConfig, name)}
                value={formatInr(Number(value))}
              />
            )}
          />
        }
      />
    ),
    showLegend && <ChartLegend key="legend" itemSorter={null} content={<ChartLegendContent />} />,
  ];
  const margin = { top: 8, left: 4, right: 12 };
  return (
    <ChartContainer
      config={revenueConfig}
      className="aspect-auto h-72 w-full"
      accessibleTitle={accessibleTitle}
      accessibleDescription="Monthly amounts invoiced and collected by Qeet Pay, April to September 2026, in rupees."
      accessibilityTableVisibility={accessibilityTableVisibility}
      accessibilityTable={
        <ChartDataTable
          caption="Invoiced vs collected (₹)"
          data={lastSixMonths}
          getRowKey={(row) => row.month}
          columns={[
            { key: "month", header: "Month" },
            { key: "invoiced", header: "Invoiced", format: (value) => formatInr(Number(value)) },
            { key: "collected", header: "Collected", format: (value) => formatInr(Number(value)) },
          ]}
        />
      }
    >
      {kind === "area" ? (
        <RechartsAreaChart data={lastSixMonths} margin={margin}>
          {frame}
          {keys.map((key) => (
            <Area
              key={key}
              dataKey={key}
              type="monotone"
              stroke={`var(--color-${key})`}
              fill={`var(--color-${key})`}
              fillOpacity={0.15}
              strokeWidth={2}
              isAnimationActive={animate}
            />
          ))}
        </RechartsAreaChart>
      ) : kind === "line" ? (
        <RechartsLineChart data={lastSixMonths} margin={margin}>
          {frame}
          {keys.map((key) => (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={false}
              isAnimationActive={animate}
            />
          ))}
        </RechartsLineChart>
      ) : (
        <RechartsBarChart data={lastSixMonths} margin={margin}>
          {frame}
          {keys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              fill={`var(--color-${key})`}
              radius={[4, 4, 0, 0]}
              isAnimationActive={animate}
            />
          ))}
        </RechartsBarChart>
      )}
    </ChartContainer>
  );
}

/* ── Playground: presets ───────────────────────────────────────────────────────────────────── */

const presetControls = {
  preset: select(
    ["AreaChart", "BarChart", "LineChart", "DonutChart", "Sparkline"] as const,
    "BarChart",
  ),
  sparklineTone: select(
    ["default", "positive", "negative", "neutral"] as const,
    "default",
    "Sparkline tone",
  ),
  stacked: bool(true, "Stacked (area/bar) · area (Sparkline)"),
  showLegend: bool(true, "Legend"),
  showGrid: bool(true, "Grid"),
  showYAxis: bool(true, "Y axis"),
  showTooltip: bool(true, "Tooltip"),
};

const methodShareRows = methodRows.map(({ key, share }) => ({ key, share }));

export const examples: FamilyExamples = {
  chart: {
    layout: "wide",
    minHeight: 1500,
    demos: [
      {
        name: "Monthly collections — area",
        description:
          "`ChartContainer` around a Recharts area chart: series colours from `--chart-1`/`--chart-2`, a ₹-formatted tooltip, a legend, and a screen-reader data table.",
        render: () => <CollectionsAreaChart />,
      },
      {
        name: "Payment method split — donut",
        description:
          "A Recharts pie with a centre label; slice colours come from the config through `var(--color-<key>)`.",
        render: () => <PaymentMethodDonut />,
      },
      {
        name: "Error rate with SLO reference — line",
        description:
          "Qeet Logs 5xx rate per service against a dashed 1% SLO line; the axis, grid and reference strokes pick up the chart tokens.",
        render: () => <ErrorRateLineChart />,
      },
      {
        name: "Visible data table — bar",
        description:
          '`accessibilityTableVisibility="visible"` exposes the data table under the plot for everyone.',
        render: () => <RefundsBarChart />,
      },
    ],
    playground: definePlayground({
      controls: chartControls,
      render: (v) => (
        <div className="w-full">
          <ContainerPlayground {...v} />
        </div>
      ),
      code: (v) => {
        const tag = { area: "AreaChart", bar: "BarChart", line: "LineChart" }[v.kind];
        const series = { area: "Area", bar: "Bar", line: "Line" }[v.kind];
        const seriesProps = (key: string) =>
          v.kind === "bar"
            ? { dataKey: key, fill: `var(--color-${key})`, radius: 4 }
            : v.kind === "area"
              ? { dataKey: key, stroke: `var(--color-${key})`, fill: `var(--color-${key})` }
              : { dataKey: key, stroke: `var(--color-${key})`, dot: expr("false") };
        return jsx(
          "ChartContainer",
          {
            config: expr("chartConfig"),
            className: "aspect-auto h-72 w-full",
            accessibleTitle: v.accessibleTitle,
            accessibilityTable: expr("<ChartDataTable caption=… data={data} columns={columns} />"),
            accessibilityTableVisibility:
              v.accessibilityTableVisibility === "screen-reader"
                ? undefined
                : v.accessibilityTableVisibility,
          },
          jsx(tag, { data: expr("data") }, [
            v.showGrid ? "<CartesianGrid vertical={false} />" : "",
            '<XAxis dataKey="month" tickLine={false} axisLine={false} />',
            v.showYAxis ? "<YAxis tickFormatter={formatInrCompact} />" : "",
            v.showTooltip ? "<ChartTooltip content={<ChartTooltipContent />} />" : "",
            jsx(series, seriesProps("collected")),
            jsx(series, seriesProps("invoiced")),
            v.showLegend
              ? "<ChartLegend itemSorter={null} content={<ChartLegendContent />} />"
              : "",
          ]),
        );
      },
    }),
  },

  "chart-presets": {
    layout: "wide",
    minHeight: 1900,
    demos: [
      {
        name: "AreaChart — collections trend",
        description: "One series with the Y axis on; values are in ₹ lakh.",
        render: () => (
          <AreaChart
            data={lakhRows}
            config={lakhConfig}
            categoryKey="month"
            dataKeys={["collected"]}
            showYAxis
            className="aspect-auto h-64 w-full"
            accessibleTitle="Monthly collections"
            accessibleDescription="Qeet Pay collections in ₹ lakh, November 2025 to October 2026."
            accessibleSummary="Collections rose steadily to ₹67.4 lakh in September; October is month-to-date."
          />
        ),
      },
      {
        name: "BarChart — stacked, with legend",
        description: "Qeet ID sign-ins by second factor per week: passkeys overtaking OTPs.",
        render: () => (
          <BarChart
            data={signInRows}
            config={signInConfig}
            categoryKey="week"
            dataKeys={["passkey", "totp", "sms"]}
            stacked
            showLegend
            showYAxis
            className="aspect-auto h-64 w-full"
            accessibleTitle="Weekly sign-ins by second factor"
            accessibleDescription="Successful Qeet ID sign-ins for Acme India per ISO week, W35–W40 2026, split by second factor."
            accessibleSummary="Passkey sign-ins rose from 18,400 to 31,200 a week while SMS OTP fell from 5,200 to 2,400."
          />
        ),
      },
      {
        name: "LineChart — p95 latency",
        render: () => (
          <LineChart
            data={p95Rows}
            config={p95Config}
            categoryKey="hour"
            dataKeys={["authorize", "token", "userinfo"]}
            showLegend
            showYAxis
            className="aspect-auto h-64 w-full"
            accessibleTitle="p95 latency by OIDC endpoint"
            accessibleDescription="95th-percentile response time in milliseconds for id.qeet.in endpoints, hourly 09:00–14:00 IST."
            accessibleSummary="/authorize peaked at 238 ms at 11:00; /userinfo stayed under 55 ms."
          />
        ),
      },
      {
        name: "DonutChart and RadialChart",
        description:
          "Fixed-size square presets; a RadialChart has no built-in legend, so one is rendered beside it.",
        render: () => (
          <div className="grid gap-8 sm:grid-cols-2">
            <DonutChart
              data={methodShareRows}
              config={methodConfig}
              dataKey="share"
              nameKey="key"
              showLegend
              className="mx-auto w-64"
              accessibleTitle="Payment method share"
              accessibleDescription="Share of Qeet Pay volume by method, last 30 days, in percent."
              accessibleSummary="UPI leads with 46%."
            />
            <div className="flex flex-col items-center gap-2">
              <RadialChart
                data={productSessionRows}
                config={productSessionConfig}
                dataKey="sessions"
                nameKey="product"
                className="mx-auto w-64"
                accessibleTitle="Active sessions by product"
                accessibleDescription="Qeet ID sessions currently active, per relying-party product."
                accessibleSummary="Qeet Pay console holds 1,240 of 2,510 active sessions."
              />
              <SeriesKey config={productSessionConfig} keys={["pay", "people", "logs"]} />
            </div>
          </div>
        ),
      },
      {
        name: "Sparkline — tones, in Stat tiles",
        description:
          "A Sparkline is the footer (`children`) of a Stat. `tone` says what the trend means — passkey sign-ins rising is good, SMS OTP falling is good too, a rising error rate is bad — and `label` names it for screen readers.",
        render: () => (
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Passkey sign-ins (W40)" value="31,200" delta="+8.3%" trend="up">
              <Sparkline
                data={signInRows.map((row) => row.passkey)}
                type="area"
                tone="positive"
                height={36}
                label="Passkey sign-ins, W35 to W40, rising"
              />
            </Stat>
            <Stat
              label="SMS OTP sign-ins (W40)"
              value="2,400"
              delta="−17%"
              trend="down"
              tone="positive"
            >
              <Sparkline
                data={signInRows.map((row) => row.sms)}
                tone="neutral"
                height={36}
                label="SMS OTP sign-ins, W35 to W40, falling"
              />
            </Stat>
            <Stat
              label="qeet-pay-api 5xx rate (11:00)"
              value="1.18%"
              delta="+0.8 pts"
              trend="up"
              tone="negative"
            >
              <Sparkline
                data={errorRateRows.map((row) => row.pay)}
                tone="negative"
                height={36}
                label="qeet-pay-api error rate today, spiked at 10:00"
              />
            </Stat>
          </div>
        ),
      },
      {
        name: "Sparkline — default and inline",
        description:
          "Without a tone it takes categorical series 1, like a one-series chart; it also fits inline beside a figure. It renders a block, so do not put it inside a `<p>`.",
        render: () => (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Collections, Nov–Sep
            <Sparkline
              data={revenueRows.slice(0, 11).map((row) => row.collected)}
              width={120}
              height={24}
              label="Monthly collections, November to September, rising"
            />
            <span className="font-medium text-foreground">{formatInrCompact(6740000)}</span>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: presetControls,
      render: (v) => {
        const cartesian = {
          data: signInRows,
          config: signInConfig,
          categoryKey: "week",
          dataKeys: ["passkey", "totp", "sms"],
          showLegend: v.showLegend,
          showGrid: v.showGrid,
          showYAxis: v.showYAxis,
          showTooltip: v.showTooltip,
          className: "aspect-auto h-64 w-full",
          accessibleTitle: "Weekly sign-ins by second factor",
        };
        return (
          <div className="w-full">
            {v.preset === "AreaChart" ? (
              <AreaChart {...cartesian} stacked={v.stacked} />
            ) : v.preset === "BarChart" ? (
              <BarChart {...cartesian} stacked={v.stacked} />
            ) : v.preset === "LineChart" ? (
              <LineChart {...cartesian} />
            ) : v.preset === "Sparkline" ? (
              <Sparkline
                data={signInRows.map((row) => row.passkey)}
                type={v.stacked ? "area" : "line"}
                tone={v.sparklineTone}
                height={48}
                className="max-w-xs"
                label="Passkey sign-ins, W35 to W40, rising"
              />
            ) : (
              <DonutChart
                data={methodShareRows}
                config={methodConfig}
                dataKey="share"
                nameKey="key"
                showLegend={v.showLegend}
                showTooltip={v.showTooltip}
                className="mx-auto w-64"
                accessibleTitle="Payment method share"
              />
            )}
          </div>
        );
      },
      code: (v) =>
        v.preset === "Sparkline"
          ? jsx("Sparkline", {
              data: expr("weeklyPasskeySignIns"),
              type: v.stacked ? "area" : undefined,
              tone: v.sparklineTone === "default" ? undefined : v.sparklineTone,
              height: 48,
              label: "Passkey sign-ins, W35 to W40, rising",
            })
          : v.preset === "DonutChart"
            ? jsx("DonutChart", {
                data: expr("methodShare"),
                config: expr("chartConfig"),
                dataKey: "share",
                nameKey: "key",
                showLegend: v.showLegend,
                showTooltip: v.showTooltip ? undefined : expr("false"),
                className: "mx-auto w-64",
                accessibleTitle: "Payment method share",
              })
            : jsx(v.preset, {
                data: expr("signIns"),
                config: expr("chartConfig"),
                categoryKey: "week",
                dataKeys: expr('["passkey", "totp", "sms"]'),
                stacked: v.preset !== "LineChart" && v.stacked,
                showLegend: v.showLegend,
                showGrid: v.showGrid ? undefined : expr("false"),
                showYAxis: v.showYAxis,
                showTooltip: v.showTooltip ? undefined : expr("false"),
                className: "aspect-auto h-64 w-full",
                accessibleTitle: "Weekly sign-ins by second factor",
              }),
    }),
  },
};
