"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = { config: ChartConfig };

interface ChartContainerProps extends React.ComponentProps<"div"> {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  /** Programmatic chart title. Enables the labelled figure contract. */
  accessibleTitle?: React.ReactNode;
  /** What the chart measures, including units and time range. */
  accessibleDescription?: React.ReactNode;
  /** The most important trend or conclusion conveyed by the visual. */
  accessibleSummary?: React.ReactNode;
  /** Native table equivalent of the plotted data. */
  accessibilityTable?: React.ReactNode;
  /** Keep the table screen-reader-only or expose it below the plot. */
  accessibilityTableVisibility?: "screen-reader" | "visible";
}

interface ChartDataTableColumn<TData extends Record<string, unknown>> {
  key: Extract<keyof TData, string>;
  header: React.ReactNode;
  format?: (value: TData[Extract<keyof TData, string>], row: TData) => React.ReactNode;
}

interface ChartDataTableProps<TData extends Record<string, unknown>>
  extends Omit<React.ComponentProps<"table">, "children"> {
  caption: React.ReactNode;
  data: TData[];
  columns: ChartDataTableColumn<TData>[];
  getRowKey?: (row: TData, index: number) => React.Key;
}

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        Math.round(prev.width) === Math.round(width) &&
        Math.round(prev.height) === Math.round(height)
          ? prev
          : { width, height },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  accessibleTitle,
  accessibleDescription,
  accessibleSummary,
  accessibilityTable,
  accessibilityTableVisibility = "screen-reader",
  ...props
}: ChartContainerProps) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;
  const titleId = `${chartId}-title`;
  const descriptionId = `${chartId}-description`;
  const summaryId = `${chartId}-summary`;
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const ready = size.width > 0 && size.height > 0;
  const descriptionIds = [
    accessibleDescription ? descriptionId : null,
    accessibleSummary ? summaryId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ChartContext.Provider value={{ config }}>
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: role and aria-labelledby are applied together, only when a title exists. */}
      <div
        data-slot="chart-figure"
        role={accessibleTitle ? "figure" : undefined}
        aria-labelledby={accessibleTitle ? titleId : undefined}
        aria-describedby={descriptionIds || undefined}
      >
        {accessibleTitle && (
          <span id={titleId} className="sr-only">
            {accessibleTitle}
          </span>
        )}
        {accessibleDescription && (
          <span id={descriptionId} className="sr-only">
            {accessibleDescription}
          </span>
        )}
        {accessibleSummary && (
          <span id={summaryId} className="sr-only">
            {accessibleSummary}
          </span>
        )}
        <div
          ref={containerRef}
          data-slot="chart"
          data-chart={chartId}
          className={cn(
            "relative flex aspect-video min-h-0 w-full min-w-0 justify-center overflow-hidden text-xs [&_.recharts-cartesian-axis-tick_text]:fill-chart-axis [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-chart-grid [&_.recharts-curve.recharts-tooltip-cursor]:stroke-chart-reference [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-chart-grid [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-chart-reference [&_.recharts-sector]:outline-none [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-none",
            className,
          )}
          {...props}
        >
          <ChartStyle id={chartId} config={config} />
          {ready ? (
            <RechartsPrimitive.ResponsiveContainer width={size.width} height={size.height}>
              {children}
            </RechartsPrimitive.ResponsiveContainer>
          ) : null}
        </div>
        {accessibilityTable && (
          <div
            data-slot="chart-table-fallback"
            className={
              accessibilityTableVisibility === "screen-reader" ? "sr-only" : "mt-3 overflow-x-auto"
            }
          >
            {accessibilityTable}
          </div>
        )}
      </div>
    </ChartContext.Provider>
  );
}

