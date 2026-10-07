import { DownloadIcon } from "@qeetrix/icons";
import {
  type ActiveFilter,
  Badge,
  Button,
  FilterBar,
  type FilterBarView,
  type FilterField,
  toast,
} from "@qeetrix/ui";
import { useState } from "react";
import { type LogEvent, logEvents, type User, users } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/** `is` / `is not` / `contains`, case-insensitively, against one record's field. */
function matches(actual: string, filter: ActiveFilter): boolean {
  const left = actual.toLowerCase();
  const right = filter.value.toLowerCase();
  switch (filter.operator) {
    case "is":
      return left === right;
    case "is not":
      return left !== right;
    case "contains":
      return left.includes(right);
    case "starts with":
      return left.startsWith(right);
    default:
      return true;
  }
}

function apply<T>(
  rows: readonly T[],
  filters: ActiveFilter[],
  read: (row: T, field: string) => string,
) {
  return rows.filter((row) => filters.every((filter) => matches(read(row, filter.field), filter)));
}

const options = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value[0]?.toUpperCase() + value.slice(1) }));

/* ── Qeet ID users ────────────────────────────────────────────────────────────────────────── */

const userFields: FilterField[] = [
  {
    key: "role",
    label: "Role",
    operators: ["is", "is not"],
    options: options(["Owner", "Admin", "Developer", "Billing", "Auditor", "Member"]),
  },
  {
    key: "status",
    label: "Status",
    operators: ["is", "is not"],
    options: options(["active", "pending", "suspended", "inactive"]),
  },
  {
    key: "mfa",
    label: "MFA",
    operators: ["is", "is not"],
    options: [
      { value: "passkey", label: "Passkey" },
      { value: "totp", label: "Authenticator app" },
      { value: "sms", label: "SMS" },
      { value: "none", label: "Not enrolled" },
    ],
  },
  { key: "department", label: "Department" },
  { key: "location", label: "Location" },
];

const mfaLabels: Record<User["mfa"], string> = {
  passkey: "Passkey",
  totp: "Authenticator app",
  sms: "SMS",
  none: "No MFA",
};

function readUser(user: User, field: string): string {
  switch (field) {
    case "role":
      return user.role;
    case "status":
      return user.status;
    case "mfa":
      return user.mfa;
    case "department":
      return user.department;
    case "location":
      return user.location;
    default:
      return "";
  }
}

const userViews: FilterBarView[] = [
  {
    id: "no-passkey",
    label: "Active without passkey",
    filters: [
      { field: "status", operator: "is", value: "active" },
      { field: "mfa", operator: "is not", value: "passkey" },
    ],
  },
  { id: "admins", label: "Admins", filters: [{ field: "role", operator: "is", value: "Admin" }] },
  {
    id: "pending",
    label: "Pending invites",
    filters: [{ field: "status", operator: "is", value: "pending" }],
  },
];

function searchUsers(rows: readonly User[], search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(
    (user) => user.name.toLowerCase().includes(needle) || user.email.includes(needle),
  );
}

