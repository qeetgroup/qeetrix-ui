import { Button, CodeBlock, cn, Input } from "@qeetrix/ui";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { contrastOf, formatRatio, hexOf, thresholds } from "../lib/color";
import { leaves, subtree } from "../lib/tokens";

/**
 * The foundation specimen: rendered inside a preview frame, once per theme, with the library's
 * real utilities (bg-surface, shadow-popover, focus-ring, border-control…). Every label is read
 * back from the frame's computed styles — the value on screen is the value printed — and
 * contrast is measured between the computed colours, so it tracks tokens.css live.
 */

/** Bumps whenever Vite swaps a stylesheet, so computed values are re-read. */
function useStyleVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((value) => value + 1);
    import.meta.hot?.on("vite:afterUpdate", bump);
    const observer = new MutationObserver(bump);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      import.meta.hot?.off?.("vite:afterUpdate", bump);
      observer.disconnect();
    };
  }, []);
  return version;
}

interface Computed {
  color: string;
  background: string;
  border: string;
}

/** Computed colours of an element and of the nearest ancestor with an opaque background. */
function useComputed(ref: React.RefObject<HTMLElement | null>): Computed & { behind: string } {
  const version = useStyleVersion();
  const [state, setState] = useState<Computed & { behind: string }>({
    color: "",
    background: "",
    border: "",
    behind: "",
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the re-read trigger.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const style = getComputedStyle(element);
    let behind = "";
    for (let node = element.parentElement; node; node = node.parentElement) {
      const background = getComputedStyle(node).backgroundColor;
      if (background && background !== "rgba(0, 0, 0, 0)" && background !== "transparent") {
        behind = background;
        break;
      }
    }
    setState({
      color: style.color,
      background: style.backgroundColor,
      border: style.borderTopColor,
      behind,
    });
  }, [ref, version]);
  return state;
}

function Ratio({ ratio, min }: { ratio: number | null; min: number }) {
  const pass = ratio !== null && ratio >= min;
  return (
    <span
      className={cn(
        "rounded px-1 font-mono text-micro tabular-nums",
        pass ? "text-success-text" : "bg-destructive-subtle text-destructive-text",
      )}
    >
      {formatRatio(ratio)}
      <span className="sr-only">{pass ? " passes" : " fails"}</span>
    </span>
  );
}

