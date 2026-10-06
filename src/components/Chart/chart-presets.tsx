"use client";

import * as React from "react";
import * as Recharts from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  type ChartContainerProps,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/Chart/chart";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/direction-provider";

/*
 * Recharts animates with JavaScript (react-smooth), so the global
 * `prefers-reduced-motion` CSS in `styles/index.css` cannot reach it: it can
 * collapse a CSS duration but not a requestAnimationFrame loop. Every preset
 * therefore feeds the preference into `isAnimationActive`, which makes Recharts
 * paint the final geometry on the first frame instead of growing/drawing into it.
 * `Sparkline` never animates at all.
 *
 * Mark specs, shared by every preset so a dashboard reads as one system:
 *   - bars are at most 24px thick with a 4px rounded data end, square at the baseline
 *   - lines are 2px with round joins; the hovered point is an 8px dot in a 2px surface ring
 *   - area fills are a wash of the series hue, never a saturated block
 *   - grid and axes are recessive hairlines (ChartContainer colours them)
 *   - two or more series get a legend by default, so identity never rests on colour alone
 */

/** Bar thickness cap. Bars never fill their band; the leftover is air between categories. */
const BAR_MAX_SIZE = 24;
/** Data-end rounding for a single (unstacked) bar: rounded at the value, square at the axis. */
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
/** The hovered point on a line or area: 8px, ringed in the surface colour so it reads over lines. */
const ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: "var(--card)" } as const;

/** The value formatter every preset uses unless given one: the locale's number format. */
function useValueFormatter(valueFormatter?: (value: number) => string) {
  const locale = useLocale();
  return React.useMemo(() => {
    if (valueFormatter) return valueFormatter;
    const format = new Intl.NumberFormat(locale);
    return (value: number) => format.format(value);
  }, [locale, valueFormatter]);
}

type Datum = Record<string, unknown>;

type ChartAccessibilityProps = Pick<
  ChartContainerProps,
  | "accessibleTitle"
  | "accessibleDescription"
  | "accessibleSummary"
  | "accessibilityTable"
  | "accessibilityTableVisibility"
>;

interface CartesianChartProps extends ChartAccessibilityProps {
  data: Datum[];
  config: ChartConfig;
  /** Key in each datum for the category (x) axis. */
  categoryKey: string;
  /**
   * One or more series keys to plot. Colours come from `config[key].color`, or — when the config
   * names none — from the categorical palette in config order.
   */
  dataKeys: string[];
  className?: string;
  stacked?: boolean;
  /** Show the legend. Defaults to on for two or more series and off for one. */
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  /**
   * Formats values in the tooltip and on the value axis (e.g. compact currency). Defaults to the
   * locale's number format.
   */
  valueFormatter?: (value: number) => string;
}

const cartesianDefaults = {
  showGrid: true,
  showTooltip: true,
  showXAxis: true,
  showYAxis: false,
  stacked: false,
};

