import {
  Badge,
  Button,
  Card,
  CardContent,
  type ColumnDef,
  DataTable,
  DensityProvider,
  Input,
  Label,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableOfContents,
  TableRow,
} from "@qeetrix/ui";
import { PlayIcon, RotateCcwIcon } from "lucide-react";
import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { contrastOf, formatRatio, hexOf, thresholds } from "../lib/color";
import type { FrameTheme } from "../lib/frame";
import type { Route } from "../lib/router";
import { setQuery } from "../lib/router";
import { matchesAny } from "../lib/table";
import {
  bridgeVariables,
  cssVarFor,
  isColorValue,
  leaves,
  presentSemanticGroups,
  primitiveColorGroups,
  subtree,
  type Theme,
  tokenThemes,
  tokenValue,
} from "../lib/tokens";
import { useShellFrameEnv } from "../shell/environment";
import { Page, Section } from "../shell/page";
import { PreviewFrame } from "../shell/preview-frame";
import { foundationSections } from "./foundations-sections";

export function FoundationsPage({ route }: { route: Route }) {
  const section = route.query.get("section");
  useEffect(() => {
    if (!section) return;
    // Wait a frame so sections below the fold have laid out.
    const id = requestAnimationFrame(() =>
      document.getElementById(section)?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(id);
  }, [section]);

  // TableOfContents renders `#id` links; under hash routing those would be routes, so clicks
  // are turned into a query update plus a scroll instead.
  const onTocClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest("a");
    const id = anchor?.getAttribute("href")?.slice(1);
    if (!id || !foundationSections.some((entry) => entry.id === id)) return;
    event.preventDefault();
    setQuery({ section: id });
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Page
      wide
      className="max-w-[110rem]"
      title="Foundations"
      description="The theme lab: every token from the generated tokens.json and tokens.css, in both themes, with live WCAG contrast. New tokens appear here automatically; edits to the token sources hot-reload."
    >
      <div className="grid gap-8 xl:grid-cols-[12rem_minmax(0,1fr)]">
        {/* biome-ignore lint/a11y/noStaticElementInteractions: delegates clicks of the TOC's own links. */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: links activate with Enter as clicks. */}
        <div className="hidden xl:block" onClick={onTocClick}>
          <div className="sticky top-20">
            <TableOfContents
              items={foundationSections.map((entry) => ({ id: entry.id, label: entry.title }))}
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-14">
          <SpecimenSection />
          <ContrastSection />
          <ColourRolesSection />
          <BridgeSection />
          <PrimitivesSection />
          <TypographySection />
          <ShapeSection />
          <ElevationSection />
          <MotionSection />
          <LayersSection />
          <DensitySection />
        </div>
      </div>
    </Page>
  );
}

/* ── Specimen ─────────────────────────────────────────────────────────────────────────────── */

