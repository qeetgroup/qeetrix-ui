import {
  LanguagesIcon,
  MonitorIcon,
  MoonIcon,
  Rows3Icon,
  Rows4Icon,
  SearchIcon,
  SunIcon,
} from "@qeetrix/icons";
import {
  AppShellHeader,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Kbd,
  KbdGroup,
  Separator,
  SidebarTrigger,
  Toggle,
  ToggleGroup,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useTheme,
} from "@qeetrix/ui";
import { Fragment, type ReactNode } from "react";
import { componentBySlug } from "../lib/manifest";
import { modKey } from "../lib/prefs";
import { href, type Route } from "../lib/router";
import { patterns } from "../pages/patterns/catalogue";
import { useShellSettings } from "./environment";

interface Crumb {
  label: string;
  href?: string;
}

function crumbsFor(route: Route): Crumb[] {
  switch (route.page) {
    case "overview":
      return [{ label: "Overview" }];
    case "components": {
      const family = route.query.get("family");
      return family
        ? [{ label: "Components", href: "#/components" }, { label: family }]
        : [{ label: "Components" }];
    }
    case "inspector": {
      const component = route.id ? componentBySlug.get(route.id) : undefined;
      return [
        { label: "Components", href: "#/components" },
        ...(component
          ? [
              {
                label: component.category,
                href: href("/components", { family: component.category }),
              },
              { label: component.name },
            ]
          : [{ label: route.id ?? "Unknown" }]),
      ];
    }
    case "foundations":
      return [{ label: "Foundations" }];
    case "brand":
      return [{ label: "Brand" }];
    case "qa":
      return [{ label: "Visual QA" }];
    case "patterns": {
      const pattern = patterns.find((entry) => entry.id === route.id);
      return [{ label: "Patterns" }, ...(pattern ? [{ label: pattern.title }] : [])];
    }
    default:
      return [{ label: "Not found" }];
  }
}

/** One labelled icon toggle with a tooltip; the label is also its accessible name. */
function IconToggle({
  value,
  label,
  children,
}: {
  value: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Toggle value={value} size="sm" aria-label={label}>
            {children}
          </Toggle>
        }
      />
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function TopBar({ route, onSearch }: { route: Route; onSearch: () => void }) {
  const { theme, setTheme } = useTheme();
  const { density, setDensity, dir, setDir } = useShellSettings();
  const crumbs = crumbsFor(route);
  return (
    <AppShellHeader className="z-20 gap-3 bg-canvas/90 px-3 supports-backdrop-filter:bg-canvas/75 md:px-4">
      <SidebarTrigger className="-ms-1" />
      <Separator orientation="vertical" className="h-5" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          {crumbs.map((crumb, index) => (
            <Fragment key={crumb.href ?? crumb.label}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem className="min-w-0">
                {crumb.href ? (
                  <BreadcrumbLink href={crumb.href} className="truncate">
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <Button
        variant="outline"
        size="sm"
        onClick={onSearch}
        aria-keyshortcuts="Meta+K Control+K"
        aria-haspopup="dialog"
        className="w-9 justify-start px-0 text-muted-foreground sm:w-56 sm:px-2.5"
      >
        <SearchIcon aria-hidden className="mx-auto sm:mx-0" />
        <span className="hidden flex-1 text-start sm:inline">Search…</span>
        <KbdGroup className="hidden sm:inline-flex">
          <Kbd>{modKey}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
        <span className="sr-only sm:hidden">Search</span>
      </Button>
      <div className="flex items-center gap-1">
        <ToggleGroup
          aria-label="Theme"
          value={[theme]}
          onValueChange={(next) => {
            const value = next[0];
            if (value === "light" || value === "dark" || value === "system") setTheme(value);
          }}
          className="rounded-lg border border-border p-0.5"
        >
          <IconToggle value="light" label="Light theme">
            <SunIcon aria-hidden />
          </IconToggle>
          <IconToggle value="system" label="Match system theme">
            <MonitorIcon aria-hidden />
          </IconToggle>
          <IconToggle value="dark" label="Dark theme">
            <MoonIcon aria-hidden />
          </IconToggle>
        </ToggleGroup>
        <ToggleGroup
          aria-label="Density"
          value={[density]}
          onValueChange={(next) => {
            const value = next[0];
            if (value === "comfortable" || value === "compact") setDensity(value);
          }}
          className="hidden rounded-lg border border-border p-0.5 md:flex"
        >
          <IconToggle value="comfortable" label="Comfortable density">
            <Rows3Icon aria-hidden />
          </IconToggle>
          <IconToggle value="compact" label="Compact density">
            <Rows4Icon aria-hidden />
          </IconToggle>
        </ToggleGroup>
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                size="sm"
                pressed={dir === "rtl"}
                onPressedChange={(pressed) => setDir(pressed ? "rtl" : "ltr")}
                aria-label="Right-to-left layout"
                className="hidden gap-1 border border-border px-2 text-xs md:inline-flex"
              >
                <LanguagesIcon aria-hidden />
                {dir.toUpperCase()}
              </Toggle>
            }
          />
          <TooltipContent side="bottom">
            {dir === "rtl" ? "Switch to left-to-right" : "Switch to right-to-left"}
          </TooltipContent>
        </Tooltip>
      </div>
    </AppShellHeader>
  );
}
