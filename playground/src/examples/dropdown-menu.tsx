import {
  Avatar,
  AvatarFallback,
  Button,
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  cn,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
  toast,
} from "@qeetrix/ui";
import {
  BellOffIcon,
  ChevronDownIcon,
  Columns3Icon,
  CopyIcon,
  FilterIcon,
  KeyRoundIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RouteIcon,
  Settings2Icon,
  UserIcon,
  UserXIcon,
} from "lucide-react";
import { type LogLevel, logEvents, tenants, users } from "../data/qeet";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select } from "../registry/types";

const priya = users[2];
const rohan = users[1];
const departments = ["Platform", "Payments", "Data", "Finance", "Risk & Compliance"] as const;

/* ── Dropdown menu demos ──────────────────────────────────────────────────────────────────── */

function RowActionsMenu({
  align = "end",
  side = "bottom",
  sideOffset = 4,
  modal = true,
  disabled = false,
  shortcuts = true,
  submenu = true,
}: {
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  modal?: boolean;
  disabled?: boolean;
  shortcuts?: boolean;
  submenu?: boolean;
}) {
  return (
    <DropdownMenu modal={modal} disabled={disabled}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label={`Actions for ${priya.name}`} />}
      >
        <MoreHorizontalIcon aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} sideOffset={sideOffset} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{priya.name}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => toast(`Opening ${priya.name}'s profile`)}>
            <UserIcon aria-hidden />
            View profile
            {shortcuts && <DropdownMenuShortcut>↵</DropdownMenuShortcut>}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <PencilIcon aria-hidden />
            Edit role
            {shortcuts && <DropdownMenuShortcut>E</DropdownMenuShortcut>}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => toast.success("User ID copied", { description: priya.id })}
          >
            <CopyIcon aria-hidden />
            Copy user ID
            {shortcuts && <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>}
          </DropdownMenuItem>
          {submenu && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <RouteIcon aria-hidden />
                Move to department
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup defaultValue={priya.department}>
                  {departments.map((department) => (
                    <DropdownMenuRadioItem key={department} value={department}>
                      {department}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <KeyRoundIcon aria-hidden />
          Transfer ownership
          <DropdownMenuShortcut className="tracking-normal">Owners only</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() =>
            toast.warning(`${priya.name} suspended`, {
              description: "Active sessions were revoked.",
            })
          }
        >
          <UserXIcon aria-hidden />
          Suspend user
          {shortcuts && <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const columns = [
  { id: "email", label: "Email", checked: true },
  { id: "role", label: "Role", checked: true },
  { id: "mfa", label: "MFA method", checked: true },
  { id: "location", label: "Location", checked: false },
  { id: "last-active", label: "Last active", checked: true },
] as const;

/* ── Context menu demos ───────────────────────────────────────────────────────────────────── */

const levelClass: Record<LogLevel, string> = {
  debug: "text-muted-foreground",
  info: "text-info-text",
  warn: "text-warning-text",
  error: "text-destructive-text",
};

const time = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});

function LogLineMenu({
  event,
  shortcuts = true,
  submenu = true,
}: {
  event: (typeof logEvents)[number];
  shortcuts?: boolean;
  submenu?: boolean;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        className={cn(
          "grid grid-cols-[auto_auto_minmax(0,1fr)] gap-x-3 rounded-md px-2 py-1.5 font-mono text-xs",
          "hover:bg-muted data-popup-open:bg-muted",
        )}
      >
        <span className="text-muted-foreground tabular-nums">
          {time.format(new Date(event.timestamp))}
        </span>
        <span className={cn("w-10 uppercase", levelClass[event.level])}>{event.level}</span>
        <span className="truncate text-foreground">
          <span className="text-muted-foreground">{event.service}</span> {event.message}
        </span>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        <ContextMenuGroup>
          <ContextMenuLabel>trace {event.traceId}</ContextMenuLabel>
          <ContextMenuItem
            onClick={() => toast.success("Message copied", { description: event.message })}
          >
            <CopyIcon aria-hidden />
            Copy message
            {shortcuts && <ContextMenuShortcut>⌘C</ContextMenuShortcut>}
          </ContextMenuItem>
          <ContextMenuItem>
            <RouteIcon aria-hidden />
            Open trace
            {shortcuts && <ContextMenuShortcut>T</ContextMenuShortcut>}
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        {submenu && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <FilterIcon aria-hidden />
              Filter by
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>service = {event.service}</ContextMenuItem>
              <ContextMenuItem>level = {event.level}</ContextMenuItem>
              <ContextMenuItem>trace_id = {event.traceId}</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem>Exclude {event.service}</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuItem disabled>Pin to dashboard</ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={() => toast.warning("Alert muted for 1 hour", { description: event.message })}
        >
          <BellOffIcon aria-hidden />
          Mute this alert for 1 h
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

const logSample = logEvents.slice(0, 4);

/* ── Menubar ──────────────────────────────────────────────────────────────────────────────── */

function ConsoleMenubar({
  shortcuts = true,
  disabled = false,
  loopFocus = true,
  modal = true,
  billingDisabled = false,
}: {
  shortcuts?: boolean;
  disabled?: boolean;
  loopFocus?: boolean;
  modal?: boolean;
  billingDisabled?: boolean;
}) {
  return (
    <Menubar disabled={disabled} loopFocus={loopFocus} modal={modal} className="w-fit">
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent className="min-w-56">
          <MenubarItem onClick={() => toast("New tenant")}>
            New tenant
            {shortcuts && <MenubarShortcut>⌘N</MenubarShortcut>}
          </MenubarItem>
          <MenubarItem>
            Import users from CSV…
            {shortcuts && <MenubarShortcut>⌘I</MenubarShortcut>}
          </MenubarItem>
          <MenubarSub>
            <MenubarSubTrigger>Export audit log</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onClick={() => toast.success("Exporting audit log as CSV")}>
                CSV
              </MenubarItem>
              <MenubarItem onClick={() => toast.success("Exporting audit log as JSON Lines")}>
                JSON Lines
              </MenubarItem>
              <MenubarItem disabled>SIEM stream (Enterprise)</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem disabled>
            Print
            {shortcuts && <MenubarShortcut>⌘P</MenubarShortcut>}
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent className="min-w-56">
          <MenubarItem>
            Undo
            {shortcuts && <MenubarShortcut>⌘Z</MenubarShortcut>}
          </MenubarItem>
          <MenubarItem disabled>
            Redo
            {shortcuts && <MenubarShortcut>⇧⌘Z</MenubarShortcut>}
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Find user…
            {shortcuts && <MenubarShortcut>⌘F</MenubarShortcut>}
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem variant="destructive">Delete selected users</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent className="min-w-56">
          <MenubarCheckboxItem defaultChecked>Sidebar</MenubarCheckboxItem>
          <MenubarCheckboxItem>Archived tenants</MenubarCheckboxItem>
          <MenubarSeparator />
          <MenubarGroup>
            <MenubarLabel>Density</MenubarLabel>
            <MenubarRadioGroup defaultValue="comfortable">
              <MenubarRadioItem value="comfortable">Comfortable</MenubarRadioItem>
              <MenubarRadioItem value="compact">Compact</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarGroup>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu disabled={billingDisabled}>
        <MenubarTrigger className="data-disabled:opacity-disabled">Billing</MenubarTrigger>
        <MenubarContent className="min-w-56">
          <MenubarItem>Invoices</MenubarItem>
          <MenubarItem>Payment methods</MenubarItem>
          <MenubarItem>GST details</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

/* ── Playground controls ──────────────────────────────────────────────────────────────────── */

const dropdownControls = {
  align: select(["start", "center", "end"] as const, "end"),
  side: select(["top", "right", "bottom", "left"] as const, "bottom"),
  sideOffset: num(4, { min: 0, max: 24, label: "sideOffset" }),
  modal: bool(true),
  disabled: bool(false),
  shortcuts: bool(true, "Shortcuts"),
  submenu: bool(true, "Submenu"),
};

const contextControls = {
  shortcuts: bool(true, "Shortcuts"),
  submenu: bool(true, "Submenu"),
};

const menubarControls = {
  shortcuts: bool(true, "Shortcuts"),
  disabled: bool(false),
  loopFocus: bool(true),
  modal: bool(true),
};

export const examples: FamilyExamples = {
  "context-menu": {
    demos: [
      {
        name: "Log line",
        description:
          "Right-click (or long-press) a log line for actions on that line: copy, open the trace, filter.",
        render: () => (
          <div className="flex w-full max-w-xl flex-col rounded-lg border bg-surface-sunken p-1">
            {logSample.map((event) => (
              <LogLineMenu key={event.id} event={event} />
            ))}
          </div>
        ),
      },
      {
        name: "Checkbox and radio items",
        render: () => (
          <ContextMenu>
            <ContextMenuTrigger className="flex h-32 w-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Right-click the live tail
            </ContextMenuTrigger>
            <ContextMenuContent className="w-52">
              <ContextMenuGroup>
                <ContextMenuLabel>Display</ContextMenuLabel>
                <ContextMenuCheckboxItem defaultChecked>Wrap long lines</ContextMenuCheckboxItem>
                <ContextMenuCheckboxItem defaultChecked>Show timestamps</ContextMenuCheckboxItem>
                <ContextMenuCheckboxItem>Show attributes</ContextMenuCheckboxItem>
              </ContextMenuGroup>
              <ContextMenuSeparator />
              <ContextMenuGroup>
                <ContextMenuLabel>Time zone</ContextMenuLabel>
                <ContextMenuRadioGroup defaultValue="ist">
                  <ContextMenuRadioItem value="ist">IST (UTC+05:30)</ContextMenuRadioItem>
                  <ContextMenuRadioItem value="utc">UTC</ContextMenuRadioItem>
                </ContextMenuRadioGroup>
              </ContextMenuGroup>
            </ContextMenuContent>
          </ContextMenu>
        ),
      },
    ],
    playground: definePlayground({
      controls: contextControls,
      render: (v) => (
        <div className="w-full max-w-xl rounded-lg border bg-surface-sunken p-1">
          <LogLineMenu event={logEvents[2]} shortcuts={v.shortcuts} submenu={v.submenu} />
        </div>
      ),
      code: (v) =>
        jsx("ContextMenu", {}, [
          jsx("ContextMenuTrigger", {}, `${logEvents[2].service} ${logEvents[2].message}`),
          jsx("ContextMenuContent", {}, [
            jsx("ContextMenuItem", {}, [
              "Copy message",
              v.shortcuts ? jsx("ContextMenuShortcut", {}, "⌘C") : "",
            ]),
            jsx("ContextMenuItem", {}, [
              "Open trace",
              v.shortcuts ? jsx("ContextMenuShortcut", {}, "T") : "",
            ]),
            "<ContextMenuSeparator />",
            v.submenu
              ? jsx("ContextMenuSub", {}, [
                  jsx("ContextMenuSubTrigger", {}, "Filter by"),
                  jsx("ContextMenuSubContent", {}, [
                    jsx("ContextMenuItem", {}, `service = ${logEvents[2].service}`),
                    jsx("ContextMenuItem", {}, `level = ${logEvents[2].level}`),
                  ]),
                ])
              : "",
            jsx("ContextMenuItem", { disabled: true }, "Pin to dashboard"),
            jsx("ContextMenuItem", { variant: "destructive" }, "Mute this alert for 1 h"),
          ]),
        ]),
    }),
  },

  "dropdown-menu": {
    demos: [
      {
        name: "Row actions",
        description:
          "Icons, shortcuts, a submenu, a disabled item with its reason, and a destructive item last.",
        render: () => (
          <div className="flex w-full max-w-sm items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{priya.name}</p>
              <p className="truncate text-caption text-muted-foreground">
                {priya.email} · {priya.role}
              </p>
            </div>
            <RowActionsMenu />
          </div>
        ),
      },
      {
        name: "Checkbox and radio items",
        description: "Checkbox items stay open on click so several columns can be toggled.",
        render: () => (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              <Columns3Icon data-icon="inline-start" aria-hidden />
              View
              <ChevronDownIcon data-icon="inline-end" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Columns</DropdownMenuLabel>
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem key={column.id} defaultChecked={column.checked}>
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup defaultValue="last-active">
                  <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="last-active">Last active</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="created">Date added</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
      {
        name: "Account menu",
        render: () => (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2 ps-1.5" />}>
              <Avatar size="sm">
                <AvatarFallback>{rohan.initials}</AvatarFallback>
              </Avatar>
              {rohan.name}
              <ChevronDownIcon data-icon="inline-end" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-foreground">{rohan.name}</span>
                  <span className="font-normal">{rohan.email}</span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Switch tenant</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup defaultValue="tnt_acme">
                    {tenants
                      .filter((tenant) => tenant.status !== "suspended")
                      .map((tenant) => (
                        <DropdownMenuRadioItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </DropdownMenuRadioItem>
                      ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem>
                <Settings2Icon aria-hidden />
                Account settings
                <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <KeyRoundIcon aria-hidden />
                Passkeys and security
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast("Signed out of Qeet ID")}>
                <LogOutIcon aria-hidden />
                Sign out
                <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
      {
        name: "Disabled",
        description:
          "`disabled` on the root: the trigger is inert, e.g. for a user being deprovisioned.",
        render: () => (
          <div className="flex w-full max-w-sm items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{priya.name}</p>
              <p className="truncate text-caption text-muted-foreground">
                Deprovisioning via SCIM…
              </p>
            </div>
            <RowActionsMenu disabled />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: dropdownControls,
      render: (v) => (
        <RowActionsMenu
          align={v.align}
          side={v.side}
          sideOffset={v.sideOffset}
          modal={v.modal}
          disabled={v.disabled}
          shortcuts={v.shortcuts}
          submenu={v.submenu}
        />
      ),
      code: (v) =>
        jsx("DropdownMenu", changedProps(v, dropdownControls, ["modal", "disabled"]), [
          jsx(
            "DropdownMenuTrigger",
            {
              render: expr(
                `<Button variant="ghost" size="icon" aria-label="Actions for ${priya.name}" />`,
              ),
            },
            "<MoreHorizontalIcon aria-hidden />",
          ),
          jsx(
            "DropdownMenuContent",
            {
              align: v.align,
              ...changedProps(v, dropdownControls, ["side", "sideOffset"]),
              className: "w-64",
            },
            [
              jsx("DropdownMenuItem", {}, [
                "View profile",
                v.shortcuts ? jsx("DropdownMenuShortcut", {}, "↵") : "",
              ]),
              jsx("DropdownMenuItem", {}, [
                "Copy user ID",
                v.shortcuts ? jsx("DropdownMenuShortcut", {}, "⌘C") : "",
              ]),
              v.submenu
                ? jsx("DropdownMenuSub", {}, [
                    jsx("DropdownMenuSubTrigger", {}, "Move to department"),
                    jsx("DropdownMenuSubContent", {}, [
                      jsx(
                        "DropdownMenuRadioGroup",
                        { defaultValue: priya.department },
                        departments
                          .slice(0, 3)
                          .map((department) =>
                            jsx("DropdownMenuRadioItem", { value: department }, department),
                          ),
                      ),
                    ]),
                  ])
                : "",
              "<DropdownMenuSeparator />",
              jsx("DropdownMenuItem", { disabled: true }, "Transfer ownership"),
              jsx("DropdownMenuItem", { variant: "destructive" }, [
                "Suspend user",
                v.shortcuts ? jsx("DropdownMenuShortcut", {}, "⌘⌫") : "",
              ]),
            ],
          ),
        ]),
    }),
  },

  menubar: {
    demos: [
      {
        name: "Console menubar",
        description:
          "Once a menu is open, hovering or arrowing to a neighbour switches menus. Submenus, checkbox and radio items, disabled and destructive items.",
        render: () => <ConsoleMenubar />,
      },
      {
        name: "Disabled menu",
        description:
          "A Developer without billing access: the Billing menu is disabled rather than hidden.",
        render: () => <ConsoleMenubar billingDisabled />,
      },
    ],
    playground: definePlayground({
      controls: menubarControls,
      render: (v) => (
        <ConsoleMenubar
          shortcuts={v.shortcuts}
          disabled={v.disabled}
          loopFocus={v.loopFocus}
          modal={v.modal}
        />
      ),
      code: (v) =>
        jsx("Menubar", changedProps(v, menubarControls, ["disabled", "loopFocus", "modal"]), [
          jsx("MenubarMenu", {}, [
            jsx("MenubarTrigger", {}, "File"),
            jsx("MenubarContent", {}, [
              jsx("MenubarItem", {}, [
                "New tenant",
                v.shortcuts ? jsx("MenubarShortcut", {}, "⌘N") : "",
              ]),
              jsx("MenubarSub", {}, [
                jsx("MenubarSubTrigger", {}, "Export audit log"),
                jsx("MenubarSubContent", {}, [
                  jsx("MenubarItem", {}, "CSV"),
                  jsx("MenubarItem", {}, "JSON Lines"),
                ]),
              ]),
            ]),
          ]),
          jsx("MenubarMenu", {}, [
            jsx("MenubarTrigger", {}, "View"),
            jsx("MenubarContent", {}, [
              jsx("MenubarCheckboxItem", { defaultChecked: true }, "Sidebar"),
              jsx("MenubarRadioGroup", { defaultValue: "comfortable" }, [
                jsx("MenubarRadioItem", { value: "comfortable" }, "Comfortable"),
                jsx("MenubarRadioItem", { value: "compact" }, "Compact"),
              ]),
            ]),
          ]),
        ]),
    }),
  },
};
