"use client";

import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

import type { DisclosureMessages, MessagesFor } from "@/lib/messages";
import { disclosureMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

interface OrgNode {
  id: string;
  label: React.ReactNode;
  sublabel?: React.ReactNode;
  children?: OrgNode[];
}

interface OrgChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: OrgNode;
  /** Render a custom card for each node. */
  renderNode?: (node: OrgNode) => React.ReactNode;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"disclosure">;
}

function NodeCard({
  node,
  renderNode,
}: {
  node: OrgNode;
  renderNode?: OrgChartProps["renderNode"];
}) {
  if (renderNode) return <>{renderNode(node)}</>;
  return (
    <div className="inline-flex min-w-32 flex-col rounded-lg border border-border bg-card px-3 py-2 text-center shadow-rest">
      <span className="text-sm font-medium text-foreground">{node.label}</span>
      {node.sublabel && <span className="text-xs text-muted-foreground">{node.sublabel}</span>}
    </div>
  );
}

// Connectors for a non-root node: a vertical line up to the sibling rail, plus
// the rail itself (trimmed at the first/last child, hidden for an only child).
const CONNECTORS =
  "before:absolute before:top-0 before:left-1/2 before:h-4 before:w-px before:-translate-x-1/2 before:bg-border " +
  "after:absolute after:top-0 after:left-0 after:right-0 after:h-px after:bg-border " +
  "first:after:left-1/2 last:after:right-1/2 only:after:hidden";

function Subtree({
  node,
  renderNode,
  isRoot,
  messages,
}: {
  node: OrgNode;
  renderNode?: OrgChartProps["renderNode"];
  isRoot?: boolean;
  /** Resolved once at the root and threaded down, so every toggle names itself alike. */
  messages: DisclosureMessages;
}) {
  const [open, setOpen] = React.useState(true);
  const kids = node.children ?? [];

  return (
    <li className={cn("relative flex flex-col items-center px-3 pt-4", !isRoot && CONNECTORS)}>
      <div className="relative inline-flex">
        <NodeCard node={node} renderNode={renderNode} />
        {kids.length > 0 && (
          <button
            type="button"
            aria-label={open ? messages.collapse : messages.expand}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="absolute -bottom-2 left-1/2 z-10 flex size-4 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ChevronDownIcon
              aria-hidden
              className={cn("size-3 transition-transform", !open && "-rotate-90")}
            />
          </button>
        )}
      </div>
      {kids.length > 0 && open && (
        <ul className="relative flex pt-4 before:absolute before:top-0 before:left-1/2 before:h-4 before:w-px before:-translate-x-1/2 before:bg-border">
          {kids.map((k) => (
            <Subtree key={k.id} node={k} renderNode={renderNode} messages={messages} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Top-down organisation / hierarchy chart with collapsible branches (CSS connectors). */
function OrgChart({
  data,
  renderNode,
  messages: messageOverrides,
  className,
  ...props
}: OrgChartProps) {
  const messages = useMessages("disclosure", disclosureMessages, messageOverrides);
  return (
    <div data-slot="org-chart" className={cn("overflow-x-auto p-2", className)} {...props}>
      <ul className="flex justify-center">
        <Subtree node={data} renderNode={renderNode} isRoot messages={messages} />
      </ul>
    </div>
  );
}

export type { OrgChartProps, OrgNode };
export { OrgChart };
