import {
  AppShellHeader,
  Avatar,
  AvatarFallback,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  QeetLogo,
  Separator,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@qeetrix/ui";
import { BellIcon, ChevronsUpDownIcon, LogOutIcon, SearchIcon, SettingsIcon } from "lucide-react";
import { type ComponentType, Fragment, type ReactNode } from "react";

export interface ConsoleNavGroup {
  label: string;
  items: {
    label: string;
    icon: ComponentType<{ className?: string }>;
    active?: boolean;
    badge?: string;
  }[];
}

const noNavigation = (event: { preventDefault: () => void }) => event.preventDefault();

/**
 * A Qeet product console frame, composed the way a product team would: SidebarProvider +
 * Sidebar (collapsible to icons) + SidebarInset with an AppShellHeader. Patterns render it in
 * their own document, so the desktop sidebar's fixed positioning is the real thing.
 */
export function ConsoleFrame({
  product,
  tenant,
  nav,
  crumbs,
  children,
}: {
  product: string;
  tenant: string;
  nav: ConsoleNavGroup[];
  crumbs: string[];
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip={`${product} · ${tenant}`}>
                <QeetLogo className="size-8 shrink-0 rounded-md" aria-hidden />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate font-semibold">{product}</span>
                  <span className="truncate text-xs text-muted-foreground">{tenant}</span>
                </span>
                <ChevronsUpDownIcon aria-hidden className="ms-auto" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {nav.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={item.active}
                        tooltip={item.label}
                        render={
                          <a
                            href={`#${item.label}`}
                            onClick={noNavigation}
                            aria-current={item.active ? "page" : undefined}
                          />
                        }
                      >
                        <item.icon aria-hidden />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton size="lg" tooltip="Ananya Iyer">
                      <Avatar size="sm">
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate font-medium">Ananya Iyer</span>
                        <span className="truncate text-xs text-muted-foreground">
                          ananya.iyer@acme.in
                        </span>
                      </span>
                      <ChevronsUpDownIcon aria-hidden className="ms-auto" />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Signed in as Owner</DropdownMenuLabel>
                    <DropdownMenuItem>
                      <SettingsIcon aria-hidden />
                      Account settings
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOutIcon aria-hidden />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-w-0">
        <AppShellHeader>
          <SidebarTrigger className="-ms-1" />
          <Separator orientation="vertical" className="h-5" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              {crumbs.map((crumb, index) => {
                const last = index === crumbs.length - 1;
                return (
                  <Fragment key={crumb}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {last ? (
                        <BreadcrumbPage>{crumb}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={`#${crumb}`} onClick={noNavigation}>
                          {crumb}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
          <InputGroup className="hidden w-64 md:flex">
            <InputGroupAddon>
              <SearchIcon aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              aria-label={`Search ${product}`}
              placeholder="Search users, apps, keys…"
            />
          </InputGroup>
          <Button variant="ghost" size="icon" aria-label="Notifications, 3 unread">
            <BellIcon aria-hidden />
          </Button>
        </AppShellHeader>
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
