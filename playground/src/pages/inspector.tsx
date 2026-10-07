import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ExternalLinkIcon,
  MinusIcon,
  RotateCcwIcon,
  SearchXIcon,
} from "@qeetrix/icons";
import {
  Badge,
  Button,
  buttonVariants,
  Callout,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CodeBlock,
  CopyButton,
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
  EmptyState,
  Kbd,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  type StatusKind,
  StatusPill,
  Tabs,
  TabsList,
  TabsTrigger,
  Toggle,
  ToggleGroup,
} from "@qeetrix/ui";
import { Suspense } from "react";
import { importsFor } from "../lib/code";
import {
  defaultFrameEnv,
  type FrameBackground,
  type FrameDensity,
  type FrameDirection,
  type FrameEnv,
  type FrameMotion,
  type FrameTheme,
  frameHash,
} from "../lib/frame";
import {
  auditLabel,
  type CapabilityKey,
  capabilityLabels,
  componentBySlug,
  components,
  type DimensionResult,
  type ManifestComponent,
  statusBadge,
} from "../lib/manifest";
import { href, oneOf, type Route, setQuery } from "../lib/router";
import { useModuleExamples } from "../registry";
import { defaultValues, type ModuleExamples } from "../registry/types";
import { ControlsPanel, queryPatchFor, valuesFromQuery } from "../shell/controls";
import { useShellFrameEnv, useShellSettings } from "../shell/environment";
import { ExampleBoundary } from "../shell/error-boundary";
import { Page } from "../shell/page";
import { PreviewFrame } from "../shell/preview-frame";

type ThemeMode = "split" | "shell" | FrameTheme;

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

const resultKind: Record<DimensionResult, StatusKind> = {
  pass: "success",
  partial: "warning",
  fail: "danger",
  "not-audited": "muted",
  "not-applicable": "neutral",
};

export function InspectorPage({ route }: { route: Route }) {
  const component = route.id ? componentBySlug.get(route.id) : undefined;
  if (!component) {
    return (
      <EmptyState
        className="py-24"
        icon={SearchXIcon}
        title={`No module called “${route.id}”`}
        description="It is not in component-manifest.json. It may have been renamed or removed."
        action={
          <Button variant="outline" render={<a href="#/components" />} nativeButton={false}>
            Browse all components
          </Button>
        }
      />
    );
  }
  return (
    <ExampleBoundary label={`${component.name} examples`}>
      <Suspense fallback={<InspectorSkeleton />}>
        <Inspector component={component} route={route} />
      </Suspense>
    </ExampleBoundary>
  );
}

function InspectorSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 md:p-8" aria-hidden>
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

