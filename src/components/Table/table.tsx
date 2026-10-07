import type * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Table — the native-semantics primitives DataTable is built from.
 *
 * Visual model (component tokens in src/tokens/component/table.json):
 *   - header   a quiet filled band (`header-background`) on the `th` cells themselves, so it stays
 *              opaque when the header is sticky and masks any row tint underneath
 *   - body     hairline row separators (`separator`), a translucent hover wash, and the Qeet
 *              selected vocabulary — brand-subtle tint plus a ≥3:1 inline-start indicator bar —
 *              for `data-state="selected"` rows
 *   - footer   the same band as the header, for totals
 *
 * A row's background is published as `--qx-table-row-background` rather than set directly. That
 * lets an opaque cell that must cover scrolling content — a DataTable pinned column — repaint the
 * same tint over its own surface, so hover and selection read across the whole row.
 */

interface TableProps extends React.ComponentProps<"table"> {
  /**
   * Classes for the scrolling container that wraps the table. Give it a height cap (for example
   * `max-h-96`) together with a `sticky` `TableHeader` to keep the header in view.
   */
  containerClassName?: string;
}

/**
 * The parts of a semantic table (header, body, rows and cells) in Qeetrix styling, with a
 * scrolling container and an optional sticky header.
 */
function Table({ className, containerClassName, ...props }: TableProps) {
  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full overflow-x-auto", containerClassName)}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm tabular-nums", className)}
        {...props}
      />
    </div>
  );
}

interface TableHeaderProps extends React.ComponentProps<"thead"> {
  /**
   * Keep the header in view while the table's container scrolls vertically. The container needs a
   * height cap (`Table`'s `containerClassName`) for there to be anything to scroll.
   */
  sticky?: boolean;
}

function TableHeader({ className, sticky = false, ...props }: TableHeaderProps) {
  return (
    <thead
      data-slot="table-header"
      data-sticky={sticky ? "" : undefined}
      className={cn(
        "[&_th]:bg-(--qx-component-table-header-background) [&_tr]:hover:[--qx-table-row-background:transparent]",
        // A collapsed-border table paints row borders on the table, not the sticky header, so
        // the rule would scroll away. Sticky headers draw their separator inside the cells.
        sticky
          ? "sticky top-0 z-10 [&_th]:shadow-[inset_0_-1px_0_var(--qx-color-border-default)] [&_tr]:border-b-0"
          : "[&_tr]:border-b [&_tr]:border-border",
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-border bg-(--qx-component-table-footer-background) font-medium [&_tr]:hover:[--qx-table-row-background:transparent] [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-(--qx-component-table-separator) bg-(--qx-table-row-background) transition-colors duration-fast ease-standard [--qx-table-row-background:transparent] focus-visible:focus-ring-inset",
        "hover:[--qx-table-row-background:var(--qx-component-table-row-background-hover)]",
        "data-[state=selected]:[--qx-table-row-background:var(--qx-component-table-row-background-selected)] data-[state=selected]:hover:[--qx-table-row-background:var(--qx-component-table-row-background-selected-hover)]",
        // Selected indicator: a 2px inline-start bar on the first cell, so selection is carried by
        // shape as well as tint. Under forced colours the tint is gone; the bar becomes Highlight.
        // Every rule is wrapped in :where(), so it has zero specificity: the first cell only becomes
        // `relative` when nothing else positions it — a consumer's `absolute`, a pinned column's
        // `sticky` — and the bar is drawn against whatever containing block that leaves.
        "[:where(&[data-state=selected]>:first-child)]:relative [:where(&[data-state=selected]>:first-child)]:before:absolute [:where(&[data-state=selected]>:first-child)]:before:inset-y-0 [:where(&[data-state=selected]>:first-child)]:before:inset-s-0 [:where(&[data-state=selected]>:first-child)]:before:w-0.5 [:where(&[data-state=selected]>:first-child)]:before:bg-(--qx-component-table-row-indicator) [:where(&[data-state=selected]>:first-child)]:before:forced-color-adjust-none forced-colors:[:where(&[data-state=selected]>:first-child)]:before:bg-[Highlight]",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-(--qx-control-row-height) px-3 text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pe-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-(--qx-control-cell-padding-y) align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-3 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

interface TableEmptyProps extends React.ComponentProps<"td"> {
  /** Number of columns the message spans — the table's visible column count. */
  colSpan: number;
}

/**
 * A full-width body row for "nothing to show": no data yet, or no rows match a filter. It never
 * takes the hover wash, because it is not a row of data. Put a short sentence in it, or an
 * `EmptyState` when there is an action to offer.
 */
function TableEmpty({ className, colSpan, children, ...props }: TableEmptyProps) {
  return (
    <tr data-slot="table-empty">
      <td
        colSpan={colSpan}
        className={cn("px-6 py-10 text-center text-sm text-muted-foreground", className)}
        {...props}
      >
        {children}
      </td>
    </tr>
  );
}

export type { TableEmptyProps, TableHeaderProps, TableProps };
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
