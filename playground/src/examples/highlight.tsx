import { Badge, Highlight, Input, Label } from "@qeetrix/ui";
import { useId, useState } from "react";
import { auditRecords, type LogLevel, logEvents } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, text } from "../registry/types";

const levelBadge: Record<LogLevel, "muted" | "secondary" | "warning" | "destructive"> = {
  debug: "muted",
  info: "secondary",
  warn: "warning",
  error: "destructive",
};

function LogLine({
  query,
  event,
}: {
  query: string | string[];
  event: (typeof logEvents)[number];
}) {
  return (
    <li className="flex items-start gap-2 px-3 py-2 font-mono text-caption">
      <Badge variant={levelBadge[event.level]} className="w-12 justify-center uppercase">
        {event.level}
      </Badge>
      <div className="min-w-0 flex-1">
        <Highlight query={query} className="block break-words">
          {event.message}
        </Highlight>
        <span className="text-muted-foreground">
          <Highlight query={query}>{event.service}</Highlight> · trace{" "}
          <Highlight query={query}>{event.traceId}</Highlight>
        </span>
      </div>
    </li>
  );
}

function LogSearchDemo() {
  const [query, setQuery] = useState("qeet-id");
  const id = useId();
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? logEvents.filter(
        (event) =>
          event.message.toLowerCase().includes(needle) ||
          event.service.toLowerCase().includes(needle) ||
          event.traceId.toLowerCase().includes(needle),
      )
    : logEvents;
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <div className="flex max-w-xs flex-col gap-1.5">
        <Label htmlFor={id}>Search logs</Label>
        <Input
          id={id}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Service, message or trace id"
        />
      </div>
      <p className="text-caption text-muted-foreground" aria-live="polite">
        {matches.length} of {logEvents.length} events match
      </p>
      <ul className="flex flex-col divide-y rounded-lg border">
        {matches.map((event) => (
          <LogLine key={event.id} event={event} query={query.trim()} />
        ))}
      </ul>
    </div>
  );
}

const highlightControls = {
  children: text("UPI collect request timed out; retrying with exponential backoff", "Text", {
    multiline: true,
  }),
  query: text("UPI, timed out", "Query (comma-separated terms)"),
  caseSensitive: bool(false, "Case sensitive"),
};

function terms(query: string): string[] {
  return query
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);
}

export const examples: FamilyExamples = {
  highlight: {
    layout: "wide",
    minHeight: 640,
    demos: [
      {
        name: "Search results",
        description:
          "Filter Qeet Logs events by service, message or trace id; matches are wrapped in `<mark>`.",
        render: () => <LogSearchDemo />,
      },
      {
        name: "Multiple terms",
        render: () => (
          <ul className="flex w-full max-w-2xl flex-col divide-y rounded-lg border">
            {logEvents.slice(1, 4).map((event) => (
              <LogLine key={event.id} event={event} query={["UPI", "SMS", "NACH", "timed out"]} />
            ))}
          </ul>
        ),
      },
      {
        name: "Case sensitive",
        description: "Only the upper-case acronym matches with `caseSensitive`.",
        render: () => (
          <p className="max-w-xl text-sm">
            <Highlight query="SCIM" caseSensitive>
              SCIM provisioning: 3 users created from Okta (scim-okta-acme connector)
            </Highlight>
          </p>
        ),
      },
      {
        name: "Custom mark",
        description: "`markClassName` restyles the marks, e.g. a warning tone for audit search.",
        render: () => (
          <ul className="flex max-w-xl flex-col gap-1.5 text-sm">
            {auditRecords.slice(0, 3).map((record) => (
              <li key={record.id}>
                <span className="font-medium">{record.actor.name}</span>{" "}
                <Highlight
                  query={["role", "revoked", "API key"]}
                  markClassName="bg-warning/25 dark:bg-warning/30"
                >
                  {record.summary}
                </Highlight>
              </li>
            ))}
          </ul>
        ),
      },
    ],
    playground: definePlayground({
      controls: highlightControls,
      render: (v) => (
        <p className="max-w-md text-sm">
          <Highlight query={terms(v.query)} caseSensitive={v.caseSensitive}>
            {v.children}
          </Highlight>
        </p>
      ),
      code: (v) => {
        const list = terms(v.query);
        return jsx(
          "Highlight",
          {
            query: list.length === 1 ? list[0] : expr(JSON.stringify(list)),
            caseSensitive: v.caseSensitive,
          },
          v.children,
        );
      },
    }),
  },
};
