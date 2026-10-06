import {
  Badge,
  OverflowList,
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@qeetrix/ui";
import { ChevronRightIcon } from "lucide-react";
import { users } from "../data/qeet";
import { changedProps, expr, jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, num, select } from "../registry/types";

const scopes = [
  "payments:write",
  "invoices:read",
  "users:read",
  "sessions:revoke",
  "webhooks:manage",
  "audit:read",
  "tenants:read",
  "refunds:write",
  "settlements:read",
];

function scopeChips(list: readonly string[]) {
  return list.map((scope) => (
    <Badge key={scope} variant="outline" className="font-mono">
      {scope}
    </Badge>
  ));
}

const path = ["Acme India", "Platform", "Payments", "Checkout service", "Webhooks", "Endpoint"];

const groups = [
  "Platform engineering",
  "On-call: payments",
  "Finance & billing",
  "Bengaluru office",
  "Contractors",
  "Security champions",
];

function GroupsOverflow() {
  return (
    <OverflowList
      className="w-72"
      items={groups.map((group) => (
        <Badge key={group} variant="secondary">
          {group}
        </Badge>
      ))}
      renderOverflow={(hidden, count) => (
        <Popover>
          <PopoverTrigger className="rounded-sm text-caption font-medium whitespace-nowrap text-link outline-none hover:text-link-hover focus-visible:ring-3 focus-visible:ring-ring/disabled">
            and {count} more
          </PopoverTrigger>
          <PopoverContent className="flex max-w-xs flex-col gap-2">
            <PopoverTitle className="text-sm">Also a member of</PopoverTitle>
            <div className="flex flex-wrap gap-1.5">{hidden}</div>
          </PopoverContent>
        </Popover>
      )}
    />
  );
}

const overflowControls = {
  width: num(288, { min: 120, max: 640, step: 8, label: "Container width (px)" }),
  count: num(7, { min: 1, max: scopes.length, step: 1, label: "Scopes" }),
  collapseFrom: select(["end", "start"] as const, "end"),
  gap: select(["gap-1", "gap-1.5", "gap-2", "gap-3"] as const, "gap-1.5"),
};

export const examples: FamilyExamples = {
  "overflow-list": {
    minHeight: 420,
    demos: [
      {
        name: "API key scopes",
        description:
          "As many scopes as fit stay on one line; the rest fold into a “+N” pill whose popover lists them.",
        render: () => <OverflowList className="w-72" items={scopeChips(scopes)} />,
      },
      {
        name: "Collapse from start",
        description: '`collapseFrom="start"` keeps the last items — a breadcrumb-style path.',
        render: () => (
          <OverflowList
            className="w-72"
            collapseFrom="start"
            gap="gap-1"
            items={path.map((segment, index) => (
              <span key={segment} className="flex items-center gap-1 text-sm whitespace-nowrap">
                {index > 0 && (
                  <ChevronRightIcon aria-hidden className="size-3.5 text-muted-foreground" />
                )}
                <span
                  className={index === path.length - 1 ? "font-medium" : "text-muted-foreground"}
                >
                  {segment}
                </span>
              </span>
            ))}
          />
        ),
      },
      {
        name: "Custom overflow",
        description: "`renderOverflow` swaps the pill for an “and N more” link.",
        render: () => <GroupsOverflow />,
      },
      {
        name: "Responds to resizing",
        description:
          "Drag the box's corner: the list re-measures on every container resize, not just on window resize.",
        render: () => (
          <div className="w-80 max-w-full min-w-32 resize-x overflow-hidden rounded-lg border p-2">
            <OverflowList
              items={users.slice(0, 6).map((user) => (
                <Badge key={user.id} variant="muted">
                  {user.role}: {user.name.split(" ")[0]}
                </Badge>
              ))}
            />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: overflowControls,
      render: (v) => (
        <div style={{ width: v.width }} className="max-w-full rounded-lg border border-dashed p-2">
          <OverflowList
            key={`${v.count}-${v.collapseFrom}-${v.gap}`}
            collapseFrom={v.collapseFrom}
            gap={v.gap}
            items={scopeChips(scopes.slice(0, v.count))}
          />
        </div>
      ),
      code: (v) =>
        jsx("OverflowList", {
          ...changedProps(v, overflowControls, ["collapseFrom", "gap"]),
          items: expr(
            `scopes.map((scope) => (\n  <Badge key={scope} variant="outline">\n    {scope}\n  </Badge>\n))`,
          ),
        }),
    }),
  },
};
