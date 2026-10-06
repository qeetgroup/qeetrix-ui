"use client";

import { CheckIcon } from "lucide-react";
import * as React from "react";

import { logicalDirectionForKey } from "@/lib/direction";
import type { MessagesFor } from "@/lib/messages";
import { availabilityGridMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useResolvedDirection } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

interface AvailabilityGridProps {
  /** Column headers (e.g. ["Mon", "Tue", …]). */
  days: string[];
  /** Row labels (e.g. ["09:00", "09:30", …]). */
  times: string[];
  /** Selected slot keys, `"<dayIndex>:<timeIndex>"`. */
  value: string[];
  onValueChange: (value: string[]) => void;
  /** Booked/blocked slot keys, `"<dayIndex>:<timeIndex>"` — rendered disabled. */
  unavailable?: string[];
  /**
   * Header for the leading column of row (time) labels. @default "Time" — equivalent to
   * `messages={{ timeColumnHeader }}` and wins over it.
   */
  timeColumnHeader?: string;
  /** Accessible name for the whole grid. @default "Availability" */
  "aria-label"?: string;
  /** Use instead of `aria-label` when a visible heading already names the grid. */
  "aria-labelledby"?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"availabilityGrid">;
  className?: string;
}

/**
 * Week × time-slot picker (booking availability, shift planning).
 *
 * Implemented as an APG selection grid rather than a field of buttons: a 7 × 20
 * week is 140 controls, and one tab stop per cell makes the widget impossible to
 * pass through. The grid takes a single tab stop and moves focus with the arrow
 * keys, Home/End (row ends), Ctrl+Home/End (grid ends) and PageUp/PageDown
 * (column ends). Space or Enter toggles the focused slot.
 *
 * Rows carry `role="row"` with `display: contents`, so the CSS grid still lays
 * every cell out on one track list while the row/column relationship is exposed.
 * Header cells are real `columnheader`/`rowheader`s, and each slot additionally
 * names both of its axes — a slot's only visible content is a colour, so it has
 * no name to fall back on.
 *
 * Unavailable slots use `aria-disabled`, not `disabled`: they stay focusable, so
 * arrowing across the grid does not skip over them silently.
 *
 * No state rests on colour. A selected slot carries a check mark on the quiet Qeet tint, an
 * unavailable slot is hatched in a sunken well, a free slot is the plain surface — and under
 * forced colours selection takes the system highlight and the hatch is redrawn in GrayText. The
 * slot height follows `data-qx-density` (`--qx-component-availability-grid-slot-height`).
 *
 * The tab stop follows focus wherever it comes from — arrow keys, a click, or a
 * programmatic `focus()` — so returning to the widget lands where the user left.
 *
 * Under `dir="rtl"` the CSS grid lays its columns out right-to-left, so the
 * inline arrow keys mirror with it: ArrowLeft advances to the next day. Home/End
 * and PageUp/PageDown address the first/last column and row, which are the same
 * cells in either direction.
 */
