import {
  cn,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type StatusKind,
  StatusPill,
} from "@qeetrix/ui";
import { useState } from "react";
import { dateTimeFormat, type LogLevel, logEvents, tenants } from "../data/qeet";
import { jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select } from "../registry/types";

const levelKind: Record<LogLevel, StatusKind> = {
  debug: "muted",
  info: "info",
  warn: "warning",
  error: "danger",
};

const timeFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Qeet Logs explorer: the event list beside the selected event's attributes. */
function LogsExplorer() {
  const [selectedId, setSelectedId] = useState(logEvents[2].id);
  const selected = logEvents.find((event) => event.id === selectedId) ?? logEvents[0];
  return (
    <div className="h-[360px] w-full">
      <ResizablePanelGroup className="rounded-lg border">
        <ResizablePanel defaultSize="55%" minSize="30%" className="overflow-auto">
          <ul aria-label="Log events" className="divide-y">
            {logEvents.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  aria-pressed={event.id === selectedId}
                  onClick={() => setSelectedId(event.id)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-start font-mono text-caption outline-none hover:bg-surface-interactive-hover focus-visible:bg-surface-interactive-hover",
                    event.id === selectedId && "bg-brand-subtle hover:bg-brand-subtle-hover",
                  )}
                >
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {timeFormat.format(new Date(event.timestamp))}
                  </span>
                  <StatusPill kind={levelKind[event.level]} dot={false}>
                    {event.level.toUpperCase()}
                  </StatusPill>
                  <span className="min-w-0 truncate">{event.message}</span>
                </button>
              </li>
            ))}
          </ul>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel minSize="25%" className="overflow-auto">
          <div className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-1">
              <span className="text-caption text-muted-foreground">
                {selected.service} · {dateTimeFormat.format(new Date(selected.timestamp))}
              </span>
              <p className="text-sm font-medium">{selected.message}</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-caption">
              <dt className="text-muted-foreground">trace_id</dt>
              <dd className="truncate">{selected.traceId}</dd>
              <dt className="text-muted-foreground">level</dt>
              <dd>{selected.level}</dd>
              {Object.entries(selected.attributes).map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="truncate">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

const query = `service = "qeet-pay-api"
  AND level >= warn
  AND attributes.psp = "npci-sandbox"
| stats count() by bin(5m)`;

/** A query editor over its results: a vertical group. */
function QueryWorkbench() {
  const warnings = logEvents.filter((event) => event.level === "warn" || event.level === "error");
  return (
    <div className="h-[340px] w-full">
      <ResizablePanelGroup orientation="vertical" className="rounded-lg border">
        <ResizablePanel defaultSize="40%" minSize="20%" className="overflow-auto">
          <div className="flex h-full flex-col">
            <div className="border-b px-3 py-1.5 text-caption text-muted-foreground">
              Query · last 15 minutes
            </div>
            <pre className="flex-1 overflow-auto bg-surface-sunken p-3 font-mono text-caption">
              {query}
            </pre>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel minSize="25%" className="overflow-auto">
          <div className="flex flex-col gap-2 p-3">
            <span className="text-caption text-muted-foreground">
              {warnings.length} matching events
            </span>
            <ul className="flex flex-col gap-1.5 text-sm">
              {warnings.map((event) => (
                <li key={event.id} className="flex items-center gap-2">
                  <StatusPill kind={levelKind[event.level]} dot={false}>
                    {event.level.toUpperCase()}
                  </StatusPill>
                  <span className="truncate">{event.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

/** Three panes with a collapsible navigation rail. */
function TenantWorkspace() {
  return (
    <div className="h-[280px] w-full">
      <ResizablePanelGroup className="rounded-lg border">
        <ResizablePanel
          defaultSize="22%"
          minSize="15%"
          collapsible
          collapsedSize="0%"
          className="overflow-auto bg-surface-subtle"
        >
          <ul aria-label="Tenants" className="flex flex-col gap-0.5 p-2 text-sm">
            {tenants.map((tenant, index) => (
              <li
                key={tenant.id}
                className={cn(
                  "truncate rounded-md px-2 py-1.5",
                  index === 0 && "bg-brand-subtle font-medium",
                )}
              >
                {tenant.name}
              </li>
            ))}
          </ul>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="48%" minSize="30%" className="overflow-auto">
          <div className="flex flex-col gap-1 p-4">
            <span className="text-sm font-medium">Acme India Pvt Ltd</span>
            <span className="text-caption text-muted-foreground">
              Enterprise · ap-south-1 · 1,842 users
            </span>
            <p className="mt-2 text-sm text-muted-foreground">
              Drag the left divider past its minimum to collapse the tenant list entirely; drag it
              back out to restore it.
            </p>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel minSize="20%" className="overflow-auto">
          <div className="flex flex-col gap-1 p-4 text-sm">
            <span className="font-medium">Activity</span>
            <span className="text-caption text-muted-foreground">
              Rohan Mehta changed Priya Nair's role · 5 min ago
            </span>
            <span className="text-caption text-muted-foreground">
              Sanjay Gupta revoked a high-risk session · 31 min ago
            </span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

const resizableControls = {
  orientation: select(["horizontal", "vertical"] as const, "horizontal"),
  withHandle: bool(true, "Visible grip (withHandle)"),
  defaultSize: num(40, { min: 10, max: 90, step: 5, label: "First panel default size (%)" }),
  minSize: num(20, { min: 5, max: 50, step: 5, label: "Minimum size (%)" }),
  collapsible: bool(false, "First panel collapsible"),
};

export const examples: FamilyExamples = {
  resizable: {
    layout: "wide",
    minHeight: 1100,
    demos: [
      {
        name: "Logs explorer",
        description:
          "Event list beside its attributes. Drag the grip or focus it and use the arrow keys; sizes are percentages spelled as strings.",
        render: () => <LogsExplorer />,
      },
      {
        name: "Vertical",
        description: 'A query editor over its results, with `orientation="vertical"`.',
        render: () => <QueryWorkbench />,
      },
      {
        name: "Three panes, collapsible",
        description:
          "A thin handle without a grip; the tenant list is `collapsible` and snaps shut below its minimum.",
        render: () => <TenantWorkspace />,
      },
    ],
    playground: definePlayground({
      controls: resizableControls,
      render: (v) => (
        <div className="h-72 w-[min(100%,720px)]">
          <ResizablePanelGroup
            key={`${v.orientation}-${v.defaultSize}-${v.minSize}-${v.collapsible}`}
            orientation={v.orientation}
            className="rounded-lg border"
          >
            <ResizablePanel
              defaultSize={`${v.defaultSize}%`}
              minSize={`${v.minSize}%`}
              collapsible={v.collapsible}
              className="flex items-center justify-center p-4"
            >
              <span className="text-sm font-medium">Invoices</span>
            </ResizablePanel>
            <ResizableHandle withHandle={v.withHandle} />
            <ResizablePanel
              minSize={`${v.minSize}%`}
              className="flex items-center justify-center p-4"
            >
              <span className="text-sm text-muted-foreground">QP-INV-2026-00412</span>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      ),
      code: (v) =>
        jsx(
          "ResizablePanelGroup",
          {
            orientation: v.orientation === "horizontal" ? undefined : v.orientation,
            className: "rounded-lg border",
          },
          [
            jsx(
              "ResizablePanel",
              {
                defaultSize: `${v.defaultSize}%`,
                minSize: `${v.minSize}%`,
                collapsible: v.collapsible,
              },
              "Invoices",
            ),
            jsx("ResizableHandle", { withHandle: v.withHandle ? true : undefined }),
            jsx("ResizablePanel", { minSize: `${v.minSize}%` }, "Invoice detail"),
          ],
        ),
    }),
  },
};
