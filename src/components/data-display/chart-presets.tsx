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
} from "@/components/data-display/chart";
import { cn } from "@/lib/utils";

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
  /** One or more series keys to plot; colours come from `config[key].color`. */
  dataKeys: string[];
  className?: string;
  stacked?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
}

const cartesianDefaults = {
  showGrid: true,
  showTooltip: true,
  showXAxis: true,
  showYAxis: false,
  showLegend: false,
  stacked: false,
};

function CartesianFrame({
  showXAxis,
  showYAxis,
  showGrid,
  showTooltip,
  showLegend,
  categoryKey,
  children,
}: Pick<
  CartesianChartProps,
  "showXAxis" | "showYAxis" | "showGrid" | "showTooltip" | "showLegend" | "categoryKey"
> & { children: React.ReactNode }) {
  return (
    <>
      {showGrid && <Recharts.CartesianGrid vertical={false} />}
      {showXAxis && (
        <Recharts.XAxis dataKey={categoryKey} tickLine={false} axisLine={false} tickMargin={8} />
      )}
      {showYAxis && <Recharts.YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />}
      {showTooltip && (
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
      )}
      {children}
      {showLegend && <ChartLegend content={<ChartLegendContent />} />}
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
  showLegend = cartesianDefaults.showLegend,
  showGrid = cartesianDefaults.showGrid,
  showTooltip = cartesianDefaults.showTooltip,
  showXAxis = cartesianDefaults.showXAxis,
  showYAxis = cartesianDefaults.showYAxis,
  accessibleTitle,
  accessibleDescription,
  accessibleSummary,
  accessibilityTable,
  accessibilityTableVisibility,
}: CartesianChartProps) {
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
        >
          {dataKeys.map((key) => (
            <Recharts.Area
              key={key}
              dataKey={key}
              type="natural"
              stackId={stacked ? "a" : undefined}
              stroke={`var(--color-${key})`}
              fill={`var(--color-${key})`}
              fillOpacity={0.2}
              strokeWidth={2}
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
  showLegend = cartesianDefaults.showLegend,
  showGrid = cartesianDefaults.showGrid,
  showTooltip = cartesianDefaults.showTooltip,
  showXAxis = cartesianDefaults.showXAxis,
  showYAxis = cartesianDefaults.showYAxis,
  accessibleTitle,
  accessibleDescription,
  accessibleSummary,
  accessibilityTable,
  accessibilityTableVisibility,
}: CartesianChartProps) {
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
      <Recharts.BarChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianFrame
          {...{ showGrid, showTooltip, showXAxis, showYAxis, showLegend, categoryKey }}
        >
          {dataKeys.map((key) => (
            <Recharts.Bar
              key={key}
              dataKey={key}
              stackId={stacked ? "a" : undefined}
              fill={`var(--color-${key})`}
              radius={stacked ? 0 : 4}
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
  showLegend = cartesianDefaults.showLegend,
  showGrid = cartesianDefaults.showGrid,
  showTooltip = cartesianDefaults.showTooltip,
  showXAxis = cartesianDefaults.showXAxis,
  showYAxis = cartesianDefaults.showYAxis,
  accessibleTitle,
  accessibleDescription,
  accessibleSummary,
  accessibilityTable,
  accessibilityTableVisibility,
}: Omit<CartesianChartProps, "stacked">) {
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
        >
          {dataKeys.map((key) => (
            <Recharts.Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={false}
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
  showLegend?: boolean;
  showTooltip?: boolean;
}

/** Donut (or pie) chart preset. Set `innerRadius={0}` for a solid pie. */
function DonutChart({
  data,
  config,
  dataKey,
  nameKey,
  className,
  innerRadius = 60,
  showLegend = false,
  showTooltip = true,
  accessibleTitle,
  accessibleDescription,
  accessibleSummary,
  accessibilityTable,
  accessibilityTableVisibility,
}: RadialOrPieProps & { innerRadius?: number }) {
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
          <ChartTooltip content={<ChartTooltipContent nameKey={nameKey} hideLabel />} />
        )}
        <Recharts.Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          innerRadius={innerRadius}
          strokeWidth={2}
        >
          {data.map((entry) => (
            <Recharts.Cell
              key={String(entry[nameKey])}
              fill={`var(--color-${String(entry[nameKey])})`}
            />
          ))}
        </Recharts.Pie>
        {showLegend && <ChartLegend content={<ChartLegendContent nameKey={nameKey} />} />}
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
  showTooltip = true,
  accessibleTitle,
  accessibleDescription,
  accessibleSummary,
  accessibilityTable,
  accessibilityTableVisibility,
}: RadialOrPieProps) {
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
          <ChartTooltip content={<ChartTooltipContent nameKey={nameKey} hideLabel />} />
        )}
        <Recharts.RadialBar dataKey={dataKey} background cornerRadius={6}>
          {data.map((entry) => (
            <Recharts.Cell
              key={String(entry[nameKey])}
              fill={`var(--color-${String(entry[nameKey])})`}
            />
          ))}
        </Recharts.RadialBar>
      </Recharts.RadialBarChart>
    </ChartContainer>
  );
}

interface SparklineProps {
  /** A series of numbers, or objects with a `value`. */
  data: number[] | { value: number }[];
  type?: "line" | "area";
  /** Stroke/fill colour. Defaults to `currentColor` (set via `text-*`). */
  color?: string;
  width?: number | string;
  height?: number;
  className?: string;
}

/**
 * Tiny inline trend chart for KPI tiles (`Stat`) and table cells. No axes,
 * grid, or tooltip — just the line. Colour follows `currentColor` by default,
 * so set it with a `text-*` class on the wrapper.
 */
function Sparkline({
  data,
  type = "line",
  color = "currentColor",
  width = "100%",
  height = 32,
  className,
}: SparklineProps) {
  const series = React.useMemo(
    () => data.map((d, i) => ({ i, value: typeof d === "number" ? d : d.value })),
    [data],
  );
  return (
    <div
      data-slot="sparkline"
      className={cn("inline-block text-primary", className)}
      style={{ width, height }}
    >
      <Recharts.ResponsiveContainer width="100%" height="100%">
        {type === "area" ? (
          <Recharts.AreaChart data={series} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
            <Recharts.Area
              dataKey="value"
              type="monotone"
              stroke={color}
              fill={color}
              fillOpacity={0.15}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </Recharts.AreaChart>
        ) : (
          <Recharts.LineChart data={series} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
            <Recharts.Line
              dataKey="value"
              type="monotone"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </Recharts.LineChart>
        )}
      </Recharts.ResponsiveContainer>
    </div>
  );
}

export type { CartesianChartProps, ChartAccessibilityProps, RadialOrPieProps, SparklineProps };
export { AreaChart, BarChart, DonutChart, LineChart, RadialChart, Sparkline };