function Block({
  title,
  note,
  children,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-heading text-sm font-semibold text-foreground">{title}</h2>
        {note && <p className="text-caption text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/* ── Ramps (data from tokens.json; the primitives have no runtime variables) ─────────────── */

function Ramp({ group, label, brandStep }: { group: string; label: string; brandStep?: string }) {
  const steps = leaves(subtree("light", `color.${group}`));
  if (steps.length === 0) return null;
  return (
    <Block title={label} note={`color.${group} · ${steps.length} steps`}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1.5">
        {steps.map((step) => {
          const name = step.path.join(".");
          const brand = name === brandStep;
          return (
            <div key={name} className="flex flex-col gap-1">
              <div
                className={cn(
                  "h-12 rounded-md ring-1 ring-foreground/10",
                  brand && "ring-2 ring-foreground",
                )}
                style={{ backgroundColor: step.value }}
                title={step.value}
              />
              <span className="flex items-baseline justify-between gap-1 font-mono text-micro">
                <span className={brand ? "font-semibold text-foreground" : "text-muted-foreground"}>
                  {name}
                </span>
                <span className="text-muted-foreground">{hexOf(step.value)}</span>
              </span>
              {brand && <span className="text-micro font-medium text-foreground">Qeet orange</span>}
            </div>
          );
        })}
      </div>
    </Block>
  );
}

/* ── Surfaces ─────────────────────────────────────────────────────────────────────────────── */

function SurfaceLabel({ utility }: { utility: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const computed = useComputed(ref);
  return (
    <span ref={ref} className="flex flex-col gap-0.5 text-start">
      <code className="font-mono text-xs text-foreground">{utility}</code>
      <span className="font-mono text-micro text-muted-foreground">{hexOf(computed.behind)}</span>
    </span>
  );
}

function SurfaceStack() {
  return (
    <Block
      title="Surface hierarchy"
      note="Each layer sits on the one below; elevation comes from the surface step plus its shadow."
    >
      <div className="rounded-xl bg-canvas p-3 ring-1 ring-border">
        <SurfaceLabel utility="bg-canvas" />
        <div className="mt-3 rounded-lg bg-surface p-3 shadow-rest">
          <SurfaceLabel utility="bg-surface · shadow-rest" />
          <div className="mt-3 rounded-lg bg-surface-elevated p-3 shadow-hover">
            <SurfaceLabel utility="bg-surface-elevated · shadow-hover" />
            <div className="mt-3 rounded-lg bg-surface-overlay p-3 shadow-popover">
              <SurfaceLabel utility="bg-surface-overlay · shadow-popover" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["bg-surface-sunken", "bg-surface-sunken"],
          ["bg-surface-subtle", "bg-surface-subtle"],
          ["bg-surface-interactive", "bg-surface-interactive"],
          ["bg-surface-interactive-hover", "bg-surface-interactive-hover"],
          ["bg-surface-interactive-active", "bg-surface-interactive-active"],
          ["bg-brand-subtle", "bg-brand-subtle"],
          ["bg-brand-subtle-hover", "bg-brand-subtle-hover"],
          ["bg-brand-subtle-active", "bg-brand-subtle-active"],
        ].map(([utility, className]) => (
          <div key={utility} className={cn("rounded-lg p-3 ring-1 ring-border-subtle", className)}>
            <SurfaceLabel utility={utility ?? ""} />
          </div>
        ))}
      </div>
    </Block>
  );
}

function ElevationLadder() {
  const steps = [
    ["shadow-rest", "Rest — cards"],
    ["shadow-hover", "Hover — lifted card"],
    ["shadow-popover", "Popover — menus, selects"],
    ["shadow-modal", "Modal — dialogs"],
  ] as const;
  return (
    <Block title="Elevation ladder" note="On bg-canvas, each step on bg-surface.">
      <div className="grid grid-cols-2 gap-5 rounded-xl bg-canvas p-5 ring-1 ring-border sm:grid-cols-4">
        {steps.map(([utility, label]) => (
          <div
            key={utility}
            className={cn("flex h-24 flex-col justify-end rounded-lg bg-surface p-3", utility)}
          >
            <code className="font-mono text-xs text-foreground">{utility}</code>
            <span className="text-micro text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </Block>
  );
}

/* ── Text on surfaces ─────────────────────────────────────────────────────────────────────── */

const textRoles = [
  ["text-foreground", "Primary"],
  ["text-(--qx-color-text-secondary)", "Secondary"],
  ["text-muted-foreground", "Muted"],
  ["text-(--qx-color-text-placeholder)", "Placeholder"],
  ["text-(--qx-color-text-disabled)", "Disabled"],
  ["text-link", "Link"],
  ["text-brand", "Brand"],
] as const;

const surfaces = [
  ["bg-canvas", "canvas"],
  ["bg-surface", "surface"],
  ["bg-surface-elevated", "elevated"],
  ["bg-surface-overlay", "overlay"],
  ["bg-surface-sunken", "sunken"],
  ["bg-surface-subtle", "subtle"],
  ["bg-brand-subtle", "brand-subtle"],
] as const;

function TextSample({ className, minimum }: { className: string; minimum: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const computed = useComputed(ref);
  const ratio =
    computed.color && computed.behind ? contrastOf(computed.color, computed.behind) : null;
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span ref={ref} className={cn("text-sm font-medium", className)}>
        Aa ₹1,24,000
      </span>
      <Ratio ratio={ratio} min={minimum} />
    </span>
  );
}

function TextOnSurfaces() {
  return (
    <Block
      title="Text roles on each surface"
      note="Measured from computed colours. Disabled and placeholder are exempt from 4.5:1 but shown for review."
    >
      <div className="overflow-x-auto rounded-lg ring-1 ring-border">
        <table className="w-full border-collapse text-start">
          <thead>
            <tr className="bg-surface">
              <th
                scope="col"
                className="px-3 py-2 text-start text-caption font-medium text-muted-foreground"
              >
                Role
              </th>
              {surfaces.map(([, name]) => (
                <th
                  key={name}
                  scope="col"
                  className="px-3 py-2 text-start text-caption font-medium text-muted-foreground"
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {textRoles.map(([className, label]) => (
              <tr key={label} className="border-t border-border-subtle">
                <th
                  scope="row"
                  className="bg-surface px-3 py-2 text-start text-caption font-medium whitespace-nowrap text-foreground"
                >
                  {label}
                </th>
                {surfaces.map(([surface, name]) => (
                  <td key={name} className={cn("px-3 py-2", surface)}>
                    <TextSample
                      className={className}
                      minimum={
                        label === "Disabled" || label === "Placeholder"
                          ? thresholds.nonText
                          : thresholds.aa
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Block>
  );
}

/* ── Status ───────────────────────────────────────────────────────────────────────────────── */

const statuses = [
  ["Success", "bg-success-subtle", "text-success-text", "bg-success text-success-foreground"],
  ["Warning", "bg-warning-subtle", "text-warning-text", "bg-warning text-warning-foreground"],
  ["Info", "bg-info-subtle", "text-info-text", "bg-info text-info-foreground"],
  [
    "Destructive",
    "bg-destructive-subtle",
    "text-destructive-text",
    "bg-destructive text-destructive-foreground",
  ],
] as const;

function StatusSample({ className, label }: { className: string; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const computed = useComputed(ref);
  const ratio =
    computed.color && computed.background
      ? contrastOf(computed.color, computed.background, computed.behind)
      : null;
  return (
    <span className="flex items-center gap-2">
      <span ref={ref} className={cn("rounded-md px-2 py-1 text-sm font-medium", className)}>
        {label}
      </span>
      <Ratio ratio={ratio} min={thresholds.aa} />
    </span>
  );
}

function StatusRoles() {
  return (
    <Block
      title="Status text and fills"
      note="Subtle fill + status text for inline notices; solid fill + on-colour for emphasis."
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {statuses.map(([label, subtle, text, solid]) => (
          <div
            key={label}
            className="flex flex-col gap-2 rounded-lg bg-surface p-3 ring-1 ring-border-subtle"
          >
            <StatusSample className={cn(subtle, text)} label={`${label} — GSTR-1 filed`} />
            <StatusSample className={solid} label={label} />
          </div>
        ))}
      </div>
    </Block>
  );
}

/* ── Data and syntax ──────────────────────────────────────────────────────────────────────── */

const chartClasses = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-chart-6",
  "bg-chart-7",
  "bg-chart-8",
] as const;

function ChartSwatch({ className, index }: { className: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const computed = useComputed(ref);
  const ratio =
    computed.background && computed.behind
      ? contrastOf(computed.background, computed.behind)
      : null;
  return (
    <div className="flex flex-col gap-1">
      <div
        ref={ref}
        className={cn("h-10 rounded-md", className)}
        style={{ height: `${2.5 + index * 0.35}rem` }}
      />
      <span className="flex items-center justify-between font-mono text-micro text-muted-foreground">
        <span>chart-{index + 1}</span>
        <Ratio ratio={ratio} min={thresholds.nonText} />
      </span>
      <span className="font-mono text-micro text-muted-foreground">
        {hexOf(computed.background)}
      </span>
    </div>
  );
}

function ChartColours() {
  return (
    <Block
      title="Categorical chart colours"
      note="Graphical objects need 3:1 against the surface they are drawn on."
    >
      <div className="grid grid-cols-4 items-end gap-3 rounded-lg bg-surface p-4 ring-1 ring-border-subtle sm:grid-cols-8">
        {chartClasses.map((className, index) => (
          <ChartSwatch key={className} className={className} index={index} />
        ))}
      </div>
    </Block>
  );
}

const syntaxRoles = [
  ["text-syntax-key", "key"],
  ["text-syntax-string", "string"],
  ["text-syntax-number", "number"],
  ["text-syntax-literal", "literal"],
  ["text-syntax-punctuation", "punctuation"],
  ["text-syntax-comment", "comment"],
] as const;

function SyntaxSwatch({ className, label }: { className: string; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const computed = useComputed(ref);
  const ratio =
    computed.color && computed.behind ? contrastOf(computed.color, computed.behind) : null;
  return (
    <span className="flex items-center justify-between gap-2 font-mono text-xs">
      <span ref={ref} className={className}>
        {label}
      </span>
      <Ratio ratio={ratio} min={thresholds.aa} />
    </span>
  );
}

function SyntaxColours() {
  return (
    <Block
      title="Syntax on a code surface"
      note="CodeBlock highlighting JSON, and each syntax role measured on the same surface."
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <CodeBlock
          language="json"
          copy={false}
          caption="payment.captured · webhook"
          value={JSON.stringify(
            {
              id: "evt_01J9ZB6X4QH2",
              amount: 292640,
              currency: "INR",
              livemode: true,
              settled: false,
              refund: null,
            },
            null,
            2,
          )}
        />
        <div className="flex flex-col gap-1.5 rounded-md border bg-muted/30 p-3">
          {syntaxRoles.map(([className, label]) => (
            <SyntaxSwatch key={label} className={className} label={label} />
          ))}
        </div>
      </div>
    </Block>
  );
}

/* ── Focus and boundaries ─────────────────────────────────────────────────────────────────── */

function FocusRecipes() {
  return (
    <Block
      title="Focus-ring recipes"
      note="The three utilities applied statically for review. Tab into the live controls on the right to see them on :focus-visible."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col items-start gap-2 rounded-lg bg-surface p-4 ring-1 ring-border-subtle">
          <code className="font-mono text-micro text-muted-foreground">focus-ring</code>
          <Button variant="outline" className="focus-ring">
            Invite member
          </Button>
          <Button>Save changes</Button>
        </div>
        <div className="flex flex-col gap-2 rounded-lg bg-surface p-4 ring-1 ring-border-subtle">
          <code className="font-mono text-micro text-muted-foreground">focus-ring-inset</code>
          <div className="overflow-hidden rounded-md bg-popover p-1 shadow-popover ring-1 ring-foreground/10">
            <div className="rounded-md px-2 py-1 text-sm">Edit role</div>
            <div className="focus-ring-inset rounded-md bg-accent px-2 py-1 text-sm text-accent-foreground">
              Reset MFA
            </div>
            <div className="rounded-md px-2 py-1 text-sm text-destructive-text">Suspend user</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-lg bg-surface p-4 ring-1 ring-border-subtle">
          <code className="font-mono text-micro text-muted-foreground">focus-ring-field</code>
          <Input
            aria-label="Work email (focused sample)"
            defaultValue="rohan.mehta@acme.in"
            className="focus-ring-field"
          />
          <Input aria-label="Work email" placeholder="name@company.in" />
        </div>
      </div>
    </Block>
  );
}

function BorderSample({
  className,
  label,
  minimum,
}: {
  className: string;
  label: string;
  minimum?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const computed = useComputed(ref);
  const ratio =
    computed.border && computed.behind ? contrastOf(computed.border, computed.behind) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <div ref={ref} className={cn("h-9 rounded-lg border bg-transparent", className)} />
      <span className="flex items-center justify-between gap-2">
        <code className="font-mono text-micro text-muted-foreground">{label}</code>
        {minimum ? (
          <Ratio ratio={ratio} min={minimum} />
        ) : (
          <span className="font-mono text-micro text-muted-foreground">{formatRatio(ratio)}</span>
        )}
      </span>
    </div>
  );
}

function ControlBorders() {
  return (
    <Block
      title="Control borders vs decorative borders"
      note="Form boundaries (border-control) need 3:1; dividers and card edges are decorative and intentionally quiet."
    >
      <div className="grid grid-cols-2 gap-4 rounded-lg bg-surface p-4 ring-1 ring-border-subtle sm:grid-cols-5">
        <BorderSample
          className="border-control"
          label="border-control"
          minimum={thresholds.nonText}
        />
        <BorderSample
          className="border-control-hover"
          label="border-control-hover"
          minimum={thresholds.nonText}
        />
        <BorderSample className="border-border-strong" label="border-border-strong" />
        <BorderSample className="border-border" label="border-border" />
        <BorderSample className="border-border-subtle" label="border-border-subtle" />
      </div>
    </Block>
  );
}

export function FoundationsSpecimen() {
  return (
    <div className="flex flex-col gap-8 p-6 text-foreground">
      <Ramp group="qeet" label="Qeet ramp" brandStep="500" />
      <Ramp group="graphite" label="Graphite ramp" />
      <SurfaceStack />
      <ElevationLadder />
      <TextOnSurfaces />
      <StatusRoles />
      <ChartColours />
      <SyntaxColours />
      <FocusRecipes />
      <ControlBorders />
    </div>
  );
}