/** The shared cartesian chrome: grid, axes, tooltip and legend around a preset's series. */
function CartesianFrame({
  showXAxis,
  showYAxis,
  showGrid,
  showTooltip,
  showLegend,
  categoryKey,
  formatValue,
  cursor,
  children,
}: Pick<
  CartesianChartProps,
  "showXAxis" | "showYAxis" | "showGrid" | "showTooltip" | "showLegend" | "categoryKey"
> & {
  formatValue: (value: number) => string;
  /** Line and area charts track the pointer with a crosshair; bars light their band. */
  cursor: "crosshair" | "band";
  children: React.ReactNode;
}) {
  return (
    <>
      {showGrid && <Recharts.CartesianGrid vertical={false} />}
      {showXAxis && (
        <Recharts.XAxis
          dataKey={categoryKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
        />
      )}
      {showYAxis && (
        <Recharts.YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width="auto"
          tickFormatter={(value: number) => formatValue(value)}
        />
      )}
      {showTooltip && (
        <ChartTooltip
          cursor={cursor === "crosshair" ? { strokeWidth: 1 } : true}
          content={
            <ChartTooltipContent
              indicator={cursor === "crosshair" ? "line" : "dot"}
              valueFormatter={(value) => (typeof value === "number" ? formatValue(value) : value)}
            />
          }
        />
      )}
      {children}
      {/* Series order, not alphabetical: the legend reads in the order the data is drawn. */}
      {showLegend && <ChartLegend itemSorter={null} content={<ChartLegendContent />} />}
    </>
  );
}

/** Area chart preset. Pass `dataKeys` for one or more series; `stacked` to stack them. */
function AreaChart({
  data,
  config,
  categoryKey,
  dataKeys,
  className,
  stacked = cartesianDefaults.stacked,
  showLegend = dataKeys.length > 1,
  showGrid = cartesianDefaults.showGrid,
  showTooltip = cartesianDefaults.showTooltip,
  showXAxis = cartesianDefaults.showXAxis,
  showYAxis = cartesianDefaults.showYAxis,
  valueFormatter,
  accessibleTitle,
  accessibleDescription,
  accessibleSummary,
  accessibilityTable,
  accessibilityTableVisibility,
}: CartesianChartProps) {
  const animate = !usePrefersReducedMotion();
  const formatValue = useValueFormatter(valueFormatter);
  return (
    <ChartContainer
      config={config}
      className={className}
      {...{
        accessibleTitle,
        accessibleDescription,
        accessibleSummary,
        accessibilityTable,
        accessibilityTableVisibility,
      }}
    >
      <Recharts.AreaChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianFrame
          {...{ showGrid, showTooltip, showXAxis, showYAxis, showLegend, categoryKey }}
          formatValue={formatValue}
          cursor="crosshair"
        >
          {dataKeys.map((key) => (
            <Recharts.Area
              key={key}
              dataKey={key}
              type="natural"
              stackId={stacked ? "a" : undefined}
              stroke={`var(--color-${key})`}
              fill={`var(--color-${key})`}
              // A wash, not a block. Stacked bands do not overlap, so they can carry a little more;
              // overlapping washes compound, so several unstacked series each carry less.
              fillOpacity={stacked ? 0.24 : dataKeys.length > 1 ? 0.08 : 0.12}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              activeDot={ACTIVE_DOT}
              isAnimationActive={animate}
            />
          ))}
        </CartesianFrame>
      </Recharts.AreaChart>
    </ChartContainer>
  );
}

/** Bar chart preset. */
function BarChart({
  data,
  config,
  categoryKey,
  dataKeys,
  className,
  stacked = cartesianDefaults.stacked,
  showLegend = dataKeys.length > 1,
  showGrid = cartesianDefaults.showGrid,
  showTooltip = cartesianDefaults.showTooltip,
  showXAxis = cartesianDefaults.showXAxis,
  showYAxis = cartesianDefaults.showYAxis,
  valueFormatter,
  accessibleTitle,
  accessibleDescription,
  accessibleSummary,
  accessibilityTable,
  accessibilityTableVisibility,
}: CartesianChartProps) {
  const animate = !usePrefersReducedMotion();
  const formatValue = useValueFormatter(valueFormatter);
  return (
    <ChartContainer
      config={config}
      className={className}
      {...{
        accessibleTitle,
        accessibleDescription,
        accessibleSummary,
        accessibilityTable,
        accessibilityTableVisibility,
      }}
    >
      <Recharts.BarChart data={data} margin={{ left: 12, right: 12 }} barGap={2}>
        <CartesianFrame
          {...{ showGrid, showTooltip, showXAxis, showYAxis, showLegend, categoryKey }}
          formatValue={formatValue}
          cursor="band"
        >
          {dataKeys.map((key, index) => (
            <Recharts.Bar
              key={key}
              dataKey={key}
              stackId={stacked ? "a" : undefined}
              fill={`var(--color-${key})`}
              maxBarSize={BAR_MAX_SIZE}
              // Stacked: only the top segment has a data end to round.
              radius={!stacked || index === dataKeys.length - 1 ? BAR_RADIUS : 0}
              isAnimationActive={animate}
            />
          ))}
        </CartesianFrame>
      </Recharts.BarChart>
    </ChartContainer>
  );
}

/** Line chart preset. */
function LineChart({
  data,
  config,
  categoryKey,
  dataKeys,
  className,
  showLegend = dataKeys.length > 1,
  showGrid = cartesianDefaults.showGrid,
  showTooltip = cartesianDefaults.showTooltip,
  showXAxis = cartesianDefaults.showXAxis,
  showYAxis = cartesianDefaults.showYAxis,
  valueFormatter,
  accessibleTitle,
  accessibleDescription,
  accessibleSummary,
  accessibilityTable,
  accessibilityTableVisibility,
}: Omit<CartesianChartProps, "stacked">) {
  const animate = !usePrefersReducedMotion();
  const formatValue = useValueFormatter(valueFormatter);
  return (
    <ChartContainer
      config={config}
      className={className}
      {...{
        accessibleTitle,
        accessibleDescription,
        accessibleSummary,
        accessibilityTable,
        accessibilityTableVisibility,
      }}
    >
      <Recharts.LineChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianFrame
          {...{ showGrid, showTooltip, showXAxis, showYAxis, showLegend, categoryKey }}
          formatValue={formatValue}
          cursor="crosshair"
        >
          {dataKeys.map((key) => (
            <Recharts.Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              activeDot={ACTIVE_DOT}
              isAnimationActive={animate}
            />
          ))}
        </CartesianFrame>
      </Recharts.LineChart>
    </ChartContainer>
  );
}

interface RadialOrPieProps extends ChartAccessibilityProps {
  data: Datum[];
  config: ChartConfig;
  /** Key holding the numeric value of each slice/bar. */
  dataKey: string;
  /** Key holding the category name (maps to `config` + `--color-<name>`). */
  nameKey: string;
  className?: string;
  /** Show the legend. Donut: defaults to on for two or more slices. Radial: off. */
  showLegend?: boolean;
  showTooltip?: boolean;
  /** Formats values in the tooltip. Defaults to the locale's number format. */
  valueFormatter?: (value: number) => string;
}

/**
 * Donut (or pie) chart preset. Set `innerRadius={0}` for a solid pie. The default hole is half
 * the available radius, so the ring keeps its proportion at any size — a fixed 60px hole left a
 * hairline ring in a small card.
 */
function DonutChart({
  data,
  config,
  dataKey,
  nameKey,
  className,
  innerRadius = "50%",
  showLegend = data.length > 1,
  showTooltip = true,
  valueFormatter,
  accessibleTitle,
  accessibleDescription,
  accessibleSummary,
  accessibilityTable,
  accessibilityTableVisibility,
}: RadialOrPieProps & {
  /** Hole radius: pixels, or a percentage of the available radius. Default `"50%"`. */
  innerRadius?: number | string;
}) {
  const animate = !usePrefersReducedMotion();
  const formatValue = useValueFormatter(valueFormatter);
  return (
    <ChartContainer
      config={config}
      className={cn("aspect-square", className)}
      {...{
        accessibleTitle,
        accessibleDescription,
        accessibleSummary,
        accessibilityTable,
        accessibilityTableVisibility,
      }}
    >
      <Recharts.PieChart>
        {showTooltip && (
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey={nameKey}
                hideLabel
                valueFormatter={(value) => (typeof value === "number" ? formatValue(value) : value)}
              />
            }
          />
        )}
        <Recharts.Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          innerRadius={innerRadius}
          // A 2px gap in the surface colour separates slices; a drawn border would add ink
          // that is not data.
          stroke="var(--card)"
          strokeWidth={2}
          isAnimationActive={animate}
        >
          {data.map((entry) => (
            <Recharts.Cell
              key={String(entry[nameKey])}
              fill={`var(--color-${String(entry[nameKey])})`}
            />
          ))}
        </Recharts.Pie>
        {showLegend && (
          <ChartLegend itemSorter={null} content={<ChartLegendContent nameKey={nameKey} />} />
        )}
      </Recharts.PieChart>
    </ChartContainer>
  );
}

