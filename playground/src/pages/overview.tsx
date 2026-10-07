import {
  AccessibilityIcon,
  ArrowRightIcon,
  BlocksIcon,
  FlaskConicalIcon,
  PaletteIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "@qeetrix/icons";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  type ChartConfig,
  ChartDataTable,
  type ColumnDef,
  DataTable,
  DonutChart,
  Meter,
  Stat,
  StatusPill,
} from "@qeetrix/ui";
import {
  type Audit,
  auditLabel,
  auditOrder,
  type CapabilityKey,
  capabilityCovered,
  capabilityLabels,
  components,
  type Family,
  families,
  manifest,
  type Status,
  statusOrder,
} from "../lib/manifest";
import { href } from "../lib/router";
import { Page, Section } from "../shell/page";

const statusColor: Record<Status, string> = {
  stable: "var(--success)",
  beta: "var(--warning)",
  experimental: "var(--info)",
  deprecated: "var(--destructive)",
};

const statusConfig = Object.fromEntries(
  statusOrder.map((status) => [status, { label: titleCase(status), color: statusColor[status] }]),
) satisfies ChartConfig;

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function count<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  return items.reduce((total, item) => (predicate(item) ? total + 1 : total), 0);
}

const statusData = statusOrder
  .map((status) => ({ status, modules: count(components, (c) => c.status === status) }))
  .filter((row) => row.modules > 0);

const dimensionKeys = Object.keys(components[0]?.accessibility.dimensions ?? {});
const dimensionLabels: Record<string, string> = {
  semantic: "Semantics",
  name: "Accessible name",
  keyboard: "Keyboard",
  focus: "Focus",
  screenReader: "Screen reader",
  rtl: "RTL",
  reducedMotion: "Reduced motion",
  forcedColors: "Forced colours",
  contrast: "Contrast",
};

const testingKeys = ["unit", "accessibility", "interaction", "visual", "hydration"] as const;

const familyColumns: ColumnDef<Family>[] = [
  {
    accessorKey: "name",
    header: "Family",
    cell: ({ row }) => (
      <a
        className="font-medium text-foreground underline-offset-4 hover:underline"
        href={href("/components", { family: row.original.name })}
      >
        {row.original.name}
      </a>
    ),
  },
  {
    id: "modules",
    header: "Modules",
    accessorFn: (family) => family.modules.map((module) => module.name).join(" "),
    cell: ({ row }) => (
      <div className="flex max-w-xl flex-wrap gap-1.5 whitespace-normal">
        {row.original.modules.map((module) => (
          <a
            key={module.slug}
            href={`#/components/${module.slug}`}
            className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-foreground outline-none hover:bg-surface-interactive-hover focus-visible:focus-ring"
          >
            {module.name}
          </a>
        ))}
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (family) => family.modules.map((module) => module.status).join(","),
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {statusOrder
          .map((status) => ({
            status,
            n: count(row.original.modules, (module) => module.status === status),
          }))
          .filter((entry) => entry.n > 0)
          .map((entry) => (
            <StatusPill
              key={entry.status}
              kind={
                entry.status === "stable"
                  ? "success"
                  : entry.status === "deprecated"
                    ? "danger"
                    : "warning"
              }
            >
              {entry.n} {entry.status}
            </StatusPill>
          ))}
      </div>
    ),
  },
  {
    id: "audited",
    header: "Audited",
    accessorFn: (family) =>
      count(family.modules, (module) => module.accessibility.audit === "audited"),
    cell: ({ getValue, row }) => (
      <span className="tabular-nums text-muted-foreground">
        {String(getValue())}/{row.original.modules.length}
      </span>
    ),
  },
];

