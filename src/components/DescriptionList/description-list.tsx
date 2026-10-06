"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Key/value detail view for entity and settings pages.
 *
 * Reading model: the term is a quiet label (muted, regular weight), the value is the data
 * (foreground). One cue each — a medium-weight muted term competed with its own value.
 *
 * Three layouts:
 *   horizontal  term column + value column from `sm`, stacked below it. The default.
 *   vertical    term above value at every width — for narrow panels, drawers and side sheets,
 *               where a two-column split leaves the value no room.
 *   grid        a responsive grid of term-over-value cells that fills the width (summary panels:
 *               plan, region, created, owner…). Needs `DescriptionItem` wrappers.
 *
 * Bare `DescriptionTerm` + `DescriptionDetails` siblings keep working in `horizontal` and
 * `vertical`. Wrapping each pair in a `DescriptionItem` (a `<div>`, which `<dl>` permits) groups
 * it: the term sits tight against its own value when stacked, and `divided` rules between pairs.
 *
 * Spacing follows density: the gap between pairs is the density's cell padding, so a compact
 * subtree tightens a details panel exactly as it tightens a table.
 */

type DescriptionListLayout = "horizontal" | "vertical" | "grid";

interface DescriptionListContextValue {
  layout: DescriptionListLayout;
  divided: boolean;
  /** Rendered inside a `DescriptionItem`, which owns the pair's spacing and rule. */
  grouped: boolean;
}

const DescriptionListContext = React.createContext<DescriptionListContextValue>({
  layout: "horizontal",
  divided: false,
  grouped: false,
});

const descriptionListVariants = cva("grid text-sm", {
  variants: {
    layout: {
      horizontal:
        "grid-cols-1 gap-x-6 gap-y-(--qx-control-cell-padding-y) sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)]",
      // No grid gap: a stacked term has to sit closer to its own value than to the pair above,
      // which one uniform gap cannot express. The children space themselves instead.
      vertical: "grid-cols-1",
      grid: "grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] gap-x-6 gap-y-[calc(var(--qx-control-cell-padding-y)*1.5)]",
    },
    divided: {
      // The rules sit between pairs, so the gap they replace becomes padding inside each pair.
      true: "gap-y-0",
      false: "",
    },
  },
  defaultVariants: { layout: "horizontal", divided: false },
});

interface DescriptionListProps
  extends React.ComponentProps<"dl">,
    VariantProps<typeof descriptionListVariants> {}

/**
 * Key-value detail view for entity/settings pages. Render `DescriptionTerm` +
 * `DescriptionDetails` pairs as direct children — optionally grouped in `DescriptionItem` —
 * and they lay out as a responsive two-column grid (stacked on mobile, term/value columns from
 * `sm`). See `layout` for narrow panels and summary grids, and `divided` for ruled rows.
 */
function DescriptionList({
  className,
  layout: layoutProp,
  divided: dividedProp,
  ...props
}: DescriptionListProps) {
  const layout = layoutProp ?? "horizontal";
  const divided = dividedProp ?? false;
  const context = React.useMemo(() => ({ layout, divided, grouped: false }), [layout, divided]);
  return (
    <DescriptionListContext.Provider value={context}>
      <dl
        data-slot="description-list"
        data-layout={layout}
        data-divided={divided ? "" : undefined}
        className={cn(descriptionListVariants({ layout, divided }), className)}
        {...props}
      />
    </DescriptionListContext.Provider>
  );
}

/**
 * Groups one term with its value (or values). Optional for `horizontal` and `vertical`, required
 * for `grid`. In `horizontal` it spans both columns through `subgrid`, so grouped and bare pairs
 * align on the same two tracks.
 */
function DescriptionItem({ className, ...props }: React.ComponentProps<"div">) {
  const parent = React.useContext(DescriptionListContext);
  const context = React.useMemo(() => ({ ...parent, grouped: true }), [parent]);
  const { layout, divided } = parent;
  return (
    <DescriptionListContext.Provider value={context}>
      <div
        data-slot="description-item"
        className={cn(
          "grid min-w-0 content-start gap-y-0.5",
          layout === "horizontal" && "sm:col-span-2 sm:grid-cols-subgrid sm:gap-x-6",
          layout === "vertical" && !divided && "not-first:mt-(--qx-control-cell-padding-y)",
          divided &&
            "border-t border-border-subtle py-(--qx-control-cell-padding-y) first:border-t-0",
          // Stacked flows lose the leading and trailing padding; a grid keeps it, because its
          // first row of cells has nothing above it to share a rule with either way.
          divided && layout !== "grid" && "first:pt-0 last:pb-0",
          className,
        )}
        {...props}
      />
    </DescriptionListContext.Provider>
  );
}

/*
 * Ruled bare pairs (`divided` without `DescriptionItem`). The rule is drawn above each term, and —
 * in the two-column layout — above each value too, so it runs across both tracks; the first pair
 * has none. Padding replaces the grid gap so the rule sits midway between pairs.
 */
const BARE_TERM_DIVIDED =
  "border-t border-border-subtle pt-(--qx-control-cell-padding-y) first:border-t-0 first:pt-0";
const BARE_TERM_DIVIDED_HORIZONTAL = "sm:pb-(--qx-control-cell-padding-y) sm:last-of-type:pb-0";
const BARE_DETAILS_DIVIDED = "pb-(--qx-control-cell-padding-y) last:pb-0";
const BARE_DETAILS_DIVIDED_HORIZONTAL =
  "sm:border-t sm:border-border-subtle sm:pt-(--qx-control-cell-padding-y) sm:[dt:first-child+&]:border-t-0 sm:[dt:first-child+&]:pt-0";

function DescriptionTerm({ className, ...props }: React.ComponentProps<"dt">) {
  const { layout, divided, grouped } = React.useContext(DescriptionListContext);
  const bare = divided && !grouped;
  return (
    <dt
      data-slot="description-term"
      className={cn(
        "min-w-0 text-muted-foreground",
        layout === "vertical" &&
          !grouped &&
          !divided &&
          "not-first:mt-(--qx-control-cell-padding-y)",
        bare && BARE_TERM_DIVIDED,
        bare && layout === "horizontal" && BARE_TERM_DIVIDED_HORIZONTAL,
        className,
      )}
      {...props}
    />
  );
}

function DescriptionDetails({ className, ...props }: React.ComponentProps<"dd">) {
  const { layout, divided, grouped } = React.useContext(DescriptionListContext);
  const bare = divided && !grouped;
  return (
    <dd
      data-slot="description-details"
      className={cn(
        // `min-w-0` lets a long identifier shrink its grid track instead of widening the page;
        // `wrap-break-word` then breaks it rather than letting it overflow.
        "min-w-0 text-foreground wrap-break-word",
        layout === "vertical" && !grouped && "mt-0.5",
        bare && BARE_DETAILS_DIVIDED,
        bare && layout === "horizontal" && BARE_DETAILS_DIVIDED_HORIZONTAL,
        className,
      )}
      {...props}
    />
  );
}

export type { DescriptionListLayout, DescriptionListProps };
export {
  DescriptionDetails,
  DescriptionItem,
  DescriptionList,
  DescriptionTerm,
  descriptionListVariants,
};