/** Radial bar chart preset (gauge-style). */
function RadialChart({
  data,
  config,
  dataKey,
  nameKey,
  className,
  showLegend = false,
  showTooltip = true,
  valueFormatter,
  accessibleTitle,
  accessibleDescription,
  accessibleSummary,
  accessibilityTable,
  accessibilityTableVisibility,
}: RadialOrPieProps) {
  const animate = !usePrefersReducedMotion();
  const formatValue = useValueFormatter(valueFormatter);
  return (
    <ChartContainer
      config={config}
      className={cn("aspect-square", className)}
      {...{
        accessibleTitle,
        accessibleDescription,
        accessibleSummary,
        accessibilityTable,
        accessibilityTableVisibility,
      }}
    >
      <Recharts.RadialBarChart
        data={data}
        innerRadius={30}
        outerRadius={110}
        startAngle={90}
        endAngle={-270}
      >
        {showTooltip && (
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey={nameKey}
                hideLabel
                valueFormatter={(value) => (typeof value === "number" ? formatValue(value) : value)}
              />
            }
          />
        )}
        <Recharts.RadialBar
          dataKey={dataKey}
          background
          cornerRadius={6}
          isAnimationActive={animate}
        >
          {data.map((entry) => (
            <Recharts.Cell
              key={String(entry[nameKey])}
              fill={`var(--color-${String(entry[nameKey])})`}
            />
          ))}
        </Recharts.RadialBar>
        {showLegend && (
          <ChartLegend itemSorter={null} content={<ChartLegendContent nameKey={nameKey} />} />
        )}
      </Recharts.RadialBarChart>
    </ChartContainer>
  );
}