function AvailabilityGrid({
  days,
  times,
  value,
  onValueChange,
  unavailable = [],
  timeColumnHeader,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  messages: messageOverrides,
  className,
}: AvailabilityGridProps) {
  const messages = useMessages("availabilityGrid", availabilityGridMessages, messageOverrides);
  const selected = new Set(value);
  const blocked = new Set(unavailable);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const direction = useResolvedDirection(gridRef);
  // The single tab stop, as [row, column] into the slot area (headers excluded).
  const [focused, setFocused] = React.useState<[number, number]>([0, 0]);

  const rowCount = times.length;
  const columnCount = days.length;
  // Clamped on read so shrinking `days`/`times` cannot leave the roving tab stop
  // on a cell that no longer exists — which would drop the tab stop entirely.
  const activeRow = Math.min(focused[0], Math.max(0, rowCount - 1));
  const activeColumn = Math.min(focused[1], Math.max(0, columnCount - 1));

  const toggle = (key: string) => {
    if (blocked.has(key)) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onValueChange([...next]);
  };

  const moveTo = (row: number, column: number) => {
    if (rowCount === 0 || columnCount === 0) return;
    const r = Math.min(Math.max(row, 0), rowCount - 1);
    const c = Math.min(Math.max(column, 0), columnCount - 1);
    setFocused([r, c]);
    gridRef.current?.querySelector<HTMLElement>(`[data-row="${r}"][data-column="${c}"]`)?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const row = Number(target.dataset.row);
    const column = Number(target.dataset.column);
    if (Number.isNaN(row) || Number.isNaN(column)) return;

    switch (event.key) {
      // Column order follows the reading direction, so the *key* that means
      // "next column" does too. The grid never mirrors its row order.
      case "ArrowRight":
      case "ArrowLeft":
        event.preventDefault();
        moveTo(
          row,
          column + (logicalDirectionForKey(event.key, direction) === "inline-end" ? 1 : -1),
        );
        break;
      case "ArrowDown":
        event.preventDefault();
        moveTo(row + 1, column);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveTo(row - 1, column);
        break;
      case "Home":
        event.preventDefault();
        moveTo(event.ctrlKey ? 0 : row, 0);
        break;
      case "End":
        event.preventDefault();
        moveTo(event.ctrlKey ? rowCount - 1 : row, columnCount - 1);
        break;
      case "PageUp":
        event.preventDefault();
        moveTo(0, column);
        break;
      case "PageDown":
        event.preventDefault();
        moveTo(rowCount - 1, column);
        break;
      case " ":
      case "Enter":
        event.preventDefault();
        toggle(`${column}:${row}`);
        break;
    }
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a native <table> would have to be re-`display`ed as a CSS grid to keep this layout, and overriding a table's display is what strips its implicit semantics. Explicit ARIA roles survive that.
    <div
      ref={gridRef}
      data-slot="availability-grid"
      role="grid"
      aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? messages.label)}
      aria-labelledby={ariaLabelledBy}
      aria-multiselectable="true"
      aria-rowcount={rowCount + 1}
      aria-colcount={columnCount + 1}
      onKeyDown={onKeyDown}
      data-direction={direction}
      className={cn(
        "inline-grid gap-px overflow-hidden rounded-lg border border-border bg-border",
        className,
      )}
      style={{ gridTemplateColumns: `auto repeat(${days.length}, minmax(3rem, 1fr))` }}
    >
      {/* `display: contents` keeps the single CSS grid while giving assistive
          technology the row structure it needs. */}
      {/* biome-ignore lint/a11y/useSemanticElements: see the role="grid" note above. */}
      {/* biome-ignore lint/a11y/useFocusableInteractive: rows and header cells are structure, not tab stops — the roving tab stop lives on a gridcell. */}
      <div role="row" className="contents">
        {/* biome-ignore lint/a11y/useSemanticElements: see the role="grid" note above. */}
        {/* biome-ignore lint/a11y/useFocusableInteractive: header cells are structure, not tab stops. */}
        <div role="columnheader" className="bg-card">
          {/* A header cell with no text is an `empty-table-header` failure, and
              this column really does hold the time labels. */}
          <span className="sr-only">{timeColumnHeader ?? messages.timeColumnHeader}</span>
        </div>
        {days.map((d, di) => (
          // biome-ignore lint/a11y/useSemanticElements: see the role="grid" note above.
          // biome-ignore lint/a11y/useFocusableInteractive: header cells are structure, not tab stops.
          <div
            // By position: two columns may share a label ("Mon" in a two-week grid).
            // biome-ignore lint/suspicious/noArrayIndexKey: the index *is* the column's identity — slot keys are "<day>:<time>" indices too.
            key={di}
            role="columnheader"
            className="bg-card px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      {times.map((t, ti) => (
        // biome-ignore lint/a11y/useSemanticElements: see the role="grid" note above.
        // biome-ignore lint/a11y/useFocusableInteractive: rows are structure, not tab stops.
        // biome-ignore lint/suspicious/noArrayIndexKey: by position, as above — two rows may share a label.
        <div role="row" className="contents" key={ti}>
          {/* biome-ignore lint/a11y/useSemanticElements: see the role="grid" note above. */}
          {/* biome-ignore lint/a11y/useFocusableInteractive: header cells are structure, not tab stops. */}
          <div
            role="rowheader"
            className="flex items-center justify-end bg-card px-2 text-end text-xs whitespace-nowrap text-muted-foreground tabular-nums"
          >
            {t}
          </div>
          {days.map((d, di) => {
            const key = `${di}:${ti}`;
            const isBlocked = blocked.has(key);
            const isSel = selected.has(key);
            const isTabStop = ti === activeRow && di === activeColumn;
            return (
              // biome-ignore lint/a11y/useSemanticElements: a <td> cannot be the focusable cell; the button *is* the gridcell.
              <button
                key={key}
                type="button"
                role="gridcell"
                data-row={ti}
                data-column={di}
                tabIndex={isTabStop ? 0 : -1}
                aria-selected={isSel}
                aria-disabled={isBlocked || undefined}
                aria-label={messages.slot(d, t)}
                onFocus={() => setFocused([ti, di])}
                onClick={() => {
                  setFocused([ti, di]);
                  toggle(key);
                }}
                data-state={isBlocked ? "unavailable" : isSel ? "selected" : "available"}
                className={cn(
                  "flex h-(--qx-component-availability-grid-slot-height) items-center justify-center transition-colors duration-fast ease-standard outline-none focus-visible:focus-ring-inset",
                  isBlocked
                    ? "cursor-not-allowed bg-(--qx-component-availability-grid-unavailable-background) [background-image:repeating-linear-gradient(45deg,transparent,transparent_5px,var(--qx-component-availability-grid-unavailable-pattern)_5px,var(--qx-component-availability-grid-unavailable-pattern)_6px)] forced-colors:bg-[Canvas] forced-colors:forced-color-adjust-none forced-colors:[--qx-component-availability-grid-unavailable-pattern:GrayText]"
                    : isSel
                      ? "bg-(--qx-component-availability-grid-selected-background) text-(--qx-component-availability-grid-selected-indicator) hover:bg-(--qx-component-availability-grid-selected-background-hover) forced-colors-selected"
                      : "bg-(--qx-component-availability-grid-slot-background) hover:bg-(--qx-component-availability-grid-slot-background-hover)",
                )}
              >
                {isSel && !isBlocked && <CheckIcon aria-hidden className="size-3.5" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export type { AvailabilityGridProps };
export { AvailabilityGrid };
