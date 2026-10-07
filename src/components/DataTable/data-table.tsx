"use client";

import { ArrowDownIcon } from "@qeetrix/icons/icons/arrow-down";
import { ArrowUpIcon } from "@qeetrix/icons/icons/arrow-up";
import { CheckIcon } from "@qeetrix/icons/icons/check";
import { ChevronDownIcon } from "@qeetrix/icons/icons/chevron-down";
import { ChevronLeftIcon } from "@qeetrix/icons/icons/chevron-left";
import { ChevronRightIcon } from "@qeetrix/icons/icons/chevron-right";
import { ChevronsUpDownIcon } from "@qeetrix/icons/icons/chevrons-up-down";
import { CirclePlusIcon } from "@qeetrix/icons/icons/circle-plus";
import { DownloadIcon } from "@qeetrix/icons/icons/download";
import { InboxIcon } from "@qeetrix/icons/icons/inbox";
import { PinIcon } from "@qeetrix/icons/icons/pin";
import { Rows2Icon } from "@qeetrix/icons/icons/rows-2";
import { Rows3Icon } from "@qeetrix/icons/icons/rows-3";
import { SearchIcon } from "@qeetrix/icons/icons/search";
import { SlidersHorizontalIcon } from "@qeetrix/icons/icons/sliders-horizontal";
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Header,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import { Badge } from "@/components/Badge/badge";
import { Button } from "@/components/Button/button";
import { Checkbox } from "@/components/Checkbox/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu/dropdown-menu";
import { EmptyState } from "@/components/EmptyState/empty-state";
import { Input } from "@/components/Input/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover/popover";
import { Separator } from "@/components/Separator/separator";
import { Skeleton } from "@/components/Spinner/skeleton";
import {
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Table/table";
import { DENSITY_MODES } from "@/contracts/density";
import { VisuallyHidden } from "@/internal/visually-hidden";
import { logicalDirectionForKey } from "@/lib/direction";
import type { DataTableMessages, MessagesFor } from "@/lib/messages";
import { dataTableMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { type Density, useDensity } from "@/providers/density-provider";
import { type Direction, useResolvedDirection } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";
import { readStoredJson, writeStoredJson } from "@/runtime/storage";

interface DataTableFacet {
  /**
   * The column id this facet filters. DataTable filters a faceted column by **exact** match on
   * its value (or any of its values, for an array cell), unless the column sets its own
   * `filterFn`. TanStack's `"arrIncludesSome"` — which these docs used to name — matches a string
   * cell by substring, so choosing "active" also kept "inactive" rows; it is upgraded to the exact
   * filter too.
   */
  columnId: string;
  /** Label shown on the filter trigger. */
  title: string;
  /** Explicit options; if omitted, derived from the column's unique values. */
  options?: { label: string; value: string }[];
}

/** Exact facet match: the cell's value (or one of an array cell's values) is among those selected. */
function facetFilter<TData>(row: Row<TData>, columnId: string, selected: unknown): boolean {
  if (!Array.isArray(selected) || selected.length === 0) return true;
  const cell = row.getValue(columnId);
  const values = Array.isArray(cell) ? cell.map(String) : [String(cell)];
  return values.some((value) => selected.includes(value));
}
facetFilter.autoRemove = (value: unknown) => !Array.isArray(value) || value.length === 0;

/** A column definition's id, as TanStack derives it (explicit id, else the accessor key). */
function columnDefId<TData, TValue>(column: ColumnDef<TData, TValue>): string | undefined {
  if (column.id) return column.id;
  const key = (column as { accessorKey?: unknown }).accessorKey;
  return key === undefined ? undefined : String(key);
}

interface DataTableState {
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  globalFilter?: string;
  pagination?: PaginationState;
  rowSelection?: RowSelectionState;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /**
   * Visible `<caption>`. A native caption names the table for assistive technology, so this is
   * the preferred way to identify a table that sits among others.
   */
  caption?: React.ReactNode;
  /** Accessible name for the table when no visible caption is wanted. Ignored if `caption` is set. */
  label?: string;
  /**
   * The rows on screen are stale while a fetch is in flight. Sets `aria-busy` on the table and
   * announces the wait in a polite live region, so the change is not silent. The rows stay where
   * they are — a refetch must not flash a skeleton — and a thin progress rule runs along the top
   * of the body.
   */
  busy?: boolean;
  /**
   * There are no rows yet because the first fetch is still in flight. Renders placeholder rows in
   * the shape of the table instead of the empty state, which would otherwise flash "No results"
   * before the data arrives. Announced like `busy`.
   */
  loading?: boolean;
  /**
   * The rows could not be loaded. Rendered in place of the rows and announced as an alert. A string
   * gets the built-in error panel; any other node is rendered as given, so a panel with a retry
   * action (an `EmptyState` with an `action`, for example) can replace it entirely.
   */
  error?: React.ReactNode;
  /** Partially controlled table state. Omitted keys continue using internal state. */
  state?: DataTableState;
  onSortingChange?: OnChangeFn<SortingState>;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  onGlobalFilterChange?: OnChangeFn<string>;
  onPaginationChange?: OnChangeFn<PaginationState>;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  /** Consumer supplies already sorted rows. */
  manualSorting?: boolean;
  /** Consumer supplies rows already filtered by global and column filters. */
  manualFiltering?: boolean;
  /** Consumer supplies the current page of rows. */
  manualPagination?: boolean;
  /** Total page count for manual pagination. Prefer `rowCount` when known. */
  pageCount?: number;
  /** Total filtered row count across all server pages. */
  rowCount?: number;
  /** Stable row identity, required for selection that survives sorting or server pagination. */
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
  /**
   * Human name for a row, used to disambiguate its per-row controls — the selection checkbox
   * becomes "Select Ada Lovelace" instead of the "Select row" every row would otherwise share.
   * Without it an assistive-technology control list is a column of identical entries.
   */
  getRowLabel?: (row: Row<TData>) => string;
  /** Show the toolbar global-search box. */
  enableSearch?: boolean;
  searchPlaceholder?: string;
  /** Show the toolbar column-visibility menu. */
  enableColumnVisibility?: boolean;
  /** Prepend a checkbox column + selection strip with bulk actions. */
  enableRowSelection?: boolean;
  /**
   * Allow resizing column edges, by pointer drag or by focusing the edge separator and using
   * the arrow / Home / End keys. Bounds come from each column's `minSize` / `maxSize`.
   */
  enableColumnResizing?: boolean;
  /** Allow pinning columns left/right (sticky) via each column's header menu. */
  enablePinning?: boolean;
  /** Prepend an expander column; pair with `renderSubComponent`. */
  enableExpanding?: boolean;
  getRowCanExpand?: (row: Row<TData>) => boolean;
  /** Detail panel rendered beneath an expanded row (ignored when virtualized). */
  renderSubComponent?: (row: Row<TData>) => React.ReactNode;
  /** Per-column multi-select filters shown in the toolbar. */
  facetedFilters?: DataTableFacet[];
  /** Show a "Export CSV" toolbar button (exports the filtered rows). */
  enableExport?: boolean;
  exportFilename?: string;
  /**
   * How exported cells that a spreadsheet would evaluate as a formula are handled.
   * `"prefix"` (default) prepends an apostrophe so the cell is read as text. `"none"` writes
   * values verbatim — only correct when every exported value is trusted, and it makes the file
   * unsafe to open in a spreadsheet otherwise.
   */
  exportFormulaEscaping?: "prefix" | "none";
  /** Show a comfortable/compact density toggle. */
  enableDensity?: boolean;
  defaultDensity?: Density;
  /** Virtualize rows for large datasets. Requires `maxHeight`; disables pagination. */
  enableVirtualization?: boolean;
  estimateRowHeight?: number;
  /** Max body height (enables vertical scroll + sticky header). Number = px. */
  maxHeight?: number | string;
  /** Persist sorting / visibility / sizing / pinning / density to localStorage. */
  persistKey?: string;
  /** Rows per page; `0` disables pagination (renders all rows). */
  pageSize?: number;
  /** Actions rendered at the far right of the toolbar (e.g. a "New" button). */
  toolbarActions?: React.ReactNode;
  /** Bulk actions for the selection strip; receives the currently selected rows. */
  bulkActions?: (rows: Row<TData>[]) => React.ReactNode;
  /** Rendered in place of rows when there are none (or no matches). */
  emptyState?: React.ReactNode;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"dataTable">;
  className?: string;
}

const SELECT_COLUMN_ID = "__select__";
const EXPANDER_COLUMN_ID = "__expander__";
const STRUCTURAL_COLUMN_IDS = new Set([SELECT_COLUMN_ID, EXPANDER_COLUMN_ID]);

/**
 * Resize bounds every column gets unless its own `ColumnDef` overrides `minSize` / `maxSize`.
 * TanStack's defaults are 20px and `Number.MAX_SAFE_INTEGER`; a resize separator has to publish
 * `aria-valuemin` / `aria-valuemax`, and `Number.MAX_SAFE_INTEGER` makes every width 0% of the
 * range. Finite bounds keep the announced value model meaningful and the same for pointer and
 * keyboard, since TanStack clamps both to them.
 */
const COLUMN_MIN_SIZE = 40;
const COLUMN_MAX_SIZE = 960;

/** Column width step per arrow keypress on a resize separator. */
const COLUMN_RESIZE_STEP = 8;

/**
 * Viewport height the row virtualizer assumes before it can measure the scroll container — on the
 * server, and on the first client render. Without it the virtual range is empty, so a virtualized
 * table server-renders a header and no rows at all.
 */
const VIRTUAL_VIEWPORT_FALLBACK = 480;

function useControllableTableState<T>(
  controlledValue: T | undefined,
  initialValue: T,
  onChange: OnChangeFn<T> | undefined,
) {
  const [internalValue, setInternalValue] = React.useState(initialValue);
  const value = controlledValue ?? internalValue;
  const handleChange = React.useCallback<OnChangeFn<T>>(
    (updater) => {
      if (controlledValue === undefined) {
        setInternalValue(updater);
      }
      onChange?.(updater);
    },
    [controlledValue, onChange],
  );

  return [value, handleChange, setInternalValue] as const;
}

/** Humanise a column id ("createdAt" / "created_at" → "created At" → menu label). */
function columnLabel(id: string): string {
  return id.replace(/[_-]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

/* ── CSV export safety ─────────────────────────────────────────────────────────────────────
 * A spreadsheet evaluates a cell that begins with `=`, `+`, `-` or `@` instead of displaying
 * it, so untrusted row data can execute formulas — DDE and web-request functions included — on
 * the machine of whoever opens the export. CSV quoting does not help: a quoted `=1+1` is still
 * evaluated. The cell content itself has to be neutralised, which is what the leading apostrophe
 * below does: every spreadsheet treats it as "the rest of this cell is text".
 *
 * A leading tab or carriage return is a risk in its own right, because those are the characters
 * used to hide a formula lead from a naive first-character check.
 *
 * Plain numbers are deliberately left alone. `-5` begins with a formula character but is data,
 * and exporting it as text would break every sum in the resulting sheet.
 */

/** Characters a spreadsheet reads as the start of a formula. */
const CSV_FORMULA_LEAD = /^[=+\-@]/;

/** Leading bytes that can hide a formula lead from a first-character check. */
const CSV_SMUGGLING_LEAD = /^[\t\r]/;

/** A plain number, which may legitimately begin with `+` or `-`. */
const CSV_PLAIN_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/** Whether a spreadsheet would evaluate this cell rather than display it. */
function isCsvFormula(raw: string): boolean {
  if (CSV_SMUGGLING_LEAD.test(raw)) return true;
  const value = raw.replace(/^\s+/, "");
  return CSV_FORMULA_LEAD.test(value) && !CSV_PLAIN_NUMBER.test(value);
}

/**
 * Serialise one cell: neutralise formulas, then quote for CSV structure if the result contains
 * a comma, quote, or line break.
 */
function csvField(value: unknown, guardFormulas: boolean): string {
  const raw = value == null ? "" : String(value);
  const str = guardFormulas && isCsvFormula(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * Sticky offsets + z-index for a pinned column.
 *
 * TanStack names the two pin sides "left" and "right", and they mean the inline start and end:
 * the first columns in reading order and the last. The offsets are therefore written as logical
 * insets, so a table under `dir="rtl"` keeps its start-pinned columns on the right, where its
 * reading order begins — a physical `left` would have stuck them to the far end of the row.
 */
function pinStyles<TData>(column: Column<TData>): React.CSSProperties {
  const pinned = column.getIsPinned();
  if (!pinned) return {};
  return {
    position: "sticky",
    insetInlineStart: pinned === "left" ? column.getStart("left") : undefined,
    insetInlineEnd: pinned === "right" ? column.getAfter("right") : undefined,
    zIndex: 2,
  };
}

/**
 * Classes for a pinned cell. A pinned cell must be opaque, or the columns scrolling under it show
 * through; it repaints the row's own tint (`--qx-table-row-background`, published by `TableRow`)
 * over the surface so hover and selection still read across the whole row. The edge facing the
 * scrolling columns gets a hairline, drawn as a pseudo-element because a collapsed-border table
 * paints cell borders on the table, where they would not travel with the sticky cell.
 */
function pinClasses<TData>(column: Column<TData>, header: boolean): string | undefined {
  const pinned = column.getIsPinned();
  if (!pinned) return undefined;
  const edge =
    pinned === "left"
      ? column.getIsLastColumn("left") &&
        "after:absolute after:inset-y-0 after:inset-e-0 after:w-px after:bg-border"
      : column.getIsFirstColumn("right") &&
        "after:absolute after:inset-y-0 after:inset-s-0 after:w-px after:bg-border";
  return cn(
    !header &&
      "bg-surface bg-[linear-gradient(var(--qx-table-row-background),var(--qx-table-row-background))]",
    edge,
  );
}

/** A column's visible name: its header when that is plain text, else its humanised id. */
function columnDisplayName<TData>(column: Column<TData, unknown>): string {
  const { header } = column.columnDef;
  return typeof header === "string" && header.trim() ? header : columnLabel(column.id);
}

/** Placeholder bar widths, cycled across columns so loading rows do not read as a grid of bars. */
const SKELETON_WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-2/5", "w-4/5"] as const;

/** Toolbar multi-select filter for a single column (faceted). */
function FacetedFilter<TData>({
  column,
  title,
  options,
  messages,
}: {
  column?: Column<TData, unknown>;
  title: string;
  options?: { label: string; value: string }[];
  /** Resolved once by the table, so every filter popover reads alike. */
  messages: DataTableMessages;
}) {
  const facets = column?.getFacetedUniqueValues();
  const selected = new Set((column?.getFilterValue() as string[]) ?? []);
  const resolved =
    options ??
    Array.from(facets?.keys() ?? [])
      .filter((v) => v != null)
      .map((v) => ({ label: String(v), value: String(v) }));

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="border-dashed">
            <CirclePlusIcon aria-hidden /> {title}
            {selected.size > 0 && (
              <>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                  {selected.size}
                </Badge>
              </>
            )}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-52 p-1">
        <div className="max-h-64 overflow-y-auto">
          {resolved.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">{messages.noOptions}</p>
          )}
          {resolved.map((option) => {
            const isSelected = selected.has(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:focus-ring-inset"
                onClick={() => {
                  const next = new Set(selected);
                  if (isSelected) next.delete(option.value);
                  else next.add(option.value);
                  const values = Array.from(next);
                  column?.setFilterValue(values.length ? values : undefined);
                }}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-sm border",
                    // The Checkbox's checked look, so a faceted option reads as the same control.
                    isSelected
                      ? "border-border-brand bg-primary text-primary-foreground forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]"
                      : "border-input",
                  )}
                >
                  {isSelected && <CheckIcon aria-hidden className="size-3" />}
                </span>
                <span className="flex-1 text-start">{option.label}</span>
                {facets?.get(option.value) != null && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {facets.get(option.value)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {selected.size > 0 && (
          <>
            <Separator className="my-1" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => column?.setFilterValue(undefined)}
            >
              {messages.clearFilter}
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ── Column resize separator ───────────────────────────────────────────────────────────────
 * A column edge is a window splitter: focusable, oriented, and carrying the width it controls.
 * The previous handle was a `<button>`, which announced as "Resize name column, button" and
 * exposed no value at all — nothing told you what the width was before or after a keypress, and
 * the 4px hit area was hard to grab. Here the control is a `separator` with a value model
 * (`aria-valuenow` in pixels, plus the bounds TanStack actually clamps to), a 12px pointer
 * target, and a 1px visual line that stays 1px.
 */
function ColumnResizeHandle<TData, TValue>({
  header,
  onResize,
  messages,
  direction,
}: {
  header: Header<TData, TValue>;
  onResize: (columnId: string, size: number) => void;
  /** Resolved once by the table, so every separator reads alike. */
  messages: DataTableMessages;
  /**
   * The edge sits at the column's inline end, which is its left side under `dir="rtl"`. The arrow
   * that moves the edge outward — and so widens the column — mirrors with it.
   */
  direction: Direction;
}) {
  const { column } = header;
  const size = Math.round(column.getSize());
  const min = column.columnDef.minSize ?? COLUMN_MIN_SIZE;
  const max = column.columnDef.maxSize ?? COLUMN_MAX_SIZE;

  return (
    // An `<hr>` rather than a `div role="separator"`: same role, no explicit role to keep in
    // sync, and the 1px rule is drawn as a pseudo-element so the focusable box can be 12px wide
    // without the visible line following it.
    <hr
      data-slot="data-table-column-resizer"
      aria-orientation="vertical"
      aria-label={messages.resizeColumn(columnLabel(column.id))}
      aria-valuenow={size}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={messages.columnWidth(size)}
      tabIndex={0}
      data-resizing={column.getIsResizing() ? "" : undefined}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        const logical = logicalDirectionForKey(e.key, direction);
        const next =
          logical === "inline-start"
            ? size - COLUMN_RESIZE_STEP
            : logical === "inline-end"
              ? size + COLUMN_RESIZE_STEP
              : e.key === "Home"
                ? min
                : e.key === "End"
                  ? max
                  : null;
        if (next === null) return;
        e.preventDefault();
        onResize(column.id, Math.min(max, Math.max(min, next)));
      }}
      className={cn(
        "absolute inset-e-0 top-0 z-1 m-0 h-full w-3 cursor-col-resize touch-none border-0 bg-transparent select-none outline-none",
        "after:absolute after:inset-e-0 after:top-0 after:h-full after:w-px after:bg-border-strong after:opacity-0 after:transition-opacity after:duration-fast after:content-['']",
        "hover:after:opacity-100 focus-visible:after:w-0.5 focus-visible:after:bg-ring focus-visible:after:opacity-100",
        "data-resizing:after:w-0.5 data-resizing:after:bg-border-brand data-resizing:after:opacity-100",
      )}
    />
  );
}

/* ── Persisted UI state ────────────────────────────────────────────────────────────────────
 * `persistKey` names a slot in localStorage holding the preferences a user set by hand: sort,
 * which columns are shown, their widths, what is pinned, and density. Three things about that
 * slot are not under this component's control, and all three used to be assumed away.
 *
 * The bytes are consumer-writable, so a payload that parses is still not a state — `{"sorting":
 * "name"}` reached TanStack and threw `sorting.find is not a function` out of render, taking the
 * table down. Every field is now checked against the shape it must have, and anything else is
 * treated as no preference at all.
 *
 * The write can be refused: `QuotaExceededError` on a full origin, `SecurityError` where storage
 * is disabled. That threw from inside an effect, which unmounts the tree — a table stopped
 * rendering because it could not save a column width. Writes go through the failure-safe adapter
 * and a refusal now costs the preference and nothing else.
 *
 * And the key can change while mounted. It named the previous table's state, so switching from
 * one saved view to another wrote the old view's sort over the new key and then kept showing the
 * old view: the load ran once per mount, not once per key. Loading is keyed now, every slot the
 * key owns is replaced rather than merged, and no write happens until the state in hand belongs
 * to the key it would be written under.
 */

const PERSIST_KEY_PREFIX = "qx-datatable:";

/** The subset of table state `persistKey` round-trips. Every field is optional in storage. */
interface PersistedTableState {
  sorting?: SortingState;
  columnVisibility?: VisibilityState;
  columnSizing?: ColumnSizingState;
  columnPinning?: ColumnPinningState;
  density?: Density;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `{ id, desc }[]`, dropping anything that is not that. */
function parseSorting(value: unknown): SortingState | undefined {
  if (!Array.isArray(value)) return undefined;
  const sorting: SortingState = [];
  for (const entry of value) {
    if (isRecord(entry) && typeof entry.id === "string" && typeof entry.desc === "boolean") {
      sorting.push({ id: entry.id, desc: entry.desc });
    }
  }

  return sorting;
}

/** A record of column id → value, keeping only the entries whose value is of `type`. */
function parseColumnRecord<T extends boolean | number>(
  value: unknown,
  type: "boolean" | "number",
): Record<string, T> | undefined {
  if (!isRecord(value)) return undefined;
  const record: Record<string, T> = {};
  for (const [id, entry] of Object.entries(value)) {
    if (typeof entry !== type) continue;
    if (type === "number" && !Number.isFinite(entry)) continue;
    record[id] = entry as T;
  }

  return record;
}

/** `{ left, right }` of column ids. */
function parsePinning(value: unknown): ColumnPinningState | undefined {
  if (!isRecord(value)) return undefined;
  const side = (entry: unknown) =>
    Array.isArray(entry) ? entry.filter((id): id is string => typeof id === "string") : [];

  return { left: side(value.left), right: side(value.right) };
}

/**
 * A stored payload, or `undefined` if it is not one.
 *
 * Partial credit is deliberate: a payload with a valid sort and a corrupt sizing map keeps the
 * sort. Only an entry that is not an object at all is discarded whole.
 */
function parsePersistedState(value: unknown): PersistedTableState | undefined {
  if (!isRecord(value)) return undefined;

  return {
    sorting: parseSorting(value.sorting),
    columnVisibility: parseColumnRecord<boolean>(value.columnVisibility, "boolean"),
    columnSizing: parseColumnRecord<number>(value.columnSizing, "number"),
    columnPinning: parsePinning(value.columnPinning),
    density: DENSITY_MODES.find((mode) => mode === value.density),
  };
}

/**
 * DataTable wraps TanStack Table over the qeetrix Table primitives. Out of the
 * box: sorting, global search, pagination, column visibility, and row
 * selection. Opt-in enterprise depth: column resizing/pinning, row
 * virtualization, expandable detail rows, faceted filters, CSV export, a
 * density toggle, a sticky header, and `persistKey` state persistence. State is
 * internal by default; use partial `state` plus matching callbacks and manual
 * flags for server-owned sorting, filtering, pagination, and selection.
 *
 * Accessibility notes worth knowing before you turn features on:
 * - `enableVirtualization` publishes `aria-rowcount` / `aria-rowindex` so the total and each
 *   row's position stay correct while only a window of rows is in the DOM. Rows outside that
 *   window are still absent from the accessibility tree — scrolling is what brings them in, so
 *   the scroll region is focusable and the table stays keyboard-reachable.
 * - `getRowLabel` is strongly recommended with `enableRowSelection` or `enableExpanding`;
 *   without it every row's control shares one generic name.
 * - `caption` (or `label`) names the table. Give one to any table that shares a page with
 *   another.
 */
function DataTable<TData, TValue>({
  columns,
  data,
  caption,
  label,
  busy = false,
  loading = false,
  error,
  state: controlledState,
  onSortingChange,
  onColumnFiltersChange,
  onGlobalFilterChange,
  onPaginationChange,
  onRowSelectionChange,
  manualSorting = false,
  manualFiltering = false,
  manualPagination = false,
  pageCount,
  rowCount,
  getRowId,
  getRowLabel,
  enableSearch = true,
  searchPlaceholder,
  enableColumnVisibility = true,
  enableRowSelection = false,
  enableColumnResizing = false,
  enablePinning = false,
  enableExpanding = false,
  getRowCanExpand,
  renderSubComponent,
  facetedFilters,
  enableExport = false,
  exportFilename = "export.csv",
  exportFormulaEscaping = "prefix",
  enableDensity = false,
  defaultDensity,
  enableVirtualization = false,
  estimateRowHeight,
  maxHeight,
  persistKey,
  pageSize = 10,
  toolbarActions,
  bulkActions,
  emptyState,
  messages: messageOverrides,
  className,
}: DataTableProps<TData, TValue>) {
  const messages = useMessages("dataTable", dataTableMessages, messageOverrides);
  const inheritedDensity = useDensity();
  const rootRef = React.useRef<HTMLDivElement>(null);
  // Resize gestures and the resize keys follow the reading direction.
  const direction = useResolvedDirection(rootRef);
  const captionId = React.useId();
  const [sorting, setSorting, setInternalSorting] = useControllableTableState(
    controlledState?.sorting,
    [] as SortingState,
    onSortingChange,
  );
  const [columnFilters, setColumnFilters] = useControllableTableState(
    controlledState?.columnFilters,
    [] as ColumnFiltersState,
    onColumnFiltersChange,
  );
  const [globalFilter, setGlobalFilter] = useControllableTableState(
    controlledState?.globalFilter,
    "",
    onGlobalFilterChange,
  );
  const [pagination, setPagination] = useControllableTableState(
    controlledState?.pagination,
    { pageIndex: 0, pageSize } as PaginationState,
    onPaginationChange,
  );
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useControllableTableState(
    controlledState?.rowSelection,
    {} as RowSelectionState,
    onRowSelectionChange,
  );
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({
    left: [],
    right: [],
  });
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [densityOverride, setDensityOverride] = React.useState<Density | undefined>(defaultDensity);
  const density = densityOverride ?? inheritedDensity;

  // Which storage slot the state in hand came from. State, not a ref, so the write below sees
  // the key as it was when this render was produced: on the render where `persistKey` changed,
  // that is still the previous key, and the write is skipped instead of clobbering the new one.
  const storageKey = persistKey ? `${PERSIST_KEY_PREFIX}${persistKey}` : null;
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (loadedKey === storageKey) return;
    if (storageKey === null) {
      setLoadedKey(null);
      return;
    }

    // A different key is a different saved view: every slot it owns is replaced, so nothing
    // survives from the view before it.
    const saved = readStoredJson(storageKey, parsePersistedState);
    setInternalSorting(saved?.sorting ?? []);
    setColumnVisibility(saved?.columnVisibility ?? {});
    setColumnSizing(saved?.columnSizing ?? {});
    setColumnPinning(saved?.columnPinning ?? { left: [], right: [] });
    setDensityOverride(saved?.density ?? defaultDensity);
    setLoadedKey(storageKey);
  }, [defaultDensity, loadedKey, storageKey, setInternalSorting]);

  React.useEffect(() => {
    if (storageKey === null || loadedKey !== storageKey) return;
    // `densityOverride`, not the effective `density`: persisting the latter records the density
    // this table happened to inherit as though the user had chosen it, so a table that never
    // touched the toggle would keep restoring `comfortable` after the application switched its
    // ambient density to compact. Only a local choice is a preference.
    // A refusal (full origin, storage disabled) costs the preference, not the table.
    writeStoredJson(storageKey, {
      sorting,
      columnVisibility,
      columnSizing,
      columnPinning,
      density: densityOverride,
    });
  }, [
    storageKey,
    loadedKey,
    sorting,
    columnVisibility,
    columnSizing,
    columnPinning,
    densityOverride,
  ]);

  const paginated = pagination.pageSize > 0 && !enableVirtualization;

  // Read through a ref so an inline `getRowLabel` does not invalidate the column defs, and with
  // them TanStack's whole column model, on every render.
  const getRowLabelRef = React.useRef(getRowLabel);
  getRowLabelRef.current = getRowLabel;

  const resolvedColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    const extra: ColumnDef<TData, TValue>[] = [];
    if (enableRowSelection) {
      extra.push({
        id: SELECT_COLUMN_ID,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 40,
        header: ({ table }) => (
          <Checkbox
            // Without pagination the control selects everything, so saying "on this page" would
            // understate what it does.
            aria-label={paginated ? messages.selectAllOnPage : messages.selectAll}
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked === true)}
          />
        ),
        cell: ({ row }) => {
          const rowLabel = getRowLabelRef.current?.(row);
          return (
            <Checkbox
              aria-label={rowLabel ? messages.selectNamedRow(rowLabel) : messages.selectRow}
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onCheckedChange={(checked) => row.toggleSelected(checked === true)}
            />
          );
        },
      });
    }
    if (enableExpanding) {
      extra.push({
        id: EXPANDER_COLUMN_ID,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 40,
        header: () => null,
        cell: ({ row }) => {
          if (!row.getCanExpand()) return null;
          const rowLabel = getRowLabelRef.current?.(row);
          const expanded = row.getIsExpanded();
          return (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-expanded={expanded}
              aria-label={
                rowLabel
                  ? expanded
                    ? messages.collapseNamedRow(rowLabel)
                    : messages.expandNamedRow(rowLabel)
                  : expanded
                    ? messages.collapseRow
                    : messages.expandRow
              }
              onClick={row.getToggleExpandedHandler()}
            >
              {expanded ? (
                <ChevronDownIcon aria-hidden />
              ) : (
                <ChevronRightIcon aria-hidden className="rtl:rotate-180" />
              )}
            </Button>
          );
        },
      });
    }
    // Faceted columns filter by exact match unless they bring their own filterFn.
    const facetIds = new Set(facetedFilters?.map((facet) => facet.columnId));
    const own =
      facetIds.size === 0
        ? columns
        : columns.map((column) => {
            const id = columnDefId(column);
            if (!id || !facetIds.has(id)) return column;
            if (column.filterFn !== undefined && column.filterFn !== "arrIncludesSome")
              return column;
            return { ...column, filterFn: facetFilter } as ColumnDef<TData, TValue>;
          });
    return extra.length ? [...extra, ...own] : own;
  }, [columns, enableRowSelection, enableExpanding, paginated, messages, facetedFilters]);

  const sizingEnabled = enableColumnResizing || enablePinning;

  const table = useReactTable<TData>({
    data,
    columns: resolvedColumns,
    defaultColumn: { minSize: COLUMN_MIN_SIZE, maxSize: COLUMN_MAX_SIZE },
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
      pagination,
      columnPinning,
      columnSizing,
      expanded,
    },
    enableRowSelection,
    enableColumnResizing,
    manualSorting,
    manualFiltering,
    manualPagination,
    pageCount,
    rowCount,
    columnResizeMode: "onChange",
    columnResizeDirection: direction,
    getRowId,
    getRowCanExpand,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    ...(!manualSorting ? { getSortedRowModel: getSortedRowModel() } : {}),
    ...(!manualFiltering ? { getFilteredRowModel: getFilteredRowModel() } : {}),
    getExpandedRowModel: getExpandedRowModel(),
    ...(facetedFilters && !manualFiltering
      ? {
          getFacetedRowModel: getFacetedRowModel(),
          getFacetedUniqueValues: getFacetedUniqueValues(),
        }
      : {}),
    ...(paginated && !manualPagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedRowCount = Object.values(rowSelection).filter(Boolean).length;
  const hideableColumns = table.getAllColumns().filter((c) => c.getCanHide());
  const rows = table.getRowModel().rows;
  const colSpan = table.getVisibleLeafColumns().length || 1;
  const hasColumnFilters = columnFilters.length > 0;

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    // A first guess only: rendered rows are measured (`measureElement` below), so a row taller
    // than the estimate — wrapped text, a 28px action button — corrects the scroll extent instead
    // of overlapping its neighbour. The defaults are a single line of body text plus the density's
    // cell padding and the 1px separator.
    estimateSize: () => estimateRowHeight ?? (density === "compact" ? 33 : 45),
    overscan: 10,
    initialRect: {
      width: 0,
      height: typeof maxHeight === "number" ? maxHeight : VIRTUAL_VIEWPORT_FALLBACK,
    },
  });

  const scrollable = enableVirtualization || maxHeight != null;
  const virtualRows = enableVirtualization ? rowVirtualizer.getVirtualItems() : null;
  const paddingTop = virtualRows?.length ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows?.length
    ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
    : 0;

  const resizeColumn = React.useCallback((columnId: string, size: number) => {
    setColumnSizing((prev) => ({ ...prev, [columnId]: size }));
  }, []);

  /*
   * A scroll container that only responds to the pointer strands keyboard users on whichever
   * rows happen to be in view — under virtualization, a small fraction of the table. Making the
   * region focusable is what lets the arrow keys reach the rest of it.
   */
  const scrollRegionProps: React.HTMLAttributes<HTMLDivElement> = scrollable
    ? {
        role: "group",
        tabIndex: 0,
        "aria-labelledby": caption ? captionId : undefined,
        "aria-label": caption ? undefined : label,
      }
    : {};

  /* ── Virtualized row semantics ────────────────────────────────────────────────────────────
   * Virtualization keeps a window of rows in the DOM, so a screen reader counting `<tr>`
   * elements reports "row 4 of 17" for a 5,000-row table and treats the two layout spacers as
   * blank rows. The fix keeps the native table role — the table has no cell-level arrow-key
   * navigation, so promoting it to `role="grid"` would advertise a keyboard model it does not
   * implement — and instead uses the ARIA mechanism written for exactly this case:
   * `aria-rowcount` on the table plus `aria-rowindex` on every row present in the DOM, header
   * rows included, with the spacers hidden from the accessibility tree entirely.
   *
   * Indices are 1-based and count header rows, per ARIA, so the first body row of a table with
   * one header row is index 2. They come from the position in the current (sorted, filtered)
   * row model rather than `row.index`, which is the position in the source data.
   */
  const headerRowCount = table.getHeaderGroups().length;
  const ariaRowCount =
    enableVirtualization && rows.length > 0 ? headerRowCount + rows.length : undefined;
  const ariaRowIndex = (position: number) =>
    ariaRowCount === undefined ? undefined : headerRowCount + position + 1;

  function exportCsv() {
    if (typeof window === "undefined") return;
    const cols = table.getVisibleLeafColumns().filter((c) => !STRUCTURAL_COLUMN_IDS.has(c.id));
    const guard = exportFormulaEscaping === "prefix";
    const header = cols.map((c) => csvField(columnLabel(c.id), guard));
    const body = table
      .getFilteredRowModel()
      .rows.map((row) => cols.map((c) => csvField(row.getValue(c.id), guard)).join(","));
    const csv = [header.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const showToolbar =
    enableSearch ||
    enableColumnVisibility ||
    Boolean(facetedFilters?.length) ||
    enableDensity ||
    enableExport ||
    Boolean(toolbarActions);

  const isFiltering = hasColumnFilters || globalFilter.length > 0;
  const hasError = error != null && error !== false;
  const showRows = !loading && !hasError;
  const visibleColumns = table.getVisibleLeafColumns();
  const skeletonRowCount = Math.min(paginated ? pagination.pageSize : 5, 10);

  const resetFiltering = () => {
    table.resetColumnFilters();
    setGlobalFilter("");
  };

  const renderRow = (row: Row<TData>, position: number) => (
    <React.Fragment key={row.id}>
      <TableRow
        ref={enableVirtualization ? rowVirtualizer.measureElement : undefined}
        data-index={enableVirtualization ? position : undefined}
        aria-rowindex={ariaRowIndex(position)}
        data-state={row.getIsSelected() ? "selected" : undefined}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell
            key={cell.id}
            className={pinClasses(cell.column, false)}
            style={{
              width: sizingEnabled ? cell.column.getSize() : undefined,
              ...pinStyles(cell.column),
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
      {!enableVirtualization && row.getIsExpanded() && renderSubComponent && (
        <TableRow data-slot="data-table-detail-row" className="hover:bg-transparent">
          <TableCell colSpan={colSpan} className="bg-surface-subtle p-0 whitespace-normal">
            {renderSubComponent(row)}
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );

  /* ── Body states ──────────────────────────────────────────────────────────────────────────
   * Exactly one of: placeholder rows (first load), the error panel, the empty state, or data.
   * Each non-data state is a single full-width row, so the header — and with it the shape of the
   * table — stays put while the state changes.
   */
  let bodyState: React.ReactNode = null;
  if (loading) {
    bodyState = Array.from({ length: skeletonRowCount }, (_, rowIndex) => (
      // Placeholders carry no data; hidden so assistive technology meets the busy table and its
      // announcement instead of a column of empty rows.
      // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows have no identity but their position.
      <tr key={rowIndex} aria-hidden data-slot="data-table-skeleton-row" className="border-b">
        {visibleColumns.map((column, columnIndex) => (
          <td
            key={column.id}
            className="px-3 py-(--qx-control-cell-padding-y)"
            style={{ width: sizingEnabled ? column.getSize() : undefined }}
          >
            {STRUCTURAL_COLUMN_IDS.has(column.id) ? (
              <Skeleton className="size-4 rounded-(--qx-corner-sm)" />
            ) : (
              <Skeleton
                className={cn(
                  "h-3 rounded-(--qx-corner-sm)",
                  SKELETON_WIDTHS[(columnIndex + rowIndex) % SKELETON_WIDTHS.length],
                )}
              />
            )}
          </td>
        ))}
      </tr>
    ));
  } else if (hasError) {
    bodyState = (
      <tr data-slot="data-table-error-row">
        <td colSpan={colSpan} className="p-0">
          <div role="alert" data-slot="data-table-error">
            {typeof error === "string" || typeof error === "number" ? (
              // The system zero state, error variant: the destructive tint stays on the icon tile
              // so a failure reads as recoverable, not alarming.
              <EmptyState size="sm" variant="error" description={error} />
            ) : (
              error
            )}
          </div>
        </td>
      </tr>
    );
  } else if (rows.length === 0) {
    bodyState = (
      <tr data-slot="data-table-empty-row">
        <td colSpan={colSpan} className="p-0">
          {emptyState ?? (
            <EmptyState
              size="sm"
              // "No results" when a filter excluded the data, a neutral empty collection otherwise.
              variant={isFiltering ? "no-results" : "default"}
              icon={isFiltering ? undefined : InboxIcon}
              title={messages.emptyTitle}
              // The hint only applies when there is something to adjust; on a table that is
              // simply empty it would send the reader looking for a filter that is not there.
              description={isFiltering ? messages.emptyDescription : undefined}
              action={
                isFiltering ? (
                  <Button variant="outline" size="sm" onClick={resetFiltering}>
                    {messages.resetFilters}
                  </Button>
                ) : undefined
              }
            />
          )}
        </td>
      </tr>
    );
  }

  return (
    <div
      ref={rootRef}
      data-slot="data-table"
      data-density={density}
      data-qx-density={densityOverride}
      data-state={loading ? "loading" : hasError ? "error" : busy ? "busy" : undefined}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-surface text-foreground",
        className,
      )}
    >
      {showToolbar && (
        <div
          data-slot="data-table-toolbar"
          className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {enableSearch && (
              <div className="relative w-full sm:max-w-xs">
                <SearchIcon
                  aria-hidden
                  className="pointer-events-none absolute inset-s-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder={searchPlaceholder ?? messages.searchPlaceholder}
                  aria-label={messages.search}
                  className="ps-9"
                />
              </div>
            )}
            {facetedFilters?.map((facet) => (
              <FacetedFilter
                key={facet.columnId}
                column={table.getColumn(facet.columnId)}
                title={facet.title}
                options={facet.options}
                messages={messages}
              />
            ))}
            {hasColumnFilters && (
              <Button variant="ghost" size="sm" onClick={() => table.resetColumnFilters()}>
                {messages.resetFilters}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {enableDensity && (
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={density === "compact" ? messages.comfortableRows : messages.compactRows}
                onClick={() =>
                  setDensityOverride(density === "compact" ? "comfortable" : "compact")
                }
              >
                {density === "compact" ? <Rows3Icon aria-hidden /> : <Rows2Icon aria-hidden />}
              </Button>
            )}
            {enableExport && (
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <DownloadIcon aria-hidden /> {messages.exportRows}
              </Button>
            )}
            {enableColumnVisibility && hideableColumns.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm">
                      <SlidersHorizontalIcon aria-hidden /> {messages.columns}
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="min-w-40">
                  {/* A group label must sit inside its group — Base UI throws on opening the
                      menu otherwise — and the group is what the label names for a screen reader. */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{messages.toggleColumns}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {hideableColumns.map((column) => {
                      const named = typeof column.columnDef.header === "string";
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                          // A plain-text header is already the column's name as the reader knows
                          // it; only the humanised id needs its first letter raised.
                          className={named ? undefined : "capitalize"}
                        >
                          {columnDisplayName(column)}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {toolbarActions}
          </div>
        </div>
      )}

      {enableRowSelection && selectedRowCount > 0 && (
        // The selection strip speaks the Qeet selected vocabulary — the same quiet tint as the
        // selected rows — so the bulk actions read as belonging to them.
        <div
          data-slot="data-table-selection"
          className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border bg-brand-subtle px-3 py-1.5 text-sm text-foreground"
        >
          <span className="font-medium tabular-nums">
            {messages.selectedCount(selectedRowCount)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => table.resetRowSelection()}>
            {messages.clearSelection}
          </Button>
          {bulkActions && (
            <div className="ms-auto flex flex-wrap items-center gap-1.5">
              {bulkActions(selectedRows)}
            </div>
          )}
        </div>
      )}

      {/*
       * Always mounted, because a live region that appears at the same moment its text does is
       * routinely missed by screen readers.
       */}
      <VisuallyHidden data-slot="data-table-status" role="status">
        {busy || loading ? messages.loading : ""}
      </VisuallyHidden>

      <div className="relative">
        {busy && !loading && (
          // Refetch feedback that keeps the rows in place: a 2px rule along the top of the body.
          // `animate-pulse` is collapsed by the global reduced-motion rule, leaving a static bar.
          <div
            aria-hidden
            data-slot="data-table-progress"
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 animate-pulse bg-primary motion-reduce:animate-none"
          />
        )}
        <div
          ref={scrollRef}
          data-slot="data-table-scroll"
          {...scrollRegionProps}
          className={cn(
            "relative w-full overflow-x-auto focus-visible:focus-ring-inset",
            scrollable && "overflow-y-auto overscroll-contain",
          )}
          style={maxHeight != null ? { maxHeight } : undefined}
        >
          <table
            data-slot="table"
            aria-label={caption ? undefined : label}
            aria-rowcount={ariaRowCount}
            aria-busy={busy || loading || undefined}
            className="w-full caption-bottom text-sm tabular-nums"
            style={
              sizingEnabled ? { width: table.getTotalSize(), tableLayout: "fixed" } : undefined
            }
          >
            {caption && <TableCaption id={captionId}>{caption}</TableCaption>}
            <TableHeader sticky={scrollable}>
              {table.getHeaderGroups().map((headerGroup, headerIndex) => (
                <TableRow
                  key={headerGroup.id}
                  aria-rowindex={ariaRowCount === undefined ? undefined : headerIndex + 1}
                >
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    // Shift-click adds a column to the sort. With more than one sort key the order
                    // matters, so each sorted header shows its rank.
                    const sortRank =
                      sorted && sorting.length > 1 ? header.column.getSortIndex() + 1 : null;
                    const content = header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext());
                    return (
                      <TableHead
                        key={header.id}
                        aria-sort={
                          canSort
                            ? sorted === "asc"
                              ? "ascending"
                              : sorted === "desc"
                                ? "descending"
                                : "none"
                            : undefined
                        }
                        className={cn("relative", pinClasses(header.column, true))}
                        style={{
                          width: sizingEnabled ? header.getSize() : undefined,
                          ...pinStyles(header.column),
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-1">
                          {canSort ? (
                            <button
                              type="button"
                              data-sorted={sorted || undefined}
                              onClick={header.column.getToggleSortingHandler()}
                              className="-mx-1 inline-flex min-w-0 items-center gap-1 rounded-(--qx-corner-sm) px-1 py-0.5 outline-none transition-colors duration-fast hover:text-foreground focus-visible:focus-ring data-sorted:text-foreground"
                            >
                              <span className="truncate">{content}</span>
                              {sorted === "asc" ? (
                                <ArrowUpIcon aria-hidden className="size-3.5 shrink-0" />
                              ) : sorted === "desc" ? (
                                <ArrowDownIcon aria-hidden className="size-3.5 shrink-0" />
                              ) : (
                                <ChevronsUpDownIcon
                                  aria-hidden
                                  className="size-3.5 shrink-0 opacity-50"
                                />
                              )}
                              {sortRank !== null && (
                                <span aria-hidden className="text-micro tabular-nums">
                                  {sortRank}
                                </span>
                              )}
                            </button>
                          ) : (
                            content
                          )}
                          {enablePinning &&
                            !STRUCTURAL_COLUMN_IDS.has(header.column.id) &&
                            !header.isPlaceholder && (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      className="ms-auto"
                                      aria-label={messages.columnOptions(
                                        columnLabel(header.column.id),
                                      )}
                                    >
                                      <PinIcon
                                        aria-hidden
                                        // Filled while the column is pinned: an on state.
                                        variant={header.column.getIsPinned() ? "filled" : "outline"}
                                        className={cn(
                                          header.column.getIsPinned()
                                            ? "text-foreground"
                                            : "opacity-50",
                                        )}
                                      />
                                    </Button>
                                  }
                                />
                                <DropdownMenuContent align="start">
                                  <DropdownMenuItem onClick={() => header.column.pin("left")}>
                                    {messages.pinLeft}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => header.column.pin("right")}>
                                    {messages.pinRight}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => header.column.pin(false)}>
                                    {messages.unpin}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                        </div>
                        {enableColumnResizing && header.column.getCanResize() && (
                          <ColumnResizeHandle
                            header={header}
                            onResize={resizeColumn}
                            messages={messages}
                            direction={direction}
                          />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {bodyState ? (
                bodyState
              ) : enableVirtualization ? (
                <>
                  {paddingTop > 0 && (
                    <tr aria-hidden data-slot="data-table-virtual-spacer">
                      <td style={{ height: paddingTop }} colSpan={colSpan} />
                    </tr>
                  )}
                  {virtualRows?.map((vr) => renderRow(rows[vr.index], vr.index))}
                  {paddingBottom > 0 && (
                    <tr aria-hidden data-slot="data-table-virtual-spacer">
                      <td style={{ height: paddingBottom }} colSpan={colSpan} />
                    </tr>
                  )}
                </>
              ) : (
                rows.map(renderRow)
              )}
            </TableBody>
          </table>
        </div>
      </div>

      {paginated && showRows && table.getPageCount() > 1 && (
        <div
          data-slot="data-table-pagination"
          className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-sm"
        >
          <span className="text-muted-foreground tabular-nums">
            {messages.pageOf(table.getState().pagination.pageIndex + 1, table.getPageCount())}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeftIcon aria-hidden className="rtl:rotate-180" /> {messages.previousPage}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {messages.nextPage} <ChevronRightIcon aria-hidden className="rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { DataTableFacet, DataTableProps, DataTableState };
export { DataTable };