export function OverviewPage() {
  const total = components.length;
  const audited = count(components, (c) => c.accessibility.audit === "audited");
  const partial = count(components, (c) => c.accessibility.audit === "partial");
  const deprecated = components.filter((c) => c.status === "deprecated");
  const densityUnknown = components.filter((c) => c.capabilities.density === "unknown");
  return (
    <Page
      title="Qeetrix UI"
      description={`${manifest.description} ${manifest.name} ${manifest.version} — ${total} modules in ${families.length} families, manifest schema v${manifest.schemaVersion} generated ${manifest.generated}.`}
      actions={
        <>
          <Button render={<a href="#/components" />} nativeButton={false}>
            <BlocksIcon data-icon="inline-start" aria-hidden />
            Browse components
          </Button>
          <Button variant="outline" render={<a href="#/foundations" />} nativeButton={false}>
            <PaletteIcon data-icon="inline-start" aria-hidden />
            Theme lab
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Modules"
          value={total}
          hint={`${families.length} families`}
          icon={BlocksIcon}
        />
        <Stat
          label="Stable"
          value={count(components, (c) => c.status === "stable")}
          hint={`${Math.round((count(components, (c) => c.status === "stable") / total) * 100)}% of modules`}
          icon={ShieldCheckIcon}
        />
        <Stat
          label="Beta"
          value={count(components, (c) => c.status === "beta")}
          hint="API may still change"
          icon={FlaskConicalIcon}
        />
        <Stat
          label="Deprecated"
          value={deprecated.length}
          hint="with a named replacement"
          icon={TriangleAlertIcon}
        />
        <Stat
          label="A11y audited"
          value={`${audited}/${total}`}
          hint={`${partial} partially audited`}
          icon={AccessibilityIcon}
        />
        <Stat
          label="Unit tested"
          value={`${count(components, (c) => c.testing.unit)}/${total}`}
          hint={`${count(components, (c) => c.testing.visual)} with visual tests`}
          icon={FlaskConicalIcon}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Release status</CardTitle>
            <CardDescription>Lifecycle of every module in the manifest.</CardDescription>
          </CardHeader>
          <CardContent className="grid items-center gap-6 sm:grid-cols-[minmax(0,14rem)_1fr]">
            <DonutChart
              data={statusData}
              config={statusConfig}
              dataKey="modules"
              nameKey="status"
              className="mx-auto w-full max-w-56"
              accessibleTitle="Modules by release status"
              accessibleSummary={statusData.map((row) => `${row.modules} ${row.status}`).join(", ")}
              accessibilityTable={
                <ChartDataTable
                  caption="Modules by release status"
                  data={statusData}
                  columns={[
                    { key: "status", header: "Status" },
                    { key: "modules", header: "Modules" },
                  ]}
                />
              }
            />
            <ul className="flex flex-col gap-2">
              {statusData.map((row) => (
                <li key={row.status}>
                  <a
                    href={href("/components", { status: row.status })}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-surface-interactive focus-visible:focus-ring"
                  >
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: statusColor[row.status] }}
                    />
                    <span className="flex-1 capitalize">{row.status}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {row.modules} · {Math.round((row.modules / total) * 100)}%
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accessibility audit</CardTitle>
            <CardDescription>
              Audit status, and pass rate per dimension where the dimension applies.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              {auditOrder.map((audit: Audit) => (
                <a
                  key={audit}
                  href={href("/components", { audit })}
                  className="outline-none focus-visible:focus-ring rounded-md"
                >
                  <Badge
                    variant={
                      audit === "audited"
                        ? "success"
                        : audit === "partial"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {auditLabel[audit]} ·{" "}
                    {count(components, (c) => c.accessibility.audit === audit)}
                  </Badge>
                </a>
              ))}
            </div>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {dimensionKeys.map((key) => {
                const applicable = components.filter(
                  (c) => c.accessibility.dimensions[key] !== "not-applicable",
                );
                const pass = count(applicable, (c) => c.accessibility.dimensions[key] === "pass");
                return (
                  <Meter
                    key={key}
                    label={dimensionLabels[key] ?? key}
                    value={pass}
                    max={Math.max(applicable.length, 1)}
                    intent={pass / Math.max(applicable.length, 1) > 0.6 ? "success" : "warning"}
                    aria-valuetext={`${pass} of ${applicable.length} pass`}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Capability coverage</CardTitle>
            <CardDescription>
              Supported share of the modules where each capability applies. SSR counts server-safe
              modules; the rest are client boundaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {(Object.keys(capabilityLabels) as CapabilityKey[]).map((key) => {
              const applicable = components.filter((c) => c.capabilities[key] !== "not-applicable");
              const covered = count(applicable, (c) => capabilityCovered(key, c.capabilities[key]));
              const values = [...new Set(components.map((c) => c.capabilities[key]))].sort();
              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <Meter
                    label={
                      <a
                        className="underline-offset-4 hover:underline"
                        href={href("/components", { cap: key })}
                      >
                        {capabilityLabels[key]}
                      </a>
                    }
                    value={covered}
                    max={Math.max(applicable.length, 1)}
                    hideValue
                    intent={covered === applicable.length ? "success" : "default"}
                    aria-valuetext={`${covered} of ${applicable.length}`}
                  />
                  <p className="text-caption text-muted-foreground">
                    {values
                      .map(
                        (value) =>
                          `${count(components, (c) => c.capabilities[key] === value)} ${value}`,
                      )
                      .join(" · ")}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test coverage</CardTitle>
            <CardDescription>Test kinds recorded for each module in the manifest.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {testingKeys.map((key) => {
              const n = count(components, (c) => c.testing[key]);
              return (
                <Meter
                  key={key}
                  label={titleCase(key)}
                  value={n}
                  max={total}
                  intent={n === total ? "success" : "default"}
                  aria-valuetext={`${n} of ${total}`}
                />
              );
            })}
            <p className="text-caption text-muted-foreground">
              {count(components, (c) => c.story)} modules have stories in qeetrix-story.
            </p>
          </CardContent>
        </Card>
      </div>

      {(deprecated.length > 0 || densityUnknown.length > 0) && (
        <Section title="Needs attention" description="Straight from the manifest.">
          <div className="grid gap-3 lg:grid-cols-2">
            {deprecated.map((component) => (
              <Callout
                key={component.slug}
                variant="warning"
                title={`${component.name} is deprecated`}
              >
                {component.deprecation?.reason}{" "}
                {component.deprecation?.migration && (
                  <span className="text-muted-foreground">{component.deprecation.migration}</span>
                )}{" "}
                <a
                  className="font-medium underline underline-offset-4"
                  href={`#/components/${component.slug}`}
                >
                  Inspect
                </a>
              </Callout>
            ))}
            {densityUnknown.length > 0 && (
              <Callout variant="info" title="Density support not yet classified">
                {densityUnknown.map((component, index) => (
                  <span key={component.slug}>
                    {index > 0 && ", "}
                    <a
                      className="underline underline-offset-4"
                      href={`#/components/${component.slug}`}
                    >
                      {component.name}
                    </a>
                  </span>
                ))}{" "}
                report <code className="font-mono text-xs">density: "unknown"</code>.
              </Callout>
            )}
          </div>
        </Section>
      )}

      <Section
        title="Families"
        description="Every family and its modules. Search filters by family or module name."
        actions={
          <Button variant="ghost" size="sm" render={<a href="#/components" />} nativeButton={false}>
            Open the gallery
            <ArrowRightIcon data-icon="inline-end" aria-hidden className="rtl:rotate-180" />
          </Button>
        }
      >
        <DataTable
          columns={familyColumns}
          data={[...families]}
          getRowId={(family) => family.name}
          label="Component families"
          searchPlaceholder="Filter families or modules…"
          enableColumnVisibility={false}
          pageSize={12}
        />
      </Section>
    </Page>
  );
}