type SparklineTone = "default" | "positive" | "negative" | "neutral";

/*
 * Sparkline colour. The default is categorical series 1, the colour a one-series chart gets, so a
 * sparkline and the full chart behind it agree. It used to be `text-primary`: the line is a
 * graphic, so the 3:1 non-text minimum was technically met, but it made every trend on a dashboard
 * Qeet orange — the colour of action and selection, not of data. `tone` maps a trend's meaning
 * onto the chart status roles instead (positive/negative are real status hues: negative is red).
 */
const SPARKLINE_TONE: Record<SparklineTone, string> = {
  default: "text-chart-1",
  positive: "text-chart-positive",
  negative: "text-chart-negative",
  neutral: "text-muted-foreground",
};

interface SparklineProps {
  /** A series of numbers, or objects with a `value`. */
  data: number[] | { value: number }[];
  type?: "line" | "area";
  /**
   * Stroke/fill colour. Defaults to `currentColor`, which `tone` (or a `text-*` class) sets.
   */
  color?: string;
  /**
   * What the trend means: `positive` and `negative` use the chart status roles, `neutral` the
   * muted ink. Ignored when `color` is set. Defaults to categorical series 1.
   */
  tone?: SparklineTone;
  /**
   * Accessible name, e.g. "Revenue, last 12 weeks, rising". Given one, the sparkline is an image
   * with that name; without one it is decorative and hidden from assistive technology — the
   * figure it accompanies should already say what the trend says.
   */
  label?: string;
  width?: number | string;
  height?: number;
  className?: string;
}

/**
 * Tiny inline trend chart for KPI tiles (`Stat`) and table cells. No axes, grid, or tooltip —
 * just the line. Colour follows `currentColor` by default, so set it with `tone` or a `text-*`
 * class on the wrapper.
 */
function Sparkline({
  data,
  type = "line",
  color = "currentColor",
  tone = "default",
  label,
  width = "100%",
  height = 32,
  className,
}: SparklineProps) {
  const series = React.useMemo(
    () => data.map((d, i) => ({ i, value: typeof d === "number" ? d : d.value })),
    [data],
  );
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: role and aria-label are applied together, only when a label exists.
    <div
      data-slot="sparkline"
      data-tone={tone}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-block", SPARKLINE_TONE[tone], className)}
      style={{ width, height }}
    >
      <Recharts.ResponsiveContainer width="100%" height="100%">
        {type === "area" ? (
          // No accessibility layer: with no tooltip there is nothing for its arrow keys to move
          // through, and it would add an unnamed tab stop to every tile.
          <Recharts.AreaChart
            data={series}
            margin={{ top: 2, bottom: 2, left: 0, right: 0 }}
            accessibilityLayer={false}
          >
            {/* A trend is read against its own range: the default domain starts at zero and
                flattens every line that does not. */}
            <Recharts.YAxis hide domain={["dataMin", "dataMax"]} />
            <Recharts.Area
              dataKey="value"
              type="monotone"
              stroke={color}
              fill={color}
              fillOpacity={0.12}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              isAnimationActive={false}
            />
          </Recharts.AreaChart>
        ) : (
          <Recharts.LineChart
            data={series}
            margin={{ top: 2, bottom: 2, left: 0, right: 0 }}
            accessibilityLayer={false}
          >
            <Recharts.YAxis hide domain={["dataMin", "dataMax"]} />
            <Recharts.Line
              dataKey="value"
              type="monotone"
              stroke={color}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              isAnimationActive={false}
            />
          </Recharts.LineChart>
        )}
      </Recharts.ResponsiveContainer>
    </div>
  );
}

export type {
  CartesianChartProps,
  ChartAccessibilityProps,
  RadialOrPieProps,
  SparklineProps,
  SparklineTone,
};
export { AreaChart, BarChart, DonutChart, LineChart, RadialChart, Sparkline };