function SpecimenSection() {
  const env = useShellFrameEnv();
  return (
    <Section
      id="specimen"
      title="Light and dark specimen"
      description="Qeet and Graphite ramps, the surface hierarchy, the elevation ladder, text roles on every surface, status roles, chart and syntax colours, the focus-ring recipes and control borders — rendered with the real utilities in two isolated documents. Values and ratios are read from computed styles."
    >
      <div className="grid gap-4 2xl:grid-cols-2">
        {(["light", "dark"] as FrameTheme[]).map((theme) => (
          <div key={theme} className="flex min-w-0 flex-col gap-1.5">
            <span className="text-caption font-medium text-muted-foreground capitalize">
              {theme}
            </span>
            <PreviewFrame
              route={{ kind: "specimen" }}
              env={{ ...env, theme, bg: "canvas" }}
              title={`Foundation specimen, ${theme} theme`}
              minHeight={1200}
              className="overflow-hidden rounded-xl border"
            />
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── Contrast ─────────────────────────────────────────────────────────────────────────────── */

type Ref = { label: string; css: string; get: (theme: Theme) => string | undefined };

const json = (path: string): Ref => ({
  label: path.replace(/^color\./, ""),
  css: cssVarFor(path),
  get: (theme) => tokenValue(theme, path),
});

function bridge(name: string): Ref {
  return {
    label: name,
    css: name,
    get: (theme) => bridgeVariables().find((entry) => entry.name === name)?.[theme],
  };
}

/** A colour mixed over another, as CodeBlock paints its surface (`bg-muted/30` on a card). */
function mixed(label: string, top: Ref, percent: number, under: Ref): Ref {
  return {
    label,
    css: `${top.css} ${percent}% over ${under.css}`,
    get: (theme) => {
      const a = top.get(theme);
      const b = under.get(theme);
      return a && b ? `color-mix(in oklab, ${a} ${percent}%, ${b})` : undefined;
    },
  };
}

interface Pair {
  id: string;
  group: string;
  fg: Ref;
  bg: Ref;
  kind: "text" | "non-text";
}

function existing(group: string, keys: readonly string[]) {
  const tree = subtree("light", `color.${group}`) ?? {};
  return keys.filter((key) => key in tree);
}

function buildPairs(): Pair[] {
  const pairs: Pair[] = [];
  const add = (group: string, fg: Ref, bg: Ref, kind: Pair["kind"]) =>
    pairs.push({ id: `${group}:${fg.css}:${bg.css}`, group, fg, bg, kind });

  const surfaces = existing("surface", [
    "canvas",
    "default",
    "elevated",
    "overlay",
    "sunken",
    "subtle",
  ]);
  const texts = existing("text", [
    "primary",
    "secondary",
    "tertiary",
    "link",
    "brand",
    "success",
    "warning",
    "danger",
    "info",
  ]);
  for (const text of texts)
    for (const surface of surfaces)
      add("Text on surfaces", json(`color.text.${text}`), json(`color.surface.${surface}`), "text");
  for (const text of existing("text", ["placeholder", "disabled"]))
    for (const surface of ["canvas", "default"])
      add(
        "Placeholder & disabled",
        json(`color.text.${text}`),
        json(`color.surface.${surface}`),
        "non-text",
      );

  for (const [text, fill] of [
    ["success", "success-subtle"],
    ["warning", "warning-subtle"],
    ["danger", "error-subtle"],
    ["info", "info-subtle"],
  ] as const)
    add(
      "Status text on subtle fills",
      json(`color.text.${text}`),
      json(`color.feedback.${fill}`),
      "text",
    );

  for (const action of existing("action", ["primary", "primary-hover", "primary-active"]))
    add("On-colour text", json("color.text.on-brand"), json(`color.action.${action}`), "text");
  for (const feedback of existing("feedback", ["success", "warning", "error", "info"]))
    add(
      "On-colour text",
      json("color.text.on-feedback"),
      json(`color.feedback.${feedback}`),
      "text",
    );
  add("On-colour text", json("color.text.on-subtle"), json("color.surface.brand-subtle"), "text");
  add("On-colour text", json("color.text.inverse"), json("color.surface.inverse"), "text");

  const bridgeTextPairs = [
    ["--foreground", "--background"],
    ["--card-foreground", "--card"],
    ["--popover-foreground", "--popover"],
    ["--primary-foreground", "--primary"],
    ["--secondary-foreground", "--secondary"],
    ["--muted-foreground", "--muted"],
    ["--muted-foreground", "--background"],
    ["--muted-foreground", "--card"],
    ["--accent-foreground", "--accent"],
    ["--destructive-foreground", "--destructive"],
    ["--success-foreground", "--success"],
    ["--warning-foreground", "--warning"],
    ["--info-foreground", "--info"],
    ["--sidebar-foreground", "--sidebar"],
    ["--sidebar-selected-foreground", "--sidebar-selected"],
  ] as const;
  const known = new Set(bridgeVariables().map((entry) => entry.name));
  for (const [fg, bg] of bridgeTextPairs)
    if (known.has(fg) && known.has(bg)) add("Component bridge", bridge(fg), bridge(bg), "text");

  for (const border of existing("border", [
    "control",
    "control-hover",
    "focused",
    "brand",
    "danger",
  ]))
    for (const surface of ["canvas", "default", "elevated"])
      add(
        "Boundaries (3:1)",
        json(`color.border.${border}`),
        json(`color.surface.${surface}`),
        "non-text",
      );
  for (const surface of ["canvas", "default", "elevated", "overlay", "sunken"])
    add("Focus ring (3:1)", json("color.focus.ring"), json(`color.surface.${surface}`), "non-text");
  for (const [fg, bg] of [
    ["--input", "--background"],
    ["--ring", "--background"],
    ["--ring", "--card"],
    ["--ring", "--popover"],
    ["--primary", "--background"],
    ["--sidebar-indicator", "--sidebar-selected"],
    ["--sidebar-indicator", "--sidebar"],
  ] as const)
    if (known.has(fg) && known.has(bg)) add("Boundaries (3:1)", bridge(fg), bridge(bg), "non-text");

  for (const step of Object.keys(subtree("light", "color.data.categorical") ?? {}))
    add(
      "Chart categorical (3:1)",
      json(`color.data.categorical.${step}`),
      json("color.surface.default"),
      "non-text",
    );

  const codeSurface = mixed("code surface", bridge("--muted"), 30, bridge("--card"));
  for (const role of Object.keys(subtree("light", "color.syntax") ?? {}))
    add("Syntax on code surface", json(`color.syntax.${role}`), codeSurface, "text");
  return pairs;
}

interface PairRow extends Pair {
  light: number | null;
  dark: number | null;
}

function Verdict({ ratio, kind }: { ratio: number | null; kind: Pair["kind"] }) {
  if (ratio === null) return <span className="text-muted-foreground">—</span>;
  const badge = (pass: boolean, label: string) => (
    <Badge variant={pass ? "success" : "destructive"} className="px-1.5 font-mono">
      {label}
      <span className="sr-only">{pass ? " pass" : " fail"}</span>
    </Badge>
  );
  return (
    <span className="flex flex-wrap items-center gap-1">
      <span className="w-14 font-mono text-xs tabular-nums">{formatRatio(ratio)}</span>
      {kind === "text" ? (
        <>
          {badge(ratio >= thresholds.aa, "AA")}
          {badge(ratio >= thresholds.aaLarge, "AA large")}
        </>
      ) : (
        badge(ratio >= thresholds.nonText, "3:1")
      )}
    </span>
  );
}

function PairPreview({ pair }: { pair: Pair }) {
  return (
    <span className="flex gap-1">
      {tokenThemes.map((theme) => {
        const fg = pair.fg.get(theme);
        const bg = pair.bg.get(theme);
        return (
          <span
            key={theme}
            className="flex h-7 w-11 items-center justify-center rounded-md text-xs font-semibold ring-1 ring-foreground/10"
            style={{ backgroundColor: bg, color: pair.kind === "text" ? fg : undefined }}
            title={`${theme}: ${fg} on ${bg}`}
          >
            {pair.kind === "text" ? (
              "Aa"
            ) : (
              <span className="block h-4 w-6 rounded-sm border-2" style={{ borderColor: fg }} />
            )}
          </span>
        );
      })}
    </span>
  );
}

const contrastColumns: ColumnDef<PairRow>[] = [
  {
    id: "preview",
    header: "Light · Dark",
    enableSorting: false,
    cell: ({ row }) => <PairPreview pair={row.original} />,
  },
  {
    id: "pair",
    header: "Pair",
    accessorFn: (row) => `${row.fg.label} on ${row.bg.label}`,
    cell: ({ row }) => (
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">
          {row.original.fg.label} <span className="text-muted-foreground">on</span>{" "}
          {row.original.bg.label}
        </span>
        <code className="font-mono text-micro text-muted-foreground">
          {row.original.fg.css} / {row.original.bg.css}
        </code>
      </span>
    ),
  },
  { accessorKey: "group", header: "Group", filterFn: matchesAny },
  {
    accessorKey: "light",
    header: "Light",
    sortingFn: "basic",
    cell: ({ row }) => <Verdict ratio={row.original.light} kind={row.original.kind} />,
  },
  {
    accessorKey: "dark",
    header: "Dark",
    sortingFn: "basic",
    cell: ({ row }) => <Verdict ratio={row.original.dark} kind={row.original.kind} />,
  },
];

function ContrastSection() {
  const [failingOnly, setFailingOnly] = useState(false);
  const rows = useMemo<PairRow[]>(
    () =>
      buildPairs().map((pair) => {
        const ratio = (theme: Theme) => {
          const fg = pair.fg.get(theme);
          const bg = pair.bg.get(theme);
          return fg && bg ? contrastOf(fg, bg) : null;
        };
        return { ...pair, light: ratio("light"), dark: ratio("dark") };
      }),
    [],
  );
  const min = (row: PairRow) => (row.kind === "text" ? thresholds.aa : thresholds.nonText);
  const failing = rows.filter(
    (row) =>
      (row.light !== null && row.light < min(row)) || (row.dark !== null && row.dark < min(row)),
  );
  const groups = [...new Set(rows.map((row) => row.group))];
  return (
    <Section
      id="contrast"
      title="Contrast audit"
      description={`WCAG 2.x contrast computed with culori from the resolved token values (translucent colours composited over their surface). Text needs 4.5:1 (AA) or 3:1 when large; boundaries, focus indicators and chart marks need 3:1. ${failing.length} of ${rows.length} pairs fall short in at least one theme.`}
      actions={
        <div className="flex items-center gap-2">
          <Switch id="contrast-failing" checked={failingOnly} onCheckedChange={setFailingOnly} />
          <Label htmlFor="contrast-failing">Shortfalls only</Label>
        </div>
      }
    >
      <DataTable
        columns={contrastColumns}
        data={failingOnly ? failing : rows}
        getRowId={(row) => row.id}
        label="Contrast pairs"
        searchPlaceholder="Filter by token…"
        facetedFilters={[
          {
            columnId: "group",
            title: "Group",
            options: groups.map((group) => ({ label: group, value: group })),
          },
        ]}
        enableColumnVisibility={false}
        pageSize={15}
      />
    </Section>
  );
}

/* ── Colour roles ─────────────────────────────────────────────────────────────────────────── */

function SwatchCell({ value }: { value: string | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const colour = isColorValue(value);
  return (
    <span className="flex min-w-0 items-center gap-2">
      {colour && (
        <span className="pg-checker size-7 shrink-0 overflow-hidden rounded-md ring-1 ring-foreground/10">
          <span className="block size-full" style={{ backgroundColor: value }} />
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <code className="truncate font-mono text-micro" title={value}>
          {value}
        </code>
        {colour && (
          <span className="font-mono text-micro text-muted-foreground">{hexOf(value)}</span>
        )}
      </span>
    </span>
  );
}

function TokenTable({
  rows,
}: {
  rows: { name: string; css: string; light?: string; dark?: string }[];
}) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[34%]">Token</TableHead>
          <TableHead>Light</TableHead>
          <TableHead>Dark</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.css}>
            <TableCell className="whitespace-normal">
              <span className="flex flex-col">
                <span className="font-medium">{row.name}</span>
                <code className="font-mono text-micro text-muted-foreground break-all">
                  {row.css}
                </code>
              </span>
            </TableCell>
            <TableCell className="overflow-hidden">
              <SwatchCell value={row.light} />
            </TableCell>
            <TableCell className="overflow-hidden">
              <SwatchCell value={row.dark} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ColourRolesSection() {
  const groups = presentSemanticGroups();
  return (
    <Section
      id="colour"
      title="Colour roles"
      description="Semantic colour roles from tokens.json, grouped. These are the --qx-color-* variables components and the theme utilities resolve to."
    >
      <div className="grid gap-4 2xl:grid-cols-2">
        {groups.map((group) => {
          const items = leaves(subtree("light", `color.${group}`));
          return (
            <Card key={group} size="sm">
              <CardContent className="flex flex-col gap-2">
                <h3 className="font-heading text-sm font-semibold capitalize">
                  {group}{" "}
                  <span className="font-normal text-muted-foreground">· {items.length}</span>
                </h3>
                <TokenTable
                  rows={items.map((item) => {
                    const path = `color.${group}.${item.path.join(".")}`;
                    return {
                      name: item.path.join("."),
                      css: cssVarFor(path),
                      light: tokenValue("light", path),
                      dark: tokenValue("dark", path),
                    };
                  })}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}

function BridgeSection() {
  const variables = bridgeVariables();
  return (
    <Section
      id="bridge"
      title="Component bridge variables"
      description="The shadcn-contract variables (bg-primary, text-muted-foreground, border-input…) as generated in tokens.css — what most component utilities resolve through."
    >
      <Card size="sm">
        <CardContent>
          <TokenTable
            rows={variables.map((variable) => ({
              name: variable.name.slice(2),
              css: variable.name,
              light: variable.light,
              dark: variable.dark,
            }))}
          />
        </CardContent>
      </Card>
    </Section>
  );
}

function PrimitivesSection() {
  const groups = primitiveColorGroups();
  return (
    <Section
      id="primitives"
      title="Primitive ramps"
      description="Raw palettes (tokens.raw.css). Semantic roles alias into these; components never use them directly."
    >
      <div className="flex flex-col gap-5">
        {groups.map((group) => {
          const steps = leaves(subtree("light", `color.${group}`));
          const darkDiffers = steps.some(
            (step) => tokenValue("dark", `color.${group}.${step.path.join(".")}`) !== step.value,
          );
          return (
            <div key={group} className="flex flex-col gap-2">
              <h3 className="flex items-baseline gap-2 font-heading text-sm font-semibold">
                {group}
                <code className="font-mono text-micro font-normal text-muted-foreground">
                  {cssVarFor(["color", group])}-*
                </code>
                {darkDiffers && <Badge variant="warning">differs in dark</Badge>}
              </h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5">
                {steps.map((step) => (
                  <div key={step.path.join(".")} className="flex flex-col gap-1">
                    <span className="pg-checker h-10 overflow-hidden rounded-md ring-1 ring-foreground/10">
                      <span
                        className="block size-full"
                        style={{ backgroundColor: step.value }}
                        title={step.value}
                      />
                    </span>
                    <span className="font-mono text-micro text-muted-foreground">
                      {step.path.join(".")} · {hexOf(step.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ── Typography ───────────────────────────────────────────────────────────────────────────── */

const specimenText: Record<string, string> = {
  display: "Identity for India's builders",
  title: "Invoices · October 2026",
  heading: "Passkeys are now required for admins",
  body: "Acme India's GSTR-1 for September was filed on 11 Oct. Collections of ₹62,10,000 settled to HDFC ••4821.",
  label: "Work email",
  "label-compact": "Last active",
  caption: "Updated 4 minutes ago · ap-south-1",
  micro: "BETA · 3 SEATS LEFT",
  code: 'qeet.invoices.create({ currency: "INR", gstin: "29AAACA1234F1Z5" })',
};

function TypographySection() {
  const roles = Object.entries(subtree("light", "typography") ?? {});
  const families = Object.entries(subtree("light", "font.family") ?? {});
  const weights = Object.entries(subtree("light", "font.weight") ?? {});
  return (
    <Section
      id="typography"
      title="Typography"
      description="Semantic type roles (text-display … text-code) and the four Qeet families. Every sample is styled from its token values."
    >
      <div className="flex flex-col gap-6">
        <Card size="sm">
          <CardContent className="flex flex-col divide-y">
            {roles.map(([role, value]) => {
              const props = typeof value === "object" ? value : {};
              const get = (key: string) => String(props[key] ?? "");
              return (
                <div
                  key={role}
                  className="grid gap-2 py-4 first:pt-1 last:pb-1 lg:grid-cols-[13rem_minmax(0,1fr)]"
                >
                  <div className="flex flex-col gap-0.5">
                    <code className="font-mono text-xs font-medium">text-{role}</code>
                    <span className="text-caption text-muted-foreground">
                      {get("font-size")} / {get("line-height")} · {get("font-weight")}
                      {get("letter-spacing") && get("letter-spacing") !== "0em"
                        ? ` · ${get("letter-spacing")}`
                        : ""}
                    </span>
                    <span
                      className="truncate text-caption text-muted-foreground"
                      title={get("font-family")}
                    >
                      {get("font-family").split(",")[0]?.replaceAll('"', "")}
                    </span>
                  </div>
                  <p
                    className="min-w-0 text-foreground [overflow-wrap:anywhere]"
                    style={{
                      fontFamily: get("font-family"),
                      fontSize: get("font-size"),
                      fontWeight: get("font-weight"),
                      lineHeight: get("line-height"),
                      letterSpacing: get("letter-spacing"),
                    }}
                  >
                    {specimenText[role] ?? `The ${role} role`}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          {families.map(([name, stack]) => (
            <Card key={name} size="sm">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-heading text-sm font-semibold">
                    {String(stack).split(",")[0]?.replaceAll('"', "")}
                  </h3>
                  <code className="font-mono text-micro text-muted-foreground">
                    font.family.{name}
                  </code>
                </div>
                <p className="text-3xl text-foreground" style={{ fontFamily: String(stack) }}>
                  {name === "indic" ? "नमस्ते · வணக்கம் · నమస్కారం" : "Aa Qq ₹ 0123456789"}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {weights.map(([weightName, weight]) => (
                    <span
                      key={weightName}
                      className="text-sm text-foreground"
                      style={{ fontFamily: String(stack), fontWeight: Number(weight) }}
                    >
                      {weightName} {String(weight)}
                    </span>
                  ))}
                </div>
                <code
                  className="truncate font-mono text-micro text-muted-foreground"
                  title={String(stack)}
                >
                  {String(stack)}
                </code>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ── Shape ────────────────────────────────────────────────────────────────────────────────── */

function ShapeSection() {
  const groups: [string, string][] = [
    ["radii", "Radius scale"],
    ["corner", "Corner roles"],
  ];
  const tailwind = [
    "rounded-sm",
    "rounded-md",
    "rounded-lg",
    "rounded-xl",
    "rounded-2xl",
    "rounded-3xl",
    "rounded-4xl",
  ];
  return (
    <Section
      id="shape"
      title="Radii and corners"
      description="The radius scale, the corner roles components use (control, field, chip, surface, overlay), and the Tailwind steps derived from --radius."
    >
      <div className="flex flex-col gap-5">
        {groups.map(([group, title]) => (
          <div key={group} className="flex flex-col gap-2">
            <h3 className="font-heading text-sm font-semibold">{title}</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-3">
              {leaves(subtree("light", group)).map((leaf) => (
                <div key={leaf.path.join(".")} className="flex flex-col gap-1.5">
                  <div
                    className="h-16 border-2 border-border-strong bg-surface-subtle"
                    style={{ borderRadius: leaf.value }}
                  />
                  <code className="font-mono text-micro text-foreground">
                    {leaf.path.join(".")}
                  </code>
                  <code
                    className="truncate font-mono text-micro text-muted-foreground"
                    title={leaf.value}
                  >
                    {leaf.value}
                  </code>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-col gap-2">
          <h3 className="font-heading text-sm font-semibold">Tailwind radius utilities</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-3">
            {tailwind.map((utility) => (
              <div key={utility} className="flex flex-col gap-1.5">
                <div
                  className={`h-16 border-2 border-border-strong bg-surface-subtle ${utility}`}
                />
                <code className="font-mono text-micro text-foreground">{utility}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ── Elevation ────────────────────────────────────────────────────────────────────────────── */

function ElevationSection() {
  const steps = leaves(subtree("light", "elevation")).filter((leaf) => leaf.path[0] !== "ramp");
  const ramp = leaves(subtree("light", "elevation.ramp"));
  return (
    <Section
      id="elevation"
      title="Elevation"
      description="Every elevation role in both themes, painted on that theme's canvas with its own surface — dark has its own shadows."
    >
      <div className="grid gap-4 2xl:grid-cols-2">
        {tokenThemes.map((theme) => (
          <div
            key={theme}
            className="flex flex-col gap-3 rounded-xl p-5 ring-1 ring-border"
            style={{ backgroundColor: tokenValue(theme, "color.surface.canvas") }}
          >
            <span
              className="text-caption font-medium capitalize"
              style={{ color: tokenValue(theme, "color.text.secondary") }}
            >
              {theme}
            </span>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              {[...steps, ...ramp.map((leaf) => ({ ...leaf, path: ["ramp", ...leaf.path] }))].map(
                (leaf) => {
                  const path = `elevation.${leaf.path.join(".")}`;
                  return (
                    <div
                      key={path}
                      className="flex h-20 flex-col justify-end rounded-lg p-2.5"
                      style={{
                        backgroundColor: tokenValue(theme, "color.surface.default"),
                        boxShadow: tokenValue(theme, path),
                        color: tokenValue(theme, "color.text.primary"),
                      }}
                      title={tokenValue(theme, path)}
                    >
                      <code className="font-mono text-micro">{leaf.path.join(".")}</code>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── Motion ───────────────────────────────────────────────────────────────────────────────── */

function MotionSection() {
  const [played, setPlayed] = useState(false);
  const durations = leaves(subtree("light", "motion.duration"));
  const easings = leaves(subtree("light", "motion.easing"));
  const normal = tokenValue("light", "motion.duration.normal") ?? "200ms";
  const slow = tokenValue("light", "motion.duration.deliberate") ?? "400ms";
  const standard = tokenValue("light", "motion.easing.standard") ?? "ease";
  const track = (key: string, duration: string, easing: string, label: string, value: string) => (
    <div key={key} className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-3">
      <span className="flex flex-col">
        <code className="font-mono text-xs">{label}</code>
        <code className="truncate font-mono text-micro text-muted-foreground" title={value}>
          {value}
        </code>
      </span>
      <div className="relative h-8 rounded-full bg-surface-sunken">
        <span
          className="absolute top-1 size-6 rounded-full bg-primary shadow-rest"
          style={{
            insetInlineStart: played ? "calc(100% - 1.75rem)" : "0.25rem",
            transitionProperty: "inset-inline-start",
            transitionDuration: duration,
            transitionTimingFunction: easing,
          }}
        />
      </div>
    </div>
  );
  return (
    <Section
      id="motion"
      title="Motion"
      description="Durations (with the standard easing) and easings (over the deliberate duration). Under prefers-reduced-motion the base layer collapses every transition to the reduced duration, so the dots jump."
      actions={
        <Button variant="outline" size="sm" onClick={() => setPlayed((value) => !value)}>
          {played ? (
            <RotateCcwIcon data-icon="inline-start" aria-hidden />
          ) : (
            <PlayIcon data-icon="inline-start" aria-hidden />
          )}
          {played ? "Reset" : "Play"}
        </Button>
      }
    >
      <Card size="sm">
        <CardContent className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="font-heading text-sm font-semibold">Durations</h3>
            {durations.map((leaf) =>
              track(
                `d-${leaf.path.join(".")}`,
                leaf.value,
                standard,
                leaf.path.join("."),
                leaf.value,
              ),
            )}
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-heading text-sm font-semibold">Easings</h3>
            {easings.map((leaf) =>
              track(`e-${leaf.path.join(".")}`, slow, leaf.value, leaf.path.join("."), leaf.value),
            )}
          </div>
          <p className="text-caption text-muted-foreground lg:col-span-2">
            Reduced-motion duration:{" "}
            <code className="font-mono">
              {tokenValue("light", "motion.reduced.duration") ?? "—"}
            </code>{" "}
            · normal duration <code className="font-mono">{normal}</code>.
          </p>
        </CardContent>
      </Card>
    </Section>
  );
}

/* ── Layers ───────────────────────────────────────────────────────────────────────────────── */

function LayersSection() {
  const layers = leaves(subtree("light", "z"))
    .map((leaf) => ({ name: leaf.path.join("."), value: Number(leaf.value) }))
    .sort((a, b) => a.value - b.value);
  const max = Math.max(
    ...layers.filter((layer) => layer.value < 9000).map((layer) => layer.value),
    1,
  );
  return (
    <Section
      id="layers"
      title="Z-index ladder"
      description="Stacking order for overlays, from dropdowns to the skip link. Every overlay component reads its layer from these variables."
    >
      <Card size="sm">
        <CardContent className="flex flex-col gap-1.5">
          {layers.map((layer) => (
            <div
              key={layer.name}
              className="grid grid-cols-[10rem_4rem_minmax(0,1fr)] items-center gap-3"
            >
              <code className="font-mono text-xs">{cssVarFor(["z", layer.name])}</code>
              <span className="text-end font-mono text-xs tabular-nums text-muted-foreground">
                {layer.value}
              </span>
              <span className="h-2 rounded-full bg-brand-subtle">
                <span
                  className="block h-full rounded-full bg-sidebar-indicator"
                  style={{ width: `${Math.min(100, (layer.value / max) * 100)}%` }}
                />
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </Section>
  );
}

/* ── Density ──────────────────────────────────────────────────────────────────────────────── */

function DensitySection() {
  const metrics = Object.entries(subtree("light", "density") ?? {});
  const modes = [
    ...new Set(
      metrics.flatMap(([, value]) => (typeof value === "object" ? Object.keys(value) : [])),
    ),
  ];
  return (
    <Section
      id="density"
      title="Density"
      description="Control metrics per density mode. `default` is what a consumer gets with no DensityProvider; the samples below each sit in their own subtree provider."
    >
      <div className="flex flex-col gap-4">
        <Card size="sm">
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  {modes.map((mode) => (
                    <TableHead key={mode} className="capitalize">
                      {mode}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map(([metric, value]) => (
                  <TableRow key={metric}>
                    <TableCell>
                      <code className="font-mono text-xs">{cssVarFor(["density", metric])}</code>
                    </TableCell>
                    {modes.map((mode) => (
                      <TableCell key={mode} className="font-mono text-xs tabular-nums">
                        {typeof value === "object" ? String(value[mode] ?? "—") : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          {(["comfortable", "compact"] as const).map((density) => (
            <DensityProvider key={density} density={density}>
              <Card size="sm">
                <CardContent className="flex flex-col gap-3">
                  <h3 className="font-heading text-sm font-semibold capitalize">{density}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      aria-label={`Search users (${density})`}
                      placeholder="Search users…"
                      className="w-52"
                    />
                    <Button>Invite member</Button>
                    <Button variant="outline">Export</Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-end">Last active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Rohan Mehta</TableCell>
                        <TableCell>Admin</TableCell>
                        <TableCell className="text-end">12 min ago</TableCell>
                      </TableRow>
                      <TableRow data-state="selected">
                        <TableCell>Priya Nair</TableCell>
                        <TableCell>Developer</TableCell>
                        <TableCell className="text-end">38 min ago</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </DensityProvider>
          ))}
        </div>
      </div>
    </Section>
  );
}
