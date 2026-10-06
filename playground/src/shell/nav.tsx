import {
  QeetLogo,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@qeetrix/ui";
import {
  BlocksIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  PaletteIcon,
  ScanEyeIcon,
} from "lucide-react";
import { type ComponentType, useEffect } from "react";
import { components, families, manifest } from "../lib/manifest";
import { href, type Route } from "../lib/router";
import { patterns } from "../pages/patterns/catalogue";

interface NavEntry {
  page: Route["page"];
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
}

const entries: readonly NavEntry[] = [
  { page: "overview", label: "Overview", path: "/", icon: LayoutDashboardIcon },
  {
    page: "components",
    label: "Components",
    path: "/components",
    icon: BlocksIcon,
    badge: String(components.length),
  },
  { page: "foundations", label: "Foundations", path: "/foundations", icon: PaletteIcon },
  { page: "qa", label: "Visual QA", path: "/qa", icon: ScanEyeIcon },
];

export function ShellNav({ route }: { route: Route }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const routeKey = `${route.path}`;
  // On small screens the sidebar is a sheet: close it once a link has navigated.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `routeKey` is the trigger.
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [routeKey]);
  const activeFamily =
    route.page === "inspector"
      ? components.find((component) => component.slug === route.id)?.category
      : route.page === "components"
        ? route.query.get("family")
        : null;
  return (
    <Sidebar collapsible="icon" aria-label="Playground">
      <SidebarHeader>
        <a
          href="#/"
          className="flex items-center gap-2.5 rounded-md p-1.5 outline-none focus-visible:focus-ring-inset group-data-[collapsible=icon]:p-0.5"
        >
          <QeetLogo className="size-7 shrink-0 rounded-md" aria-hidden />
          <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-heading text-sm font-semibold">Qeetrix UI</span>
            <span className="text-caption text-muted-foreground">Component playground</span>
          </span>
        </a>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Playground</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {entries.map((entry) => {
                const active =
                  route.page === entry.page ||
                  (entry.page === "components" && route.page === "inspector");
                return (
                  <SidebarMenuItem key={entry.page}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={entry.label}
                      render={
                        <a href={`#${entry.path}`} aria-current={active ? "page" : undefined} />
                      }
                    >
                      <entry.icon aria-hidden />
                      <span>{entry.label}</span>
                    </SidebarMenuButton>
                    {entry.badge && <SidebarMenuBadge>{entry.badge}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Patterns"
                  render={
                    <a
                      href={`#/patterns/${patterns[0]?.id ?? ""}`}
                      aria-current={route.page === "patterns" && !route.id ? "page" : undefined}
                    />
                  }
                >
                  <LayoutTemplateIcon aria-hidden />
                  <span>Patterns</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {patterns.map((pattern) => {
                    const active = route.page === "patterns" && route.id === pattern.id;
                    return (
                      <SidebarMenuSubItem key={pattern.id}>
                        <SidebarMenuSubButton
                          isActive={active}
                          href={`#/patterns/${pattern.id}`}
                          aria-current={active ? "page" : undefined}
                        >
                          <span>{pattern.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Families</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {families.map((family) => {
                const active = activeFamily === family.name;
                return (
                  <SidebarMenuItem key={family.name}>
                    <SidebarMenuButton
                      size="sm"
                      isActive={active}
                      render={<a href={href("/components", { family: family.name })} />}
                    >
                      <span>{family.name}</span>
                    </SidebarMenuButton>
                    {family.modules.length > 1 && (
                      <SidebarMenuBadge className="text-muted-foreground">
                        {family.modules.length}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <p className="px-2 text-caption text-muted-foreground">
          {manifest.name} {manifest.version} · manifest v{manifest.schemaVersion} · {manifest.count}{" "}
          modules
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
