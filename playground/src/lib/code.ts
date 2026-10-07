import type { Controls, Values } from "../registry/types";

/**
 * JSX snippet generation for the inspector. A snippet is what a consumer would paste: real
 * `@qeetrix/ui` exports, props left at their default omitted, booleans as bare attributes.
 *
 *   jsx("Button", { variant: "outline", disabled: true }, "Save")
 *   → <Button variant="outline" disabled>Save</Button>
 */

/** A prop value printed verbatim inside braces: `expr("() => setOpen(false)")`. */
export interface Expression {
  readonly __expr: string;
}
export function expr(code: string): Expression {
  return { __expr: code };
}
function isExpression(value: unknown): value is Expression {
  return typeof value === "object" && value !== null && "__expr" in value;
}

type PropValue = string | number | boolean | Expression | null | undefined;

function printProp(name: string, value: PropValue): string | null {
  if (value === undefined || value === null || value === false) return null;
  if (value === true) return name;
  if (isExpression(value)) return `${name}={${value.__expr}}`;
  if (typeof value === "number") return `${name}={${value}}`;
  return /["\n{}]/.test(value) ? `${name}={${JSON.stringify(value)}}` : `${name}="${value}"`;
}

function indent(block: string, by = "  "): string {
  return block
    .split("\n")
    .map((line) => (line ? `${by}${line}` : line))
    .join("\n");
}

/**
 * One element. `children` may be text or already-printed JSX (one or more lines); arrays are
 * printed one per line. Long attribute lists wrap one per line, as Biome would format them.
 */
export function jsx(
  tag: string,
  props: Record<string, PropValue> = {},
  children?: string | readonly string[] | null,
): string {
  const attributes = Object.entries(props)
    .map(([name, value]) => printProp(name, value))
    .filter((attribute): attribute is string => attribute !== null);
  const childList = (Array.isArray(children) ? children : children ? [children] : []).filter(
    (child) => child !== "",
  );
  const inline = attributes.length ? ` ${attributes.join(" ")}` : "";
  const open =
    inline.length + tag.length > 72
      ? `<${tag}\n${indent(attributes.join("\n"))}\n`
      : `<${tag}${inline}`;
  if (childList.length === 0) return open.endsWith("\n") ? `${open}/>` : `${open} />`;
  const opening = open.endsWith("\n") ? `${open}>` : `${open}>`;
  const first = childList[0] ?? "";
  const single = childList.length === 1 && !first.includes("\n") && !first.startsWith("<");
  if (single && opening.length + first.length + tag.length < 90) {
    // A child that is already an expression (`{count}`, `{/* … */}`) is printed as-is.
    return `${opening}${first.startsWith("{") ? first : escapeText(first)}</${tag}>`;
  }
  const body = childList
    .map((child) =>
      child.trimStart().startsWith("<") || child.startsWith("{") ? child : escapeText(child),
    )
    .join("\n");
  return `${opening}\n${indent(body)}\n</${tag}>`;
}

/** Text children: braces would start an expression, so they are quoted. */
function escapeText(value: string): string {
  return /[{}<>]/.test(value) ? `{${JSON.stringify(value)}}` : value;
}

/** Siblings, one per line, wrapped in a fragment when there is more than one. */
export function fragment(children: readonly string[]): string {
  return children.length === 1 ? children[0] : `<>\n${indent(children.join("\n"))}\n</>`;
}

/**
 * The subset of `values` that differ from their control's default, for the listed keys (all keys
 * when omitted). `rename` maps a control key onto the prop it drives.
 */
export function changedProps(
  values: Values,
  controls: Controls,
  keys: readonly string[] = Object.keys(controls),
  rename: Record<string, string> = {},
): Record<string, PropValue> {
  const props: Record<string, PropValue> = {};
  for (const key of keys) {
    const control = controls[key];
    const value = values[key];
    if (control && value === control.default) continue;
    if (control?.kind === "boolean" && value === false) {
      props[rename[key] ?? key] = expr("false");
      continue;
    }
    props[rename[key] ?? key] = value;
  }
  return props;
}

/** Recharts parts a raw-chart snippet composes inside `ChartContainer`. */
const rechartsParts = new Set([
  "Area",
  "AreaChart",
  "Bar",
  "BarChart",
  "Brush",
  "CartesianGrid",
  "Cell",
  "ComposedChart",
  "Label",
  "LabelList",
  "Line",
  "LineChart",
  "Pie",
  "PieChart",
  "PolarAngleAxis",
  "PolarGrid",
  "PolarRadiusAxis",
  "Radar",
  "RadarChart",
  "RadialBar",
  "RadialBarChart",
  "ReferenceArea",
  "ReferenceDot",
  "ReferenceLine",
  "ResponsiveContainer",
  "Scatter",
  "ScatterChart",
  "XAxis",
  "YAxis",
  "ZAxis",
]);

/** Names both packages export: Qeetrix's chart presets, unless the snippet composes Recharts. */
const presetNames = new Set(["AreaChart", "BarChart", "LineChart"]);

/** Exports that are not in the root barrel and need their deep import path. */
const deepImports: Record<string, string> = {
  PaginationBar: "@qeetrix/ui/components/pagination-bar",
};

/** The library's own components whose names end in "Icon" (everything else is @qeetrix/icons). */
const libraryIcons = new Set(["Icon", "FileTypeIcon"]);

/** The import statement(s) a snippet needs: Qeetrix components, Qeetrix icons, Recharts parts. */
export function importsFor(code: string): string {
  const tags = new Set<string>();
  for (const match of code.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) tags.add(match[1]);
  for (const match of code.matchAll(/\b(toast)\s*[.(]/g)) tags.add(match[1]);
  // Components passed as values: `icon={UsersIcon}`, `{ icon: UsersIcon }`.
  for (const match of code.matchAll(/[:=]\s*\{?\s*([A-Z][A-Za-z0-9]*Icon)\b/g)) tags.add(match[1]);
  const raw = code.includes("<ChartContainer");
  const icons = [...tags].filter((tag) => tag.endsWith("Icon") && !libraryIcons.has(tag)).sort();
  const charts = [...tags]
    .filter((tag) => rechartsParts.has(tag) && (raw || !presetNames.has(tag)))
    .sort();
  const library = [...tags]
    .filter((tag) => !icons.includes(tag) && !charts.includes(tag) && !(tag in deepImports))
    .sort();
  const hooks = [
    ...new Set(
      [...code.matchAll(/\b(use(?:State|Ref|Effect|Memo|Callback|Id))\(/g)].map((m) => m[1]),
    ),
  ].sort();
  const lines: string[] = [];
  if (hooks.length) lines.push(`import { ${hooks.join(", ")} } from "react";`);
  if (icons.length) lines.push(`import { ${icons.join(", ")} } from "@qeetrix/icons";`);
  if (charts.length) lines.push(`import { ${charts.join(", ")} } from "recharts";`);
  if (library.length) lines.push(`import { ${library.join(", ")} } from "@qeetrix/ui";`);
  for (const tag of [...tags].filter((name) => name in deepImports).sort()) {
    lines.push(`import { ${tag} } from "${deepImports[tag]}";`);
  }
  return lines.join("\n");
}
