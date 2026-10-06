import type { ReactNode } from "react";

/**
 * The example contract. Every module in component-manifest.json has exactly one
 * `ModuleExamples` entry, keyed by its manifest slug, in the family file under
 * `playground/src/examples/<family>.tsx`. The registry loads those files lazily; the coverage
 * test (`playground/__tests__/coverage.test.ts`) fails if a slug is missing or unknown.
 *
 * - `demos` are the gallery previews: the module's key variants and states (default,
 *   disabled, invalid, loading, open…), each a real, realistic usage.
 * - `playground` drives the inspector: typed controls, a live render from their values, and the
 *   JSX a consumer would write for the same values (props left at their default are omitted).
 */

export type ControlValue = string | number | boolean;
export type Values = Record<string, ControlValue>;

export interface SelectControl<O extends string = string> {
  readonly kind: "select";
  readonly options: readonly O[];
  readonly default: O;
  readonly label?: string;
}
export interface BooleanControl {
  readonly kind: "boolean";
  readonly default: boolean;
  readonly label?: string;
}
export interface TextControl {
  readonly kind: "text";
  readonly default: string;
  readonly label?: string;
  /** Multi-line text area instead of a single-line input. */
  readonly multiline?: boolean;
}
export interface NumberControl {
  readonly kind: "number";
  readonly default: number;
  readonly label?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}
export type Control = SelectControl | BooleanControl | TextControl | NumberControl;
export type Controls = Record<string, Control>;

type ValueOf<C> =
  C extends SelectControl<infer O>
    ? O
    : C extends BooleanControl
      ? boolean
      : C extends NumberControl
        ? number
        : string;

/** The typed values a set of controls produces. */
export type ValuesOf<C extends Controls> = { [K in keyof C]: ValueOf<C[K]> };

/** One gallery preview. */
export interface Demo {
  /** The variant or state shown: "Default", "Disabled", "Invalid", "Loading", "Open"… */
  readonly name: string;
  /** One sentence on what the demo shows; rendered under it in the inspector. */
  readonly description?: string;
  readonly render: () => ReactNode;
}

/** The erased shape the shell consumes. Build one with `definePlayground`. */
export interface Playground {
  readonly controls: Controls;
  readonly render: (values: Values) => ReactNode;
  readonly code: (values: Values) => string;
}

export interface ModuleExamples {
  readonly demos: readonly Demo[];
  readonly playground: Playground;
  /**
   * Preview footprint in the gallery grid. `compact` fits one column (buttons, badges, inputs);
   * `wide` spans the whole row (tables, calendars, charts, editors, app frames).
   */
  readonly layout?: "compact" | "wide";
  /**
   * Demos are rendered in a document-level frame rather than inline: set this for modules that
   * position themselves against the viewport (a desktop Sidebar, a fixed Banner) so the gallery
   * page is not covered. The inspector always renders in a frame.
   */
  readonly framed?: boolean;
  /** Minimum preview height in pixels, reserved before the demo mounts (avoids layout jank). */
  readonly minHeight?: number;
}

/** A family file's export: manifest slug → examples. */
export type FamilyExamples = Record<string, ModuleExamples>;

/* ── Builders ─────────────────────────────────────────────────────────────────────────────── */

export function select<const O extends readonly string[]>(
  options: O,
  defaultValue: O[number],
  label?: string,
): SelectControl<O[number]> {
  return { kind: "select", options, default: defaultValue, label };
}

export function bool(defaultValue: boolean, label?: string): BooleanControl {
  return { kind: "boolean", default: defaultValue, label };
}

export function text(
  defaultValue: string,
  label?: string,
  options: { multiline?: boolean } = {},
): TextControl {
  return { kind: "text", default: defaultValue, label, ...options };
}

export function num(
  defaultValue: number,
  options: { min?: number; max?: number; step?: number; label?: string } = {},
): NumberControl {
  return { kind: "number", default: defaultValue, ...options };
}

/**
 * Typed inspector spec: `render` and `code` receive values typed from the controls (a select's
 * options become a string-literal union), then the spec is erased to `Playground`.
 */
export function definePlayground<const C extends Controls>(spec: {
  controls: C;
  render: (values: ValuesOf<C>) => ReactNode;
  code: (values: ValuesOf<C>) => string;
}): Playground {
  return spec as unknown as Playground;
}

/** The default value of every control, as the inspector's initial state. */
export function defaultValues(controls: Controls): Values {
  return Object.fromEntries(
    Object.entries(controls).map(([key, control]) => [key, control.default]),
  );
}