function ChartDataTable<TData extends Record<string, unknown>>({
  caption,
  data,
  columns,
  getRowKey,
  className,
  ...props
}: ChartDataTableProps<TData>) {
  return (
    <table
      data-slot="chart-data-table"
      className={cn("w-full border-collapse text-sm", className)}
      {...props}
    >
      <caption className="mb-2 text-start font-medium">{caption}</caption>
      <thead>
        <tr className="border-b border-border">
          {columns.map((column) => (
            <th key={column.key} scope="col" className="px-2 py-1.5 text-start font-medium">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr
            key={getRowKey?.(row, index) ?? index}
            className="border-b border-border last:border-0"
          >
            {columns.map((column, columnIndex) => {
              const value = row[column.key];
              const content = column.format ? column.format(value, row) : String(value ?? "");
              return columnIndex === 0 ? (
                <th key={column.key} scope="row" className="px-2 py-1.5 text-start font-normal">
                  {content}
                </th>
              ) : (
                <td key={column.key} className="px-2 py-1.5 text-start tabular-nums">
                  {content}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, c]) => c.theme || c.color);
  if (!colorConfig.length) return null;

  // Chart-scoped CSS custom properties. React renders a string child of <style>
  // verbatim, so no dangerouslySetInnerHTML is required here.
  const css = Object.entries(THEMES)
    .map(
      ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
    )
    .join("\n");

  return <style>{css}</style>;
};

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown> & { fill?: string };
};

type ChartTooltipContentProps = React.ComponentProps<"div"> & {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  labelFormatter?: (value: unknown, payload: TooltipPayloadItem[]) => React.ReactNode;
  labelClassName?: string;
  formatter?: (
    value: number | string,
    name: string | number,
    item: TooltipPayloadItem,
    index: number,
    payload: Record<string, unknown> | undefined,
  ) => React.ReactNode;
  color?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
  nameKey?: string;
  labelKey?: string;
};

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) return null;
    const [item] = payload;
    const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === "string"
        ? config[label as keyof typeof config]?.label || label
        : itemConfig?.label;
    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>
      );
    }
    if (!value) return null;
    return <div className={cn("font-medium", labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !payload?.length) return null;

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-popover",
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const indicatorColor = color || item.payload?.fill || item.color;
          return (
            <div
              key={String(item.dataKey ?? item.name ?? index)}
              className={cn(
                "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                indicator === "dot" && "items-center",
              )}
            >
              {formatter && item?.value !== undefined && item.name !== undefined ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn(
                          "shrink-0 rounded-xs border-(--color-border) bg-(--color-bg)",
                          {
                            "h-2.5 w-2.5": indicator === "dot",
                            "w-1": indicator === "line",
                            "w-0 border-[length:var(--qx-component-chart-reference-stroke-width)] border-dashed bg-transparent":
                              indicator === "dashed",
                            "my-0.5": nestLabel && indicator === "dashed",
                          },
                        )}
                        style={
                          {
                            "--color-bg": indicatorColor,
                            "--color-border": indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )
                  )}
                  <div
                    className={cn(
                      "flex flex-1 justify-between leading-none",
                      nestLabel ? "items-end" : "items-center",
                    )}
                  >
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-muted-foreground">
                        {itemConfig?.label || item.name}
                      </span>
                    </div>
                    {item.value !== undefined && (
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

type LegendPayloadItem = {
  value?: string | number;
  dataKey?: string | number;
  color?: string;
};

type ChartLegendContentProps = React.ComponentProps<"div"> & {
  payload?: LegendPayloadItem[];
  verticalAlign?: "top" | "middle" | "bottom";
  hideIcon?: boolean;
  nameKey?: string;
};

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: ChartLegendContentProps) {
  const { config } = useChart();

  if (!payload?.length) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        return (
          <div
            key={String(item.value)}
            className={cn(
              "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground",
            )}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[var(--qx-corner-xs)]"
                style={{ backgroundColor: item.color }}
              />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) return undefined;
  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? payload.payload
      : undefined;
  let configLabelKey: string = key;
  if (key in payload && typeof (payload as Record<string, unknown>)[key] === "string") {
    configLabelKey = (payload as Record<string, string>)[key];
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof (payloadPayload as Record<string, unknown>)[key] === "string"
  ) {
    configLabelKey = (payloadPayload as Record<string, string>)[key];
  }
  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

export type { ChartContainerProps, ChartDataTableColumn, ChartDataTableProps };
export {
  ChartContainer,
  ChartDataTable,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
};
