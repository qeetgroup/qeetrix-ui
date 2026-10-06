import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@qeetrix/ui";
import {
  ArrowRightIcon,
  ContrastIcon,
  LanguagesIcon,
  MoonIcon,
  Rows3Icon,
  SearchIcon,
  SearchXIcon,
  ServerIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { type ComponentType, Suspense, useDeferredValue, useMemo } from "react";
import {
  type Audit,
  auditLabel,
  auditOrder,
  type CapabilityKey,
  capabilityCovered,
  capabilityLabels,
  families,
  type ManifestComponent,
  type Status,
  statusBadge,
  statusOrder,
} from "../lib/manifest";
import { listOf, type Route, setQuery } from "../lib/router";
import { useFamilyExamples } from "../registry";
import { DemoList } from "../shell/demo-view";
import { useShellFrameEnv } from "../shell/environment";
import { ExampleBoundary } from "../shell/error-boundary";
import { LazyMount } from "../shell/lazy-mount";
import { Page } from "../shell/page";
import { PreviewFrame } from "../shell/preview-frame";

const capabilityKeys = Object.keys(capabilityLabels) as CapabilityKey[];

const capabilityIcons: Record<CapabilityKey, ComponentType<{ className?: string }>> = {
  rtl: LanguagesIcon,
  darkMode: MoonIcon,
  density: Rows3Icon,
  ssr: ServerIcon,
  reducedMotion: ContrastIcon,
};

export interface GalleryFilter {
  q: string;
  status: Status[];
  audit: Audit[];
  cap: CapabilityKey[];
  family: string;
}

export function parseFilter(query: URLSearchParams): GalleryFilter {
  const family = query.get("family") ?? "";
  return {
    q: (query.get("q") ?? "").slice(0, 80),
    status: listOf(query.get("status"), statusOrder),
    audit: listOf(query.get("audit"), auditOrder),
    cap: listOf(query.get("cap"), capabilityKeys),
    family: families.some((entry) => entry.name === family) ? family : "",
  };
}

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matches(component: ManifestComponent, filter: GalleryFilter): boolean {
  if (filter.family && component.category !== filter.family) return false;
  if (filter.status.length && !filter.status.includes(component.status)) return false;
  if (filter.audit.length && !filter.audit.includes(component.accessibility.audit)) return false;
  if (filter.cap.some((key) => !capabilityCovered(key, component.capabilities[key]))) return false;
  const terms = filter.q.split(/\s+/).map(normalise).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalise(`${component.name} ${component.slug} ${component.category}`);
  return terms.every((term) => haystack.includes(term));
}

export function ComponentsPage({ route }: { route: Route }) {
  const filter = parseFilter(route.query);
  const deferredFilter = useDeferredValue(filter);
  const visible = useMemo(
    () =>
      families
        .map((family) => ({
          family,
          modules: family.modules.filter((component) => matches(component, deferredFilter)),
        }))
        .filter((entry) => entry.modules.length > 0),
    [deferredFilter],
  );
  const shown = visible.reduce((total, entry) => total + entry.modules.length, 0);
  const filtered =
    filter.q || filter.status.length || filter.audit.length || filter.cap.length || filter.family;

  return (
    <Page
      title="Components"
      description="Every module in the manifest with live previews of its key variants and states, in the current theme, density and direction. Open one to inspect its props, metadata and code."
    >
      <div className="sticky top-14 z-10 -mx-4 flex flex-col gap-3 border-b bg-canvas/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-canvas/80 md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="w-full sm:w-72">
            <InputGroupAddon>
              <SearchIcon aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Search components by name, slug or family"
              placeholder="Search name, slug, family…"
              value={filter.q}
              onChange={(event) => setQuery({ q: event.target.value })}
            />
          </InputGroup>
          <Select
            value={(filter.status[0] ?? "all") as string}
            onValueChange={(value) => setQuery({ status: value === "all" ? null : String(value) })}
          >
            <SelectTrigger size="sm" aria-label="Status" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOrder.map((status) => (
                <SelectItem key={status} value={status}>
                  <span className="capitalize">{status}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={(filter.audit[0] ?? "all") as string}
            onValueChange={(value) => setQuery({ audit: value === "all" ? null : String(value) })}
          >
            <SelectTrigger size="sm" aria-label="Accessibility audit" className="min-w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any audit status</SelectItem>
              {auditOrder.map((audit) => (
                <SelectItem key={audit} value={audit}>
                  {auditLabel[audit]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm">
                  <SlidersHorizontalIcon data-icon="inline-start" aria-hidden />
                  Capabilities
                  {filter.cap.length > 0 && (
                    <Badge variant="secondary" className="ms-1 px-1.5">
                      {filter.cap.length}
                    </Badge>
                  )}
                </Button>
              }
            />
            <DropdownMenuContent className="min-w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Must support</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {capabilityKeys.map((key) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={filter.cap.includes(key)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...filter.cap, key]
                        : filter.cap.filter((entry) => entry !== key);
                      setQuery({
                        cap: capabilityKeys.filter((entry) => next.includes(entry)).join(","),
                      });
                    }}
                  >
                    {key === "ssr" ? "Server-safe (SSR)" : capabilityLabels[key]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-2">
            <Label htmlFor="gallery-family" className="sr-only">
              Family
            </Label>
            <div className="w-48">
              <Combobox
                id="gallery-family"
                items={families.map((family) => ({ label: family.name, value: family.name }))}
                value={filter.family || null}
                onValueChange={(value) => setQuery({ family: value })}
                placeholder="All families"
                className="h-7 text-sm"
              />
            </div>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {shown} of {families.reduce((total, family) => total + family.modules.length, 0)}{" "}
              modules
            </p>
            {filtered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setQuery({ q: null, status: null, audit: null, cap: null, family: null })
                }
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={SearchXIcon}
          title="No modules match"
          description="Try a shorter search, or clear the status, audit and capability filters."
          action={
            <Button
              variant="outline"
              onClick={() =>
                setQuery({ q: null, status: null, audit: null, cap: null, family: null })
              }
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-12">
          {visible.map(({ family, modules }) => (
            <section
              key={family.name}
              aria-labelledby={`family-${family.name}`}
              className="flex flex-col gap-4"
            >
              <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                <h2
                  id={`family-${family.name}`}
                  className="font-heading text-heading font-semibold"
                >
                  {family.name}
                </h2>
                <span className="text-caption text-muted-foreground">
                  {modules.length === family.modules.length
                    ? `${family.modules.length} module${family.modules.length === 1 ? "" : "s"}`
                    : `${modules.length} of ${family.modules.length} modules`}
                </span>
              </div>
              {modules.map((component) => (
                <ModuleCard key={component.slug} component={component} />
              ))}
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}

function ModuleCard({ component }: { component: ManifestComponent }) {
  return (
    <Card className="min-w-0 hover:shadow-(--qx-component-card-elevation)">
      <CardHeader className="border-b">
        <CardTitle>
          <a
            href={`#/components/${component.slug}`}
            className="rounded-sm outline-none underline-offset-4 hover:underline focus-visible:focus-ring"
          >
            {component.name}
          </a>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
          <span>{component.slug}</span>
          <span aria-hidden>·</span>
          <span className="font-sans">
            {component.accessibility.pattern === "none"
              ? "no ARIA pattern"
              : `ARIA ${component.accessibility.pattern}`}
          </span>
        </CardDescription>
        <CardAction className="flex flex-wrap items-center justify-end gap-1.5">
          <CapabilityIcons component={component} />
          <Badge variant={statusBadge[component.status]} className="capitalize">
            {component.status}
          </Badge>
          {component.accessibility.audit !== "not-audited" && (
            <Badge variant="outline">{auditLabel[component.accessibility.audit]}</Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            render={
              <a href={`#/components/${component.slug}`} aria-label={`Inspect ${component.name}`} />
            }
            nativeButton={false}
          >
            Inspect
            <ArrowRightIcon data-icon="inline-end" aria-hidden className="rtl:rotate-180" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="py-2">
        <LazyMount minHeight={140} placeholder={<PreviewSkeleton />}>
          <ExampleBoundary label={component.name}>
            <Suspense fallback={<PreviewSkeleton />}>
              <ModulePreview component={component} />
            </Suspense>
          </ExampleBoundary>
        </LazyMount>
      </CardContent>
    </Card>
  );
}

function CapabilityIcons({ component }: { component: ManifestComponent }) {
  const supported = capabilityKeys.filter((key) =>
    capabilityCovered(key, component.capabilities[key]),
  );
  if (supported.length === 0) return null;
  return (
    <span className="me-1 hidden items-center gap-1 text-muted-foreground sm:inline-flex">
      {supported.map((key) => {
        const Icon = capabilityIcons[key];
        const label = key === "ssr" ? "Server-safe" : `${capabilityLabels[key]} supported`;
        return (
          <Tooltip key={key}>
            <TooltipTrigger
              render={
                <span
                  className="inline-flex size-6 items-center justify-center rounded-md"
                  aria-label={label}
                  role="img"
                >
                  <Icon className="size-3.5" />
                </span>
              }
            />
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-2" aria-hidden>
      <Skeleton className="h-3 w-24" />
      <div className="flex gap-3">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

function ModulePreview({ component }: { component: ManifestComponent }) {
  const examples = useFamilyExamples(component.category)[component.slug];
  const env = useShellFrameEnv();
  if (!examples) {
    return (
      <p className="py-4 text-sm text-destructive-text">
        No examples registered for {component.slug}.
      </p>
    );
  }
  if (examples.framed) {
    return (
      <div className="flex flex-col gap-6 py-2">
        {examples.demos.map((demo, index) => (
          <section
            key={demo.name}
            aria-label={`${component.name}: ${demo.name}`}
            className="flex flex-col gap-2"
          >
            <h4 className="font-ui text-micro font-medium tracking-wide text-muted-foreground uppercase">
              {demo.name}
            </h4>
            <PreviewFrame
              route={{ kind: "demo", slug: component.slug, demo: index }}
              env={{ ...env, bg: "card" }}
              title={`${component.name} — ${demo.name}`}
              minHeight={examples.minHeight ?? 200}
              className="overflow-hidden rounded-lg border"
            />
          </section>
        ))}
      </div>
    );
  }
  return (
    <div className="py-2" style={{ minHeight: examples.minHeight }}>
      <DemoList name={component.name} examples={examples} />
    </div>
  );
}