function UsersDemo() {
  const [views, setViews] = useState(userViews);
  const [viewId, setViewId] = useState<string | null>("no-passkey");
  const [filters, setFilters] = useState<ActiveFilter[]>(userViews[0]?.filters ?? []);
  const [search, setSearch] = useState("");
  const rows = searchUsers(apply(users, filters, readUser), search);
  return (
    <div className="flex w-full flex-col gap-3">
      <FilterBar
        fields={userFields}
        value={filters}
        onValueChange={setFilters}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name or email"
        views={views}
        viewId={viewId}
        onViewChange={(view) => setViewId(view?.id ?? null)}
        onSaveView={(current) => {
          const id = `view-${views.length + 1}`;
          const label = `My view ${views.length - userViews.length + 1}`;
          setViews([...views, { id, label, ...current }]);
          setViewId(id);
          toast.success(`Saved “${label}”`, {
            description: "Shared with the Acme India admins.",
          });
        }}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast(`Exporting ${rows.length} users as CSV`)}
          >
            <DownloadIcon data-icon="inline-start" aria-hidden />
            Export
          </Button>
        }
        aria-label="Filter users"
      />
      <p className="text-sm text-muted-foreground">
        {rows.length} of {users.length} users in Acme India
      </p>
      <ul className="divide-y rounded-lg border">
        {rows.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">
            No users match these filters.
          </li>
        )}
        {rows.map((user) => (
          <li key={user.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-caption text-muted-foreground">{user.email}</span>
            <span className="ms-auto flex gap-1.5">
              <Badge variant="outline">{user.role}</Badge>
              <Badge variant={user.mfa === "none" ? "warning" : "secondary"}>
                {mfaLabels[user.mfa]}
              </Badge>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Qeet Logs events ─────────────────────────────────────────────────────────────────────── */

const services = [...new Set(logEvents.map((event) => event.service))];

const logFields: FilterField[] = [
  {
    key: "level",
    label: "Level",
    operators: ["is", "is not"],
    options: options(["debug", "info", "warn", "error"]),
  },
  {
    key: "service",
    label: "Service",
    operators: ["is", "is not"],
    options: services.map((service) => ({ value: service, label: service })),
  },
  { key: "message", label: "Message", operators: ["contains"] },
  { key: "traceId", label: "Trace ID", operators: ["is", "starts with"] },
];

function readEvent(event: LogEvent, field: string): string {
  switch (field) {
    case "level":
      return event.level;
    case "service":
      return event.service;
    case "message":
      return event.message;
    case "traceId":
      return event.traceId;
    default:
      return "";
  }
}

const logTime = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Kolkata",
});

function LogsDemo() {
  const [filters, setFilters] = useState<ActiveFilter[]>([
    { field: "level", operator: "is not", value: "debug" },
    { field: "service", operator: "is not", value: "qeet-logs-ingest" },
    { field: "message", operator: "contains", value: "token" },
    { field: "traceId", operator: "starts with", value: "9d5b" },
  ]);
  const [search, setSearch] = useState("");
  const needle = search.trim().toLowerCase();
  const rows = apply(logEvents, filters, readEvent).filter(
    (event) => !needle || `${event.message} ${event.traceId}`.toLowerCase().includes(needle),
  );
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <FilterBar
        fields={logFields}
        value={filters}
        onValueChange={setFilters}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search messages"
        overflow="collapse"
        addLabel="Add condition"
        aria-label="Filter log events"
      />
      <div className="overflow-x-auto rounded-lg border bg-(--qx-color-surface-sunken) p-3 font-mono text-caption">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No events in the last 15 minutes match.</p>
        ) : (
          rows.map((event) => (
            <p key={event.id} className="whitespace-pre">
              <span className="text-muted-foreground">
                {logTime.format(new Date(event.timestamp))}
              </span>{" "}
              <span className={event.level === "error" ? "text-destructive-text" : undefined}>
                {event.level.toUpperCase().padEnd(5)}
              </span>{" "}
              <span className="text-muted-foreground">{event.service}</span> {event.message}{" "}
              <span className="text-muted-foreground">trace={event.traceId}</span>
            </p>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyDemo() {
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  return (
    <FilterBar
      fields={userFields}
      value={filters}
      onValueChange={setFilters}
      aria-label="Filter users"
    />
  );
}

function DisabledDemo() {
  const [filters, setFilters] = useState<ActiveFilter[]>(userViews[1]?.filters ?? []);
  return (
    <div className="flex flex-col gap-2">
      <FilterBar
        fields={userFields}
        value={filters}
        onValueChange={setFilters}
        onSearchChange={() => undefined}
        views={userViews}
        defaultViewId="admins"
        disabled
        aria-label="Filter users"
      />
      <p className="text-sm text-muted-foreground">Locked while the SCIM sync from Okta runs.</p>
    </div>
  );
}

const presets = {
  none: [],
  one: [{ field: "role", operator: "is", value: "Admin" }],
  several: [
    { field: "role", operator: "is not", value: "Member" },
    { field: "status", operator: "is", value: "active" },
    { field: "location", operator: "contains", value: "Bengaluru" },
  ],
} satisfies Record<string, ActiveFilter[]>;

const controls = {
  filters: select(["none", "one", "several"] as const, "several", "Initial filters"),
  search: bool(true, "Search (search / onSearchChange)"),
  views: bool(true, "Saved views (views / onSaveView)"),
  overflow: select(["wrap", "collapse"] as const, "wrap"),
  actions: bool(false, "Trailing actions"),
  addLabel: text("Add filter", "addLabel"),
  disabled: bool(false),
};

function FilterBarPlayground({
  initial,
  withSearch,
  withViews,
  overflow,
  withActions,
  addLabel,
  disabled,
}: {
  initial: ActiveFilter[];
  withSearch: boolean;
  withViews: boolean;
  overflow: "wrap" | "collapse";
  withActions: boolean;
  addLabel: string;
  disabled: boolean;
}) {
  const [filters, setFilters] = useState(initial);
  const [search, setSearch] = useState("");
  return (
    <div className="w-[min(40rem,90vw)]">
      <FilterBar
        fields={userFields}
        value={filters}
        onValueChange={setFilters}
        search={withSearch ? search : undefined}
        onSearchChange={withSearch ? setSearch : undefined}
        views={withViews ? userViews : undefined}
        onSaveView={withViews ? () => toast("Name the new view in your save dialog") : undefined}
        overflow={overflow}
        actions={
          withActions ? (
            <Button variant="outline" size="sm">
              <DownloadIcon data-icon="inline-start" aria-hidden />
              Export
            </Button>
          ) : undefined
        }
        addLabel={addLabel || undefined}
        disabled={disabled}
        aria-label="Filter users"
      />
    </div>
  );
}

export const examples: FamilyExamples = {
  "filter-bar": {
    layout: "wide",
    minHeight: 760,
    demos: [
      {
        name: "Search, saved views and actions",
        description:
          "Qeet ID users: pick a saved view, search by name, edit a chip by clicking it. Changing the filters marks the view modified and offers “Save current view…”.",
        render: () => <UsersDemo />,
      },
      {
        name: "Collapsed overflow",
        description:
          'Qeet Logs: `overflow="collapse"` keeps one line and folds the rest into “+N”. Operators are per field.',
        render: () => <LogsDemo />,
      },
      {
        name: "Empty",
        render: () => <EmptyDemo />,
      },
      {
        name: "Disabled",
        render: () => <DisabledDemo />,
      },
    ],
    playground: definePlayground({
      controls,
      render: (v) => (
        <FilterBarPlayground
          key={v.filters}
          initial={presets[v.filters]}
          withSearch={v.search}
          withViews={v.views}
          overflow={v.overflow}
          withActions={v.actions}
          addLabel={v.addLabel}
          disabled={v.disabled}
        />
      ),
      code: (v) =>
        jsx("FilterBar", {
          fields: expr("userFields"),
          value: expr("filters"),
          onValueChange: expr("setFilters"),
          search: v.search ? expr("search") : undefined,
          onSearchChange: v.search ? expr("setSearch") : undefined,
          views: v.views ? expr("savedViews") : undefined,
          onSaveView: v.views ? expr("(current) => openSaveViewDialog(current)") : undefined,
          overflow: v.overflow === "wrap" ? undefined : v.overflow,
          actions: v.actions ? expr("<ExportButton />") : undefined,
          addLabel: v.addLabel === "Add filter" ? undefined : v.addLabel || undefined,
          disabled: v.disabled,
          "aria-label": "Filter users",
        }),
    }),
  },
};