function Inspector({ component, route }: { component: ManifestComponent; route: Route }) {
  const examples = useModuleExamples(component.slug);
  const shellEnv = useShellFrameEnv();
  const { density: shellDensity, dir: shellDir } = useShellSettings();
  const query = route.query;
  const index = components.findIndex((entry) => entry.slug === component.slug);
  const previous = components[index - 1];
  const next = components[index + 1];

  const view = oneOf(query.get("view"), ["playground", "demos"], "playground");
  const themeMode = oneOf<ThemeMode>(
    query.get("theme"),
    ["split", "shell", "light", "dark"],
    "split",
  );
  const env: FrameEnv = {
    theme: shellEnv.theme,
    density: oneOf<FrameDensity>(query.get("density"), ["comfortable", "compact"], shellDensity),
    dir: oneOf<FrameDirection>(query.get("dir"), ["ltr", "rtl"], shellDir),
    motion: oneOf<FrameMotion>(query.get("motion"), ["full", "reduce"], "full"),
    bg: oneOf<FrameBackground>(query.get("bg"), ["canvas", "card", "sunken"], defaultFrameEnv.bg),
  };
  const themes: FrameTheme[] =
    themeMode === "split"
      ? ["light", "dark"]
      : themeMode === "shell"
        ? [shellEnv.theme]
        : [themeMode];

  if (!examples) {
    return (
      <Page title={component.name} description="This module has no playground examples yet.">
        <Callout variant="warning" title="Missing examples">
          Add an entry for <code className="font-mono">{component.slug}</code> to{" "}
          <code className="font-mono">playground/src/examples/</code>.
        </Callout>
      </Page>
    );
  }

  const controls = examples.playground.controls;
  const values = valuesFromQuery(controls, query);
  const code = examples.playground.code(values);
  const snippet = `${importsFor(code)}\n\n${code}`;
  const frameRoute = { kind: "module" as const, slug: component.slug, view, values };

  return (
    <Page
      wide
      className="max-w-[110rem]"
      eyebrow={
        <span className="font-mono">
          {component.category} · {component.slug}
        </span>
      }
      title={
        <span className="inline-flex flex-wrap items-center gap-3">
          {component.name}
          <Badge variant={statusBadge[component.status]} className="capitalize">
            {component.status}
          </Badge>
        </span>
      }
      description={
        <>
          {/* The import line comes from the snippet's real exports: a few manifest names
              (QrCode, OtpInput, Clipboard…) are module names, not exported identifiers. */}
          <code className="font-mono text-xs">
            {importsFor(examples.playground.code(defaultValues(controls)))
              .split("\n")
              .at(-1)}
          </code>
          {component.accessibility.pattern !== "none" && (
            <> · WAI-ARIA {component.accessibility.pattern} pattern</>
          )}
        </>
      }
      actions={
        <>
          <StepLink target={previous} direction="previous" />
          <StepLink target={next} direction="next" />
        </>
      }
    >
      {component.deprecation && (
        <Callout variant="warning" title={`Deprecated since ${component.deprecation.since}`}>
          {component.deprecation.reason}{" "}
          {component.deprecation.replacement && (
            <>
              Use{" "}
              <a
                className="font-medium underline underline-offset-4"
                href={`#/components/${components.find((entry) => entry.name === component.deprecation?.replacement)?.slug ?? ""}`}
              >
                {component.deprecation.replacement}
              </a>{" "}
              instead.
            </>
          )}{" "}
          {component.deprecation.migration}
        </Callout>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="overflow-visible">
            <CardHeader className="border-b">
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Rendered in{" "}
                {themes.length === 2 ? "two isolated documents" : "an isolated document"}, as a
                consumer app would set it up.
              </CardDescription>
              <CardAction>
                <Button
                  variant="ghost"
                  size="sm"
                  render={
                    <a
                      href={`${window.location.pathname}${frameHash(frameRoute, { ...env, theme: themes[0] ?? "light" })}`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                  nativeButton={false}
                >
                  <ExternalLinkIcon data-icon="inline-start" aria-hidden />
                  Open frame
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <RenderToggles view={view} themeMode={themeMode} env={env} />
              <div className={themes.length === 2 ? "grid gap-4 2xl:grid-cols-2" : "grid"}>
                {themes.map((theme) => (
                  <div key={theme} className="flex min-w-0 flex-col gap-1.5">
                    {themes.length === 2 && (
                      <span className="text-caption font-medium text-muted-foreground capitalize">
                        {theme}
                      </span>
                    )}
                    <PreviewFrame
                      route={frameRoute}
                      env={{ ...env, theme }}
                      title={`${component.name} preview, ${theme} theme`}
                      minHeight={view === "playground" ? 320 : 240}
                      className="overflow-hidden rounded-lg border shadow-inset-subtle"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Code</CardTitle>
              <CardDescription>
                The JSX for the current configuration. Props at their default are omitted.
              </CardDescription>
              <CardAction>
                <CopyButton value={snippet} label="Copy JSX" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <CodeBlock value={snippet} language="text" copy={false} maxHeight="max-h-[28rem]" />
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Props</CardTitle>
              <CardDescription>Drive the preview; the URL keeps the configuration.</CardDescription>
              <CardAction>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setQuery(
                      Object.fromEntries(Object.keys(controls).map((name) => [`p.${name}`, null])),
                    )
                  }
                >
                  <RotateCcwIcon data-icon="inline-start" aria-hidden />
                  Reset
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ControlsPanel
                controls={controls}
                values={values}
                onChange={(name, value) => {
                  const control = controls[name];
                  if (control) setQuery(queryPatchFor(name, control, value));
                }}
              />
            </CardContent>
          </Card>
          <MetadataCard component={component} examples={examples} />
        </div>
      </div>
    </Page>
  );
}

/** Previous/next module: a real link styled as an outline button, or a disabled button at the ends. */
function StepLink({
  target,
  direction,
}: {
  target: ManifestComponent | undefined;
  direction: "previous" | "next";
}) {
  const Icon = direction === "previous" ? ArrowLeftIcon : ArrowRightIcon;
  const label = direction === "previous" ? "Previous" : "Next";
  const content = (
    <>
      {direction === "previous" && <Icon aria-hidden className="rtl:rotate-180" />}
      <span className="hidden sm:inline">{target?.name ?? label}</span>
      {direction === "next" && <Icon aria-hidden className="rtl:rotate-180" />}
    </>
  );
  if (!target) {
    return (
      <Button variant="outline" size="sm" disabled aria-label={`No ${label.toLowerCase()} module`}>
        {content}
      </Button>
    );
  }
  return (
    <a
      href={`#/components/${target.slug}`}
      aria-label={`${label}: ${target.name}`}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      {content}
    </a>
  );
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-micro font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function RenderToggles({
  view,
  themeMode,
  env,
}: {
  view: "playground" | "demos";
  themeMode: ThemeMode;
  env: FrameEnv;
}) {
  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
      <Tabs
        value={view}
        onValueChange={(value) => setQuery({ view: value === "playground" ? null : String(value) })}
      >
        <TabsList aria-label="Preview content">
          <TabsTrigger value="playground">Playground</TabsTrigger>
          <TabsTrigger value="demos">All demos</TabsTrigger>
        </TabsList>
      </Tabs>
      <SettingGroup label="Theme">
        <ToggleGroup
          aria-label="Preview theme"
          value={[themeMode]}
          onValueChange={(next) => {
            const value = next[0];
            if (value) setQuery({ theme: value === "split" ? null : value });
          }}
          className="rounded-lg border border-border p-0.5"
        >
          <Toggle value="split" size="sm" className="px-2 text-xs">
            Light + dark
          </Toggle>
          <Toggle value="light" size="sm" className="px-2 text-xs">
            Light
          </Toggle>
          <Toggle value="dark" size="sm" className="px-2 text-xs">
            Dark
          </Toggle>
          <Toggle value="shell" size="sm" className="px-2 text-xs">
            Shell
          </Toggle>
        </ToggleGroup>
      </SettingGroup>
      <SettingGroup label="Density">
        <ToggleGroup
          aria-label="Preview density"
          value={[env.density]}
          onValueChange={(next) => next[0] && setQuery({ density: String(next[0]) })}
          className="rounded-lg border border-border p-0.5"
        >
          <Toggle value="comfortable" size="sm" className="px-2 text-xs">
            Comfortable
          </Toggle>
          <Toggle value="compact" size="sm" className="px-2 text-xs">
            Compact
          </Toggle>
        </ToggleGroup>
      </SettingGroup>
      <SettingGroup label="Direction">
        <ToggleGroup
          aria-label="Preview direction"
          value={[env.dir]}
          onValueChange={(next) => next[0] && setQuery({ dir: String(next[0]) })}
          className="rounded-lg border border-border p-0.5"
        >
          <Toggle value="ltr" size="sm" className="px-2 text-xs">
            LTR
          </Toggle>
          <Toggle value="rtl" size="sm" className="px-2 text-xs">
            RTL
          </Toggle>
        </ToggleGroup>
      </SettingGroup>
      <SettingGroup label="Motion">
        <Toggle
          size="sm"
          pressed={env.motion === "reduce"}
          onPressedChange={(pressed) => setQuery({ motion: pressed ? "reduce" : null })}
          className="border border-border px-2 text-xs"
        >
          Reduced motion
        </Toggle>
      </SettingGroup>
      <SettingGroup label="Background">
        <Select
          value={env.bg}
          onValueChange={(value) => setQuery({ bg: value === "canvas" ? null : String(value) })}
        >
          <SelectTrigger size="sm" aria-label="Preview background" className="min-w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="canvas">Canvas</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="sunken">Sunken</SelectItem>
          </SelectContent>
        </Select>
      </SettingGroup>
    </div>
  );
}

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      {on ? (
        <CheckIcon aria-hidden className="size-3.5 text-success-text" />
      ) : (
        <MinusIcon aria-hidden className="size-3.5 text-muted-foreground" />
      )}
      <span className={on ? undefined : "text-muted-foreground"}>{label}</span>
      <span className="sr-only">{on ? "yes" : "no"}</span>
    </span>
  );
}

function ImportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <code
        className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 font-mono text-xs"
        title={value}
      >
        {value}
      </code>
      <CopyButton
        value={value}
        label={`Copy ${label} path`}
        size="icon-sm"
        className="[&>span]:sr-only"
      />
    </div>
  );
}

function MetadataCard({
  component,
  examples,
}: {
  component: ManifestComponent;
  examples: ModuleExamples;
}) {
  const a11y = component.accessibility;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manifest</CardTitle>
        <CardDescription>component-manifest.json, schema v3.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <DescriptionList className="gap-y-2.5 text-sm sm:grid-cols-[7.5rem_minmax(0,1fr)]">
          <DescriptionTerm>Family</DescriptionTerm>
          <DescriptionDetails>
            <a
              className="underline-offset-4 hover:underline"
              href={href("/components", { family: component.category })}
            >
              {component.category}
            </a>
          </DescriptionDetails>
          <DescriptionTerm>Layer</DescriptionTerm>
          <DescriptionDetails>{component.layer}</DescriptionDetails>
          <DescriptionTerm>Examples</DescriptionTerm>
          <DescriptionDetails>
            {examples.demos.length} demo{examples.demos.length === 1 ? "" : "s"} ·{" "}
            {Object.keys(examples.playground.controls).length} controls
          </DescriptionDetails>
          <DescriptionTerm>Imports</DescriptionTerm>
          <DescriptionDetails className="flex min-w-0 flex-col gap-1.5">
            <ImportRow label="package" value={component.import} />
            <ImportRow label="deep" value={component.deepImport} />
            <ImportRow label="group" value={component.groupImport} />
          </DescriptionDetails>
          {component.states && component.states.length > 0 && (
            <>
              <DescriptionTerm>States</DescriptionTerm>
              <DescriptionDetails className="flex flex-wrap gap-1">
                {component.states.map((state) => (
                  <Badge key={state} variant="muted" className="font-mono">
                    {state}
                  </Badge>
                ))}
              </DescriptionDetails>
            </>
          )}
          {(component.api.variants || component.api.sizes) && (
            <>
              <DescriptionTerm>Variants</DescriptionTerm>
              <DescriptionDetails className="flex flex-col gap-1.5">
                {component.api.variants && (
                  <span className="flex flex-wrap gap-1">
                    {component.api.variants.map((variant) => (
                      <Badge key={variant} variant="outline" className="font-mono">
                        {variant}
                      </Badge>
                    ))}
                  </span>
                )}
                {component.api.sizes && (
                  <span className="flex flex-wrap gap-1">
                    {component.api.sizes.map((size) => (
                      <Badge key={size} variant="muted" className="font-mono">
                        size={size}
                      </Badge>
                    ))}
                  </span>
                )}
              </DescriptionDetails>
            </>
          )}
          {component.api.controlled && (
            <>
              <DescriptionTerm>Controlled</DescriptionTerm>
              <DescriptionDetails className="flex flex-col gap-1">
                {component.api.controlled.map((triple) => (
                  <code key={triple.value} className="font-mono text-xs">
                    {triple.value} · {triple.default} · {triple.change}
                  </code>
                ))}
              </DescriptionDetails>
            </>
          )}
        </DescriptionList>

        <div className="flex flex-col gap-3">
          <h3 className="font-heading text-sm font-semibold">Capabilities</h3>
          <ul className="flex flex-col gap-1.5">
            {(Object.keys(capabilityLabels) as CapabilityKey[]).map((key) => {
              const value = component.capabilities[key];
              const kind: StatusKind =
                value === "supported" || value === "server-safe"
                  ? "success"
                  : value === "client-boundary"
                    ? "info"
                    : value === "unsupported"
                      ? "warning"
                      : value === "unknown"
                        ? "danger"
                        : "neutral";
              return (
                <li key={key} className="flex items-center justify-between gap-3 text-sm">
                  <span>{capabilityLabels[key]}</span>
                  <StatusPill kind={kind}>{value}</StatusPill>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-sm font-semibold">Accessibility</h3>
            <Badge
              variant={
                a11y.audit === "audited"
                  ? "success"
                  : a11y.audit === "partial"
                    ? "warning"
                    : "secondary"
              }
            >
              {auditLabel[a11y.audit]}
            </Badge>
          </div>
          <DescriptionList className="gap-y-2 text-sm sm:grid-cols-[7.5rem_minmax(0,1fr)]">
            <DescriptionTerm>ARIA pattern</DescriptionTerm>
            <DescriptionDetails>{a11y.pattern}</DescriptionDetails>
            {a11y.keyboard && (
              <>
                <DescriptionTerm>Keyboard</DescriptionTerm>
                <DescriptionDetails className="flex flex-wrap gap-1">
                  {a11y.keyboard.map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </DescriptionDetails>
              </>
            )}
            {a11y.focus && (
              <>
                <DescriptionTerm>Focus</DescriptionTerm>
                <DescriptionDetails>
                  {a11y.focus.model}
                  {a11y.focus.contained ? " · contained" : ""}
                  {a11y.focus.restored ? " · restored" : ""}
                </DescriptionDetails>
              </>
            )}
            {a11y.liveRegion && (
              <>
                <DescriptionTerm>Live region</DescriptionTerm>
                <DescriptionDetails>{a11y.liveRegion}</DescriptionDetails>
              </>
            )}
          </DescriptionList>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {Object.entries(a11y.dimensions).map(([key, result]) => (
              <li key={key} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{dimensionLabels[key] ?? key}</span>
                <StatusPill kind={resultKind[result] ?? "neutral"} dot={false}>
                  {result}
                </StatusPill>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-heading text-sm font-semibold">Testing</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Flag on={component.testing.unit} label="Unit" />
            <Flag on={component.testing.accessibility} label="Accessibility" />
            <Flag on={component.testing.interaction} label="Interaction" />
            <Flag on={component.testing.visual} label="Visual" />
            <Flag on={component.testing.hydration} label="Hydration" />
            <Flag on={component.story} label="Story" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
