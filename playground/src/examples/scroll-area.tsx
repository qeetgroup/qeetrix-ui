import { Badge, ScrollArea, type StatusKind, StatusPill } from "@qeetrix/ui";
import { auditRecords, dateTimeFormat, type LogLevel, logEvents, tenants } from "../data/qeet";
import { jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, num, select } from "../registry/types";

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

// Two passes of the sample stream: enough lines to scroll in a short viewport.
const logLines = [0, 1].flatMap((pass) =>
  logEvents.map((event) => ({ ...event, key: `${pass}-${event.id}` })),
);

function LogStream() {
  return (
    <ol className="divide-y font-mono text-caption">
      {logLines.map((line) => (
        <li key={line.key} className="flex items-start gap-3 px-3 py-2">
          <span className="shrink-0 text-muted-foreground tabular-nums">
            {timeFormat.format(new Date(line.timestamp))}
          </span>
          <StatusPill kind={levelKind[line.level]} dot={false}>
            {line.level.toUpperCase()}
          </StatusPill>
          <span className="min-w-0">
            <span className="text-muted-foreground">{line.service} </span>
            {line.message}
          </span>
        </li>
      ))}
    </ol>
  );
}

function TenantStrip() {
  return (
    <ul className="flex w-max gap-3 p-3">
      {tenants.map((tenant) => (
        <li key={tenant.id} className="flex w-52 shrink-0 flex-col gap-1 rounded-lg border p-3">
          <span className="truncate text-sm font-medium">{tenant.name}</span>
          <span className="truncate text-caption text-muted-foreground">{tenant.domain}</span>
          <span className="mt-1 flex items-center gap-2">
            <Badge variant="secondary">{tenant.plan}</Badge>
            <span className="font-mono text-caption text-muted-foreground">{tenant.region}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function AuditTable() {
  return (
    <table className="w-max min-w-full text-sm">
      <thead className="sticky top-0 bg-surface-elevated text-start text-caption text-muted-foreground">
        <tr>
          <th className="px-3 py-2 text-start font-medium">Time</th>
          <th className="px-3 py-2 text-start font-medium">Actor</th>
          <th className="px-3 py-2 text-start font-medium">Action</th>
          <th className="px-3 py-2 text-start font-medium">Target</th>
          <th className="px-3 py-2 text-start font-medium">IP address</th>
          <th className="px-3 py-2 text-start font-medium">Location</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {auditRecords.map((record) => (
          <tr key={record.id}>
            <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
              {dateTimeFormat.format(new Date(record.timestamp))}
            </td>
            <td className="px-3 py-2 whitespace-nowrap">{record.actor.name}</td>
            <td className="px-3 py-2 font-mono text-caption whitespace-nowrap">{record.action}</td>
            <td className="px-3 py-2 whitespace-nowrap">{record.target}</td>
            <td className="px-3 py-2 font-mono text-caption whitespace-nowrap">{record.ip}</td>
            <td className="px-3 py-2 whitespace-nowrap">{record.location}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const content = {
  vertical: {
    label: "Live tail",
    node: <LogStream />,
    code: '<ol className="divide-y font-mono text-caption">{/* log lines */}</ol>',
  },
  horizontal: {
    label: "Tenants",
    node: <TenantStrip />,
    code: '<ul className="flex w-max gap-3 p-3">{/* tenant cards */}</ul>',
  },
  both: {
    label: "Audit log",
    node: <AuditTable />,
    code: '<table className="w-max min-w-full text-sm">{/* audit rows */}</table>',
  },
} as const;

const scrollControls = {
  content: select(["vertical", "horizontal", "both"] as const, "vertical", "Overflow"),
  height: num(240, { min: 120, max: 480, step: 20, label: "Height (px)" }),
  width: num(420, { min: 240, max: 720, step: 20, label: "Width (px)" }),
};

export const examples: FamilyExamples = {
  "scroll-area": {
    layout: "wide",
    minHeight: 760,
    demos: [
      {
        name: "Vertical",
        description:
          "A fixed-height log tail. The scrollbar is always present so the panel never hides that it scrolls; its thumb strengthens on hover. The viewport is a Tab stop whenever it can scroll.",
        render: () => (
          <ScrollArea
            className="h-60 w-full max-w-xl rounded-lg border"
            role="region"
            aria-label="Live tail"
          >
            <LogStream />
          </ScrollArea>
        ),
      },
      {
        name: "Horizontal",
        description: "A row of tenant cards wider than its container.",
        render: () => (
          <ScrollArea
            className="w-full max-w-xl rounded-lg border"
            role="region"
            aria-label="Tenants"
          >
            <TenantStrip />
          </ScrollArea>
        ),
      },
      {
        name: "Both axes",
        description: "A wide audit table in a short box scrolls both ways; the header stays put.",
        render: () => (
          <ScrollArea
            className="h-44 w-full max-w-xl rounded-lg border"
            role="region"
            aria-label="Audit log"
          >
            <AuditTable />
          </ScrollArea>
        ),
      },
    ],
    playground: definePlayground({
      controls: scrollControls,
      render: (v) => (
        <ScrollArea
          className="max-w-full rounded-lg border"
          style={{ height: v.height, width: v.width }}
          role="region"
          aria-label={content[v.content].label}
        >
          {content[v.content].node}
        </ScrollArea>
      ),
      code: (v) =>
        jsx(
          "ScrollArea",
          {
            className: `h-[${v.height}px] w-[${v.width}px] rounded-lg border`,
            role: "region",
            "aria-label": content[v.content].label,
          },
          [content[v.content].code],
        ),
    }),
  },
};
