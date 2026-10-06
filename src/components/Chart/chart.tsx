"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/direction-provider";

const THEMES = { light: "", dark: ".dark" } as const;

/** The foundation's categorical series, in their designed order. */
const CHART_SERIES_COUNT = 8;

/**
 * The colour of categorical series `index` (0-based): `var(--chart-1)` … `var(--chart-8)`, the
 * foundation's CVD-checked order — blue, teal, Qeet, violet, pink, lime, sky, graphite. Qeet orange
 * is the third series on purpose: a single-series chart is blue, and orange stays the colour of
 * action and selection rather than of every line.
 *
 * Past the eighth series the palette does not cycle — a repeated hue would claim two series are
 * the same thing. Everything from the ninth on is graphite, the "other" colour; fold such tails
 * into an "Other" series or split the chart instead.
 */
function chartSeriesColor(index: number): string {
  const slot = Math.min(Math.max(Math.trunc(index), 0), CHART_SERIES_COUNT - 1) + 1;
  return `var(--chart-${slot})`;
}

/**
 * One entry per series (or, for pie/radial charts, per category), keyed by the data key. An entry
 * with neither `color` nor `theme` takes the categorical colour for its position in the config —
 * the first entry series 1, the second series 2 — so a config only names colours it means to
 * override, and a series keeps its colour when another is filtered out of the data.
 */
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
  /**
   * CSP nonce for the stylesheet a `theme` series pair requires. Series declared with `color`
   * need no stylesheet and no nonce.
   */
  nonce?: string;
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
  style,
  nonce,
  accessibleTitle,
  accessibleDescription,
  accessibleSummary,
  accessibilityTable,
  accessibilityTableVisibility = "screen-reader",
  ...props
}: ChartContainerProps) {
  const uniqueId = React.useId();
  // `id` is consumer data and is only ever an attribute value. The style scope is derived from
  // useId() and reduced to a CSS identifier, so it stays selector-safe whatever format a future
  // React release adopts.
  const scopeSuffix = toCssIdentifier(uniqueId);
  const chartId = `chart-${id || scopeSuffix}`;
  const chartScopeId = `chart-${scopeSuffix}`;
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
  const seriesVariables = inlineSeriesVariables(config);
  const themedConfig = themedSeries(config);

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
          data-chart-scope={chartScopeId}
          className={cn(
            "relative flex aspect-video min-h-0 w-full min-w-0 justify-center overflow-hidden text-xs",
            // Chrome: recessive hairline grid and axes, axis text in the axis role.
            "[&_.recharts-cartesian-axis-tick_text]:fill-chart-axis [&_.recharts-cartesian-axis-tick_text]:tabular-nums [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-chart-grid [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-chart-grid [&_.recharts-reference-line_[stroke='#ccc']]:stroke-chart-reference",
            // Hover: a reference-coloured crosshair on line/area, a muted band on bars.
            "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-chart-reference [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-sector]:outline-none [&_.recharts-sector[stroke='#fff']]:stroke-transparent",
            // Recharts' accessibility layer makes the plot (and a pie) a tab stop that moves the
            // tooltip with the arrow keys. It must show where focus is: no outline for a
            // pointer, the inset Qeet ring for the keyboard.
            "[&_.recharts-pie]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-pie:focus-visible]:focus-ring [&_.recharts-surface:focus-visible]:focus-ring-inset",
            className,
          )}
          style={{ ...seriesVariables, ...style } as React.CSSProperties}
          {...props}
        >
          {themedConfig ? (
            <ChartStyle id={chartScopeId} config={themedConfig} nonce={nonce} />
          ) : null}
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
  const locale = useLocale();
  const numberFormat = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  // A column whose values are all numbers is a measure: right-aligned with tabular figures so
  // magnitudes line up and can be compared down the column, as they would be in a spreadsheet.
  const numeric = React.useMemo(
    () =>
      new Set(
        columns
          .filter(
            (column, columnIndex) =>
              columnIndex > 0 &&
              data.length > 0 &&
              data.every((row) => row[column.key] == null || typeof row[column.key] === "number"),
          )
          .map((column) => column.key),
      ),
    [columns, data],
  );
  const render = (column: ChartDataTableColumn<TData>, row: TData) => {
    const value = row[column.key];
    if (column.format) return column.format(value, row);
    if (typeof value === "number") return numberFormat.format(value);
    return String(value ?? "");
  };

  return (
    <table
      data-slot="chart-data-table"
      className={cn("w-full border-collapse text-sm tabular-nums", className)}
      {...props}
    >
      <caption className="mb-2 text-start font-medium text-foreground">{caption}</caption>
      <thead>
        <tr className="border-b border-border">
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={cn(
                "px-2 py-1.5 text-caption font-medium text-muted-foreground",
                numeric.has(column.key) ? "text-end" : "text-start",
              )}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr
            key={getRowKey?.(row, index) ?? index}
            className="border-b border-border-subtle last:border-0"
          >
            {columns.map((column, columnIndex) =>
              columnIndex === 0 ? (
                <th key={column.key} scope="row" className="px-2 py-1.5 text-start font-normal">
                  {render(column, row)}
                </th>
              ) : (
                <td
                  key={column.key}
                  className={cn("px-2 py-1.5", numeric.has(column.key) ? "text-end" : "text-start")}
                >
                  {render(column, row)}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Generated-CSS safety ──────────────────────────────────────────────────────────────────
 * A chart config is consumer data: series keys usually come from a dataset and colours are
 * frequently read from a tenant theme, a saved dashboard or an API response. Anything
 * interpolated into CSS therefore has to be validated rather than merely quoted — a value
 * carrying `;` or a closing brace would otherwise end Qeetrix's declaration and start a rule
 * of the author's choosing, anywhere in the host document.
 *
 * Two mechanisms, in order of preference:
 *
 *   1. Series declared with `color` become inline custom properties on the chart element.
 *      React writes those through CSSOM in the browser, and CSSOM parses each value as one
 *      declaration — a value cannot open a rule, and no stylesheet is generated at all.
 *   2. Series declared with `theme` need a `.dark`-scoped rule, which an inline style cannot
 *      express, so they go through `ChartStyle` behind the allowlists below. Nothing is
 *      escaped: a key, scope or value outside the allowlist is dropped.
 */

/** The `<custom-ident>` subset Qeetrix will interpolate into a selector or property name. */
const CSS_IDENTIFIER = /^[a-zA-Z0-9_-]+$/;

/**
 * The character set every accepted colour value is drawn from. Declaration and rule
 * terminators, string and escape openers, element-closing markup, at-rule and precedence
 * markers, the comment character and all control characters are absent by construction, so a
 * value cannot leave the declaration it is written into.
 */
const CSS_VALUE_CHARACTERS = /^[a-zA-Z0-9#%(),./+\s_-]+$/;

/**
 * Functions a colour value may call: the colour spaces, `var` and the maths functions. `url`
 * and `image-set` are deliberately absent, so a config cannot make the host document issue a
 * request for an attacker-chosen address.
 */
const ALLOWED_VALUE_FUNCTIONS = new Set([
  "calc",
  "clamp",
  "color",
  "color-mix",
  "hsl",
  "hsla",
  "hwb",
  "lab",
  "lch",
  "light-dark",
  "max",
  "min",
  "oklab",
  "oklch",
  "rgb",
  "rgba",
  "var",
]);

const VALUE_FUNCTION_CALL = /([a-zA-Z-]*)\(/g;
const MAX_VALUE_LENGTH = 128;
const MAX_VALUE_DEPTH = 4;

/**
 * Reduces a React `useId()` value to a CSS identifier. React 19 already emits identifier-safe
 * ids; deriving rather than trusting means a future format change degrades to a shorter scope
 * instead of silently dropping every series colour.
 */
function toCssIdentifier(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

/** Whether a config colour can be written into generated CSS unchanged. */
function isSafeCssValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const candidate = value.trim();
  if (!candidate || candidate.length > MAX_VALUE_LENGTH) return false;
  if (!CSS_VALUE_CHARACTERS.test(candidate)) return false;

  let depth = 0;
  for (const character of candidate) {
    if (character === "(") {
      depth += 1;
      if (depth > MAX_VALUE_DEPTH) return false;
    } else if (character === ")") {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  if (depth !== 0) return false;

  // An empty captured name is a bare parenthesised group, which no colour value needs.
  for (const [, name] of candidate.matchAll(VALUE_FUNCTION_CALL)) {
    if (!ALLOWED_VALUE_FUNCTIONS.has(name.toLowerCase())) return false;
  }
  return true;
}

/**
 * Series declared with `color`, as inline custom properties — plus every series that declares
 * no colour at all, which takes the categorical colour for its position in the config. Position
 * counts every entry, coloured or not, so giving one series an explicit colour never shifts the
 * others. A `color` that fails validation is dropped, not replaced: the author asked for a colour,
 * and substituting a palette slot would hide the mistake.
 */
function inlineSeriesVariables(config: ChartConfig) {
  const variables: Record<string, string> = {};
  Object.entries(config).forEach(([key, item], index) => {
    if (item.theme || !CSS_IDENTIFIER.test(key)) return;
    if (item.color === undefined) {
      variables[`--color-${key}`] = chartSeriesColor(index);
    } else if (isSafeCssValue(item.color)) {
      variables[`--color-${key}`] = item.color.trim();
    }
  });
  return variables;
}

/** Series declared with `theme`, which need the light/dark rule pair `ChartStyle` generates. */
function themedSeries(config: ChartConfig): ChartConfig | null {
  const entries = Object.entries(config).filter(([, item]) => item.theme);
  return entries.length ? (Object.fromEntries(entries) as ChartConfig) : null;
}

/**
 * Scoped custom properties for series that vary by theme. `ChartContainer` renders this only
 * when a config uses `theme`; it is exported for consumers driving Recharts directly.
 *
 * `id` must be a CSS identifier and is matched against both `data-chart` and the
 * `data-chart-scope` attribute `ChartContainer` sets. Keys and values outside the documented
 * allowlists are omitted, so an untrusted config yields fewer declarations — never a
 * different rule.
 */
const ChartStyle = ({
  id,
  config,
  nonce,
}: {
  id: string;
  config: ChartConfig;
  /** CSP nonce, required when `style-src` does not allow inline stylesheets. */
  nonce?: string;
}) => {
  if (!CSS_IDENTIFIER.test(id)) return null;

  const colorConfig = Object.entries(config).filter(
    ([key, item]) => CSS_IDENTIFIER.test(key) && (item.theme || item.color),
  );
  if (!colorConfig.length) return null;

  const css = Object.entries(THEMES)
    .flatMap(([theme, prefix]) => {
      const declarations = colorConfig.flatMap(([key, itemConfig]) => {
        const color =
          itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
        return isSafeCssValue(color) ? [`  --color-${key}: ${color.trim()};`] : [];
      });
      if (!declarations.length) return [];
      const scope = prefix ? `${prefix} ` : "";
      const selector = `${scope}[data-chart="${id}"],\n${scope}[data-chart-scope="${id}"]`;
      return [`${selector} {\n${declarations.join("\n")}\n}`];
    })
    .join("\n\n");

  if (!css) return null;

  return <style nonce={nonce}>{css}</style>;
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
  /**
   * Formats each value without taking over the row, which `formatter` does. Defaults to the
   * locale's number format (the nearest `DirectionProvider`'s locale, then the runtime's).
   */
  valueFormatter?: (value: number | string, item: TooltipPayloadItem) => React.ReactNode;
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
  valueFormatter,
}: ChartTooltipContentProps) {
  const { config } = useChart();
  const locale = useLocale();
  const numberFormat = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);

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
        "grid min-w-32 items-start gap-1.5 rounded-(--qx-corner-overlay) border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-popover",
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
                            "w-0 border-(length:--qx-component-chart-reference-stroke-width) border-dashed bg-transparent":
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
                      // The value leads: the reader already knows the series, they want the
                      // number. Tabular figures keep a column of values aligned.
                      <span className="ms-3 font-medium text-foreground tabular-nums">
                        {valueFormatter
                          ? valueFormatter(item.value, item)
                          : typeof item.value === "number"
                            ? numberFormat.format(item.value)
                            : item.value}
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
  /** Recharts' legend type for the series: `line` for lines, `rect` for bars and areas, … */
  type?: string;
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
      data-slot="chart-legend"
      className={cn(
        // Wraps rather than overflowing a narrow card; legend text is secondary ink — the swatch
        // carries the identity, never coloured text.
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-muted-foreground",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        // The key mirrors the mark: a short stroke for a line series, a swatch for a filled one.
        const lineKey = item.type === "line" || item.type === "plainline";
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
                aria-hidden
                className={cn(
                  "shrink-0",
                  lineKey ? "h-0.5 w-3 rounded-full" : "h-2 w-2 rounded-(--qx-corner-xs)",
                )}
                style={{ backgroundColor: item.color }}
              />
            )}
            {itemConfig?.label ?? item.value}
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

export type {
  ChartContainerProps,
  ChartDataTableColumn,
  ChartDataTableProps,
  ChartTooltipContentProps,
};
export {
  ChartContainer,
  ChartDataTable,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  chartSeriesColor,
};
