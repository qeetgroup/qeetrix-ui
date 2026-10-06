"use client";

import {
  BookmarkIcon,
  ChevronDownIcon,
  ListFilterIcon,
  SaveIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/Button/button";
import { Combobox } from "@/components/Combobox/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu/dropdown-menu";
import { Input } from "@/components/Input/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/Input/input-group";
import { OverflowList } from "@/components/OverflowList/overflow-list";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/Popover/popover";
import { useControllableState } from "@/hooks/use-controllable-state";
import type { FilterBarMessages, MessagesFor } from "@/lib/messages";
import { filterBarMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

const DEFAULT_OPERATORS = ["is", "is not", "contains"];

interface FilterField {
  key: string;
  label: string;
  /** Predefined value options (renders a picker); omit for free-text. */
  options?: { label: string; value: string }[];
  /** Operators offered for this field. Defaults to is / is not / contains. */
  operators?: string[];
}

interface ActiveFilter {
  field: string;
  operator: string;
  value: string;
}

/** A named, saved combination of filters (and optionally search) — "My open tickets". */
interface FilterBarView {
  id: string;
  label: string;
  filters: ActiveFilter[];
  /** Search text the view applies. Omitted, choosing the view clears the search. */
  search?: string;
}

type ResolvedMessages = FilterBarMessages;

interface FilterBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  fields: FilterField[];
  value: ActiveFilter[];
  onValueChange: (filters: ActiveFilter[]) => void;
  /**
   * Label of the control that opens the builder. Equivalent to `messages={{ addFilter }}` and
   * wins over it.
   */
  addLabel?: string;
  /** Controlled search text. Setting `search` or `onSearchChange` shows the search field. */
  search?: string;
  /** Initial search text when uncontrolled. */
  defaultSearch?: string;
  /** Called on every keystroke — debounce server queries on your side. */
  onSearchChange?: (search: string) => void;
  /** Placeholder of the search field. */
  searchPlaceholder?: string;
  /** Saved views. Shows a views menu at the start of the bar. */
  views?: FilterBarView[];
  /** Controlled active view ID; `null` for none. */
  viewId?: string | null;
  /** Initial active view ID when uncontrolled. */
  defaultViewId?: string | null;
  /**
   * Called when a view is chosen. The view's filters (and search) are applied through
   * `onValueChange` / `onSearchChange` as well, so wiring this is optional.
   */
  onViewChange?: (view: FilterBarView | null) => void;
  /**
   * Adds "Save current view…" to the views menu. The caller names and persists the view —
   * typically in a dialog — and passes it back in `views`.
   */
  onSaveView?: (current: { filters: ActiveFilter[]; search: string }) => void;
  /**
   * What happens when the active filters do not fit on one line.
   *
   * - `wrap` (default) — filters flow onto further lines. Nothing is hidden.
   * - `collapse` — one line; filters that do not fit collapse into a "+N" control that lists
   *   them. For toolbars above a dense table where vertical space is precious.
   */
  overflow?: "wrap" | "collapse";
  /** Trailing controls on the bar's inline end — a column menu, a density toggle, export. */
  actions?: React.ReactNode;
  /** Disables every control in the bar. */
  disabled?: boolean;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"filterBar">;
}

function sameFilters(a: ActiveFilter[], b: ActiveFilter[]) {
  return (
    a.length === b.length &&
    a.every(
      (f, i) => f.field === b[i].field && f.operator === b[i].operator && f.value === b[i].value,
    )
  );
}

/** The field → operator → value form, used both to add a filter and to edit one. */
function FilterBuilder({
  fields,
  initial,
  onCommit,
  messages,
}: {
  fields: FilterField[];
  initial?: ActiveFilter;
  onCommit: (filter: ActiveFilter) => void;
  messages: ResolvedMessages;
}) {
  const baseId = React.useId();
  const [field, setField] = React.useState<string | null>(initial?.field ?? null);
  const [operator, setOperator] = React.useState<string | null>(initial?.operator ?? null);
  const [val, setVal] = React.useState(initial?.value ?? "");

  const fieldDef = fields.find((f) => f.key === field);
  const operators = fieldDef?.operators ?? DEFAULT_OPERATORS;
  const complete = Boolean(field && operator && val);

  return (
    <form
      data-slot="filter-bar-builder"
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (field && operator && val) onCommit({ field, operator, value: val });
      }}
    >
      <PopoverTitle>{initial ? messages.editTitle : messages.addTitle}</PopoverTitle>
      <div className="space-y-1.5">
        <label htmlFor={`${baseId}-field`} className="text-xs font-medium text-muted-foreground">
          {messages.fieldLabel}
        </label>
        <Combobox
          id={`${baseId}-field`}
          items={fields.map((f) => ({ label: f.label, value: f.key }))}
          value={field}
          onValueChange={(v) => {
            setField(v);
            // The first operator is right far more often than not; preselecting it saves a step.
            const next = fields.find((f) => f.key === v);
            setOperator(v ? ((next?.operators ?? DEFAULT_OPERATORS)[0] ?? null) : null);
            setVal("");
          }}
          placeholder={messages.fieldPlaceholder}
        />
      </div>
      {field && (
        <div className="space-y-1.5">
          <label
            htmlFor={`${baseId}-operator`}
            className="text-xs font-medium text-muted-foreground"
          >
            {messages.operatorLabel}
          </label>
          <Combobox
            id={`${baseId}-operator`}
            items={operators.map((o) => ({ label: o, value: o }))}
            value={operator}
            onValueChange={setOperator}
            placeholder={messages.operatorPlaceholder}
          />
        </div>
      )}
      {field && operator && (
        <div className="space-y-1.5">
          <label htmlFor={`${baseId}-value`} className="text-xs font-medium text-muted-foreground">
            {messages.valueLabel}
          </label>
          {fieldDef?.options ? (
            <Combobox
              id={`${baseId}-value`}
              items={fieldDef.options}
              value={val || null}
              onValueChange={(v) => setVal(v ?? "")}
              placeholder={messages.valuePlaceholder}
            />
          ) : (
            <Input
              id={`${baseId}-value`}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={messages.valuePlaceholder}
              aria-label={messages.value}
            />
          )}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <PopoverClose
          render={
            <Button type="button" variant="ghost" size="sm">
              {messages.cancel}
            </Button>
          }
        />
        <Button type="submit" size="sm" disabled={!complete}>
          {initial ? messages.apply : messages.add}
        </Button>
      </div>
    </form>
  );
}

/**
 * One active filter: field and operator quiet, the value emphasised, on the Qeet selected
 * surface — an applied filter is a selection, so it reads as one without turning solid orange.
 * The body opens the builder to edit it; the × removes it.
 */
function FilterChip({
  filter,
  fields,
  open,
  onOpenChange,
  onCommit,
  onRemove,
  disabled,
  messages,
}: {
  filter: ActiveFilter;
  fields: FilterField[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommit: (filter: ActiveFilter) => void;
  onRemove: () => void;
  disabled?: boolean;
  messages: ResolvedMessages;
}) {
  const fieldDef = fields.find((x) => x.key === filter.field);
  const fieldLabel = fieldDef?.label ?? filter.field;
  const valueLabel =
    fieldDef?.options?.find((o) => o.value === filter.value)?.label ?? filter.value;
  const label = messages.chipLabel(fieldLabel, filter.operator, String(valueLabel));

  return (
    <span
      data-slot="filter-bar-chip"
      data-disabled={disabled || undefined}
      // A disabled bar fades the whole chip, not just its two buttons, so it does not keep the
      // full selected tint while nothing in it responds.
      className="inline-flex h-[var(--qx-component-filter-bar-chip-height)] max-w-full items-stretch rounded-(--qx-corner-chip) border border-border-brand bg-brand-subtle text-xs text-foreground data-disabled:opacity-disabled"
    >
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <button
              type="button"
              data-slot="filter-bar-chip-edit"
              className="inline-flex min-w-0 items-center gap-1 rounded-s-(--qx-corner-chip) ps-2.5 pe-1.5 outline-none transition-colors duration-fast ease-standard hover:bg-brand-subtle-hover focus-visible:focus-ring disabled:cursor-not-allowed aria-expanded:bg-brand-subtle-active motion-reduce:transition-none"
            >
              {/* One text node carries the whole label, for assistive technology and for
                  anything that finds the chip by its text; the styled segments are visual. */}
              <span className="sr-only">{label}</span>
              <span aria-hidden className="flex min-w-0 items-center gap-1 whitespace-nowrap">
                <span className="text-muted-foreground">{fieldLabel}</span>
                <span className="text-muted-foreground">{filter.operator}</span>
                <span className="max-w-[24ch] truncate font-medium">{valueLabel}</span>
              </span>
            </button>
          }
        />
        <PopoverContent align="start" className="w-72">
          <FilterBuilder
            fields={fields}
            initial={filter}
            messages={messages}
            onCommit={(next) => {
              onCommit(next);
              onOpenChange(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <span aria-hidden className="my-1.5 w-px bg-border-brand opacity-40" />
      <button
        type="button"
        data-slot="filter-bar-chip-remove"
        aria-label={messages.removeFilter(label)}
        disabled={disabled}
        onClick={onRemove}
        className="inline-flex w-6 shrink-0 items-center justify-center rounded-e-(--qx-corner-chip) text-muted-foreground outline-none transition-colors duration-fast ease-standard hover:bg-brand-subtle-hover hover:text-foreground focus-visible:focus-ring disabled:cursor-not-allowed motion-reduce:transition-none"
      >
        <XIcon aria-hidden className="size-3.5" />
      </button>
    </span>
  );
}

/**
 * The filter bar above a table or list: search, saved views, active filters as editable
 * chips, an "Add filter" builder, Clear all, and a slot for trailing table actions.
 *
 * - **Active-filter indication.** Applied filters use the Qeet selected surface (brand-subtle
 *   tint, brand outline); the count is announced politely whenever it changes.
 * - **Editing.** A chip's body reopens the builder pre-filled; its × removes it and focus
 *   moves to the neighbouring chip (or "Add filter"), never to the page body.
 * - **Saved views.** `views` adds a menu; choosing one applies its filters. When the filters
 *   drift from the active view its name is marked modified, and `onSaveView` offers to save.
 * - **Overflow.** `wrap` (default) or `collapse` into a "+N" list.
 * - **Density.** Search, buttons and chips follow the density control height.
 *
 * Controlled via `value` / `onValueChange`; search and the active view are controlled or
 * uncontrolled.
 */
function FilterBar({
  fields,
  value,
  onValueChange,
  addLabel,
  search: searchProp,
  defaultSearch = "",
  onSearchChange,
  searchPlaceholder,
  views,
  viewId: viewIdProp,
  defaultViewId = null,
  onViewChange,
  onSaveView,
  overflow = "wrap",
  actions,
  disabled = false,
  messages: messageOverrides,
  className,
  ...props
}: FilterBarProps) {
  const messages: ResolvedMessages = useMessages("filterBar", filterBarMessages, messageOverrides);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<number | null>(null);
  const [search, setSearch] = useControllableState({
    value: searchProp,
    defaultValue: defaultSearch,
    onChange: onSearchChange,
  });
  const [viewId, setViewId] = useControllableState<string | null>({
    value: viewIdProp,
    defaultValue: defaultViewId,
    onChange: (id) => onViewChange?.(views?.find((v) => v.id === id) ?? null),
  });

  const chipsRef = React.useRef<HTMLDivElement>(null);
  const addButtonRef = React.useRef<HTMLButtonElement>(null);
  /** Index of the chip whose remove button should take focus after the next change. */
  const pendingFocus = React.useRef<number | null>(null);

  const showSearch = searchProp !== undefined || onSearchChange !== undefined;
  const activeView = views?.find((v) => v.id === viewId) ?? null;
  const modified =
    activeView != null &&
    (!sameFilters(activeView.filters, value) || (activeView.search ?? "") !== search);

  // After a removal the removed chip's button is gone; send focus somewhere sensible.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the filters change.
  React.useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    const removes = chipsRef.current?.querySelectorAll<HTMLButtonElement>(
      '[data-slot="filter-bar-chip-remove"]',
    );
    const next = removes?.[Math.min(target, removes.length - 1)];
    (next ?? addButtonRef.current)?.focus();
  }, [value]);

  const remove = (i: number) => {
    pendingFocus.current = i;
    onValueChange(value.filter((_, idx) => idx !== i));
  };
  const replace = (i: number, next: ActiveFilter) =>
    onValueChange(value.map((f, idx) => (idx === i ? next : f)));

  const applyView = (id: string) => {
    const view = views?.find((v) => v.id === id);
    if (!view) return;
    setViewId(id);
    onValueChange(view.filters);
    setSearch(view.search ?? "");
  };

  const chips = value.map((f, i) => (
    <FilterChip
      // biome-ignore lint/suspicious/noArrayIndexKey: filters are positional; two may be identical.
      key={`filter-${i}`}
      filter={f}
      fields={fields}
      open={editing === i}
      onOpenChange={(o) => setEditing(o ? i : null)}
      onCommit={(next) => replace(i, next)}
      onRemove={() => remove(i)}
      disabled={disabled}
      messages={messages}
    />
  ));

  return (
    // biome-ignore lint/a11y/useSemanticElements: a named group of filter controls; <fieldset> would add form semantics.
    <div
      role="group"
      aria-label={messages.label}
      data-slot="filter-bar"
      data-overflow={overflow}
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    >
      {views && views.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={
              <Button variant="outline" className="max-w-56 gap-1.5">
                <BookmarkIcon aria-hidden className="text-muted-foreground" />
                <span className="truncate">{activeView?.label ?? messages.views}</span>
                {modified && (
                  <>
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="sr-only">, {messages.modified}</span>
                  </>
                )}
                <ChevronDownIcon aria-hidden className="text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-auto min-w-48">
            <DropdownMenuRadioGroup
              value={viewId ?? ""}
              onValueChange={(id) => applyView(String(id))}
            >
              <DropdownMenuLabel>{messages.savedViews}</DropdownMenuLabel>
              {views.map((view) => (
                // Choosing a view is the whole action, so the menu closes (radio items stay open by
                // default, for settings menus).
                <DropdownMenuRadioItem key={view.id} value={view.id} closeOnClick>
                  {view.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {onSaveView && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSaveView({ filters: value, search })}>
                  <SaveIcon aria-hidden />
                  {messages.saveView}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {showSearch && (
        <InputGroup className="w-auto min-w-40 flex-[1_1_12rem] sm:max-w-xs">
          <InputGroupAddon className="border-0 bg-transparent pe-0">
            <SearchIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={search}
            disabled={disabled}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder ?? messages.searchPlaceholder}
            aria-label={messages.search}
          />
        </InputGroup>
      )}

      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
        }}
      >
        <PopoverTrigger
          ref={addButtonRef}
          disabled={disabled}
          render={
            <Button variant="outline" className="gap-1.5 border-dashed">
              <ListFilterIcon aria-hidden className="text-muted-foreground" />
              {addLabel ?? messages.addFilter}
            </Button>
          }
        />
        <PopoverContent align="start" className="w-72">
          {/* Remounted on every open, so a cancelled draft never reappears. */}
          {open && (
            <FilterBuilder
              fields={fields}
              messages={messages}
              onCommit={(filter) => {
                onValueChange([...value, filter]);
                setOpen(false);
              }}
            />
          )}
        </PopoverContent>
      </Popover>

      {value.length > 0 &&
        (overflow === "collapse" ? (
          <div ref={chipsRef} data-slot="filter-bar-chips" className="min-w-0 flex-[1_1_10rem]">
            <OverflowList
              items={chips}
              renderOverflow={(hidden, count) => (
                <Popover>
                  <PopoverTrigger
                    aria-label={messages.moreFilters(count)}
                    disabled={disabled}
                    className="inline-flex h-[var(--qx-component-filter-bar-chip-height)] items-center rounded-(--qx-corner-chip) border border-border-brand bg-brand-subtle px-2 text-xs font-medium text-foreground outline-none transition-colors duration-fast ease-standard hover:bg-brand-subtle-hover focus-visible:focus-ring aria-expanded:bg-brand-subtle-active motion-reduce:transition-none"
                  >
                    +{count}
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    aria-label={messages.moreFilters(count)}
                    className="flex w-auto max-w-sm flex-col items-start gap-1.5 p-2"
                  >
                    {hidden}
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>
        ) : (
          <div ref={chipsRef} data-slot="filter-bar-chips" className="contents">
            {chips}
          </div>
        ))}

      {value.length > 0 && (
        <Button
          variant="ghost"
          disabled={disabled}
          className="text-muted-foreground"
          onClick={() => {
            pendingFocus.current = -1;
            onValueChange([]);
          }}
        >
          {messages.clearAll}
        </Button>
      )}

      {actions && (
        <div data-slot="filter-bar-actions" className="ms-auto flex items-center gap-2">
          {actions}
        </div>
      )}

      <span aria-live="polite" className="sr-only">
        {messages.appliedCount(value.length)}
      </span>
    </div>
  );
}

export type { ActiveFilter, FilterBarProps, FilterBarView, FilterField };
export { FilterBar };
