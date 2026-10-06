"use client";

import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

import type { DisclosureMessages, MessagesFor } from "@/lib/messages";
import { disclosureMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/direction-provider";
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
   * Depth below which branches start collapsed: `1` shows the root and its direct reports, `0`
   * only the root. Default: everything open. Large organisations read better opened a level at a
   * time — each collapsed branch shows how many people it holds.
   */
  initialOpenDepth?: number;
  /**
   * The node to emphasise — the signed-in person, or the result of a search. Its card takes the
   * Qeet selected outline. Presentational: the chart is not a selection control.
   */
  highlightedId?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"disclosure">;
}

function countDescendants(node: OrgNode): number {
  return (node.children ?? []).reduce((total, child) => total + 1 + countDescendants(child), 0);
}

function NodeCard({
  node,
  renderNode,
  labelId,
  highlighted,
}: {
  node: OrgNode;
  renderNode?: OrgChartProps["renderNode"];
  labelId: string;
  highlighted: boolean;
}) {
  if (renderNode) {
    return (
      <div id={labelId} className="contents">
        {renderNode(node)}
      </div>
    );
  }
  return (
    <div
      id={labelId}
      data-slot="org-chart-node"
      data-highlighted={highlighted ? "" : undefined}
      className={cn(
        "inline-flex max-w-56 min-w-32 flex-col gap-0.5 rounded-lg border bg-surface px-3 py-2 text-center shadow-rest",
        highlighted ? "border-border-brand bg-brand-subtle" : "border-border",
      )}
    >
      <span className="text-sm font-medium text-foreground wrap-break-word">{node.label}</span>
      {node.sublabel && (
        <span className="text-caption text-muted-foreground wrap-break-word">{node.sublabel}</span>
      )}
    </div>
  );
}

/*
 * Connectors for a non-root node: a vertical line up to the sibling rail, plus the rail itself,
 * trimmed at the first and last child and hidden for an only child. The rail is written with
 * logical insets, so under `dir="rtl"` — where the first child sits at the right — it is trimmed
 * on the correct side. Connectors carry the reporting line, so they take the ≥3:1 connector token
 * (the control-boundary role), not a decorative border that fades into the surface.
 */
const CONNECTORS =
  "before:absolute before:top-0 before:left-1/2 before:h-4 before:w-px before:-translate-x-1/2 before:bg-(--qx-component-org-chart-connector) " +
  "after:absolute after:top-0 after:inset-x-0 after:h-px after:bg-(--qx-component-org-chart-connector) " +
  "first:after:inset-s-1/2 last:after:inset-e-1/2 only:after:hidden";

function Subtree({
  node,
  renderNode,
  isRoot,
  depth,
  initialOpenDepth,
  highlightedId,
  messages,
  formatCount,
}: {
  node: OrgNode;
  renderNode?: OrgChartProps["renderNode"];
  isRoot?: boolean;
  depth: number;
  initialOpenDepth: number;
  highlightedId?: string;
  /** Resolved once at the root and threaded down, so every toggle names itself alike. */
  messages: DisclosureMessages;
  formatCount: (count: number) => string;
}) {
  const [open, setOpen] = React.useState(depth < initialOpenDepth);
  const labelId = React.useId();
  const kids = node.children ?? [];
  const hidden = open ? 0 : countDescendants(node);

  return (
    <li className={cn("relative flex flex-col items-center px-3 pt-4", !isRoot && CONNECTORS)}>
      <div className="relative inline-flex pb-1">
        <NodeCard
          node={node}
          renderNode={renderNode}
          labelId={labelId}
          highlighted={highlightedId === node.id}
        />
        {kids.length > 0 && (
          <button
            type="button"
            aria-label={open ? messages.collapse : messages.expand}
            // The name is the action; the description says whose branch it is, so a list of
            // toggles is not a column of identical "Expand" buttons.
            aria-describedby={labelId}
            aria-expanded={open}
            data-slot="org-chart-toggle"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "absolute -bottom-2.5 left-1/2 z-10 flex h-6 min-w-6 -translate-x-1/2 items-center justify-center gap-0.5 rounded-full border border-border-strong bg-surface text-muted-foreground shadow-rest outline-none transition-colors duration-fast hover:bg-surface-interactive hover:text-foreground focus-visible:focus-ring",
              hidden > 0 && "px-1.5",
            )}
          >
            {hidden > 0 && (
              // How much of the organisation is folded away. Visual only: the expanded state is
              // already announced, and the count would make the name a sentence.
              <span aria-hidden className="text-micro font-medium tabular-nums">
                {formatCount(hidden)}
              </span>
            )}
            <ChevronDownIcon
              aria-hidden
              className={cn(
                "size-3.5 transition-transform duration-fast ease-standard",
                !open && "-rotate-90 rtl:rotate-90",
              )}
            />
          </button>
        )}
      </div>
      {kids.length > 0 && open && (
        <ul className="relative flex pt-4 before:absolute before:top-0 before:left-1/2 before:h-4 before:w-px before:-translate-x-1/2 before:bg-(--qx-component-org-chart-connector)">
          {kids.map((k) => (
            <Subtree
              key={k.id}
              node={k}
              renderNode={renderNode}
              depth={depth + 1}
              initialOpenDepth={initialOpenDepth}
              highlightedId={highlightedId}
              messages={messages}
              formatCount={formatCount}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Top-down organisation / hierarchy chart with collapsible branches (CSS connectors). The
 * hierarchy is nested lists, so a screen reader announces each level's size and depth; each
 * collapsed branch shows how many people it holds.
 *
 * Wide charts scroll horizontally. The chart is centred while it fits and starts at the inline
 * start once it does not, so no part of a wide chart is pushed out of the scrollable area.
 */
function OrgChart({
  data,
  renderNode,
  initialOpenDepth = Number.POSITIVE_INFINITY,
  highlightedId,
  messages: messageOverrides,
  className,
  ...props
}: OrgChartProps) {
  const messages = useMessages("disclosure", disclosureMessages, messageOverrides);
  const locale = useLocale();
  const formatCount = React.useMemo(() => {
    const format = new Intl.NumberFormat(locale, { notation: "compact" });
    return (count: number) => format.format(count);
  }, [locale]);
  return (
    <div data-slot="org-chart" className={cn("overflow-x-auto p-2 pb-4", className)} {...props}>
      {/* `w-max min-w-full`: as wide as the chart, never narrower than the viewport. Centring a
          wider-than-viewport flex row would push its start out of reach of the scrollbar. */}
      <ul className="mx-auto flex w-max min-w-full justify-center">
        <Subtree
          node={data}
          renderNode={renderNode}
          isRoot
          depth={0}
          initialOpenDepth={initialOpenDepth}
          highlightedId={highlightedId}
          messages={messages}
          formatCount={formatCount}
        />
      </ul>
    </div>
  );
}

export type { OrgChartProps, OrgNode };
export { OrgChart };
