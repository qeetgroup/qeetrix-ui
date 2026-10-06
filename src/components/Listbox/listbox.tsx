"use client";

import { CheckIcon } from "lucide-react";
import * as React from "react";
import { useControllableState } from "@/hooks/use-controllable-state";
import { fieldTrigger } from "@/internal/field-styles";
import { cn } from "@/lib/utils";

interface ListboxOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface ListboxProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: ListboxOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
  /** Ignores keyboard and pointer input, drops out of the tab order and dims the list. */
  disabled?: boolean;
  "aria-label"?: string;
}

function toArray(v: string | string[] | undefined): string[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Keys typed within this window extend one type-ahead query; a pause starts a new one. */
const TYPEAHEAD_RESET_MS = 500;
/** Options moved by Page Up / Page Down. */
const PAGE_SIZE = 10;

/**
 * Standalone listbox primitive (APG Listbox) — single or multi-select with
 * roving `aria-activedescendant`. Exposes the `role=listbox`/`role=option`
 * structure that `Select`/`Combobox` keep internal.
 *
 * Option IDs are positional, not value-derived: an option value containing a
 * space would otherwise produce an `aria-activedescendant` with two IDREFs, and
 * one containing a quote would produce an unqueryable ID.
 *
 * The active option is reconciled against the current options on every render,
 * so filtering the list can never leave `aria-activedescendant` pointing at an
 * element that no longer exists.
 *
 * Keyboard: ArrowUp/ArrowDown move (wrapping), Home/End jump, Page Up/Page Down move ten,
 * Enter/Space toggle, and typing jumps to the next option whose label starts with what was
 * typed. Multi-select adds Shift+ArrowUp/ArrowDown (move and toggle) and Ctrl/Cmd+A (select
 * every enabled option, or clear them if all are selected).
 *
 * Appearance is the Qeet selection vocabulary shared with `Select` and `Combobox`: the list is a
 * field (`--qx-component-input-*`), a selected option takes the quiet `brand-subtle` tint and a
 * `text-brand` check, and the active option is highlighted — with an inset ring for keyboard
 * focus — only while the list has focus, so a list at rest never shows a phantom highlight.
 */
function Listbox({
  options,
  value,
  defaultValue,
  onValueChange,
  multiple = false,
  disabled = false,
  className,
  "aria-label": ariaLabel,
  ...props
}: ListboxProps) {
  // As with Chip: an array internally, a single value on the callback when not multi-select.
  const [selected, setSelection] = useControllableState<string[]>({
    value: value === undefined ? undefined : toArray(value),
    defaultValue: () => toArray(defaultValue),
    onChange: (next) => onValueChange?.(multiple ? next : (next[0] ?? "")),
  });
  const enabled = React.useMemo(() => options.filter((o) => !o.disabled), [options]);
  const [requestedActive, setActiveValue] = React.useState<string | null>(
    enabled[0]?.value ?? null,
  );
  const baseId = React.useId();
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const scrollOnNextPaint = React.useRef(false);
  const typeahead = React.useRef<{ query: string; timer: ReturnType<typeof setTimeout> | null }>({
    query: "",
    timer: null,
  });

  React.useEffect(
    () => () => {
      if (typeahead.current.timer) clearTimeout(typeahead.current.timer);
    },
    [],
  );

  // Derived, never stored: if the requested option has been filtered out or
  // disabled, the first enabled option becomes active instead.
  const activeValue =
    requestedActive !== null && enabled.some((o) => o.value === requestedActive)
      ? requestedActive
      : (enabled[0]?.value ?? null);
  const activeIndex = activeValue === null ? -1 : options.findIndex((o) => o.value === activeValue);
  const activeId = activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined;

  const setActive = (value: string | null) => {
    // Only interaction scrolls. Mount and re-render must not hijack the scroll
    // position of the page or of a parent scroller.
    scrollOnNextPaint.current = true;
    setActiveValue(value);
  };

  React.useEffect(() => {
    if (!scrollOnNextPaint.current) return;
    scrollOnNextPaint.current = false;
    if (!activeId) return;
    const node = listRef.current?.querySelector(`[id="${activeId}"]`);
    // `block: "nearest"` keeps the option visible without recentring the list.
    (node as HTMLElement | null)?.scrollIntoView?.({ block: "nearest" });
  }, [activeId]);

  const commit = (next: string[]) => setSelection(next);
  const toggle = (val: string) => {
    if (multiple) {
      const set = new Set(selected);
      if (set.has(val)) set.delete(val);
      else set.add(val);
      commit(Array.from(set));
    } else {
      commit([val]);
    }
  };
  const activeEnabledIndex = () => enabled.findIndex((o) => o.value === activeValue);
  /** The enabled option `dir` steps from the active one — wrapping, as the APG allows. */
  const step = (dir: 1 | -1) => {
    if (enabled.length === 0) return null;
    const idx = activeEnabledIndex();
    return enabled[(idx + dir + enabled.length) % enabled.length] ?? null;
  };
  /** The enabled option `count` steps away, clamped to the ends rather than wrapping. */
  const jump = (count: number) => {
    if (enabled.length === 0) return null;
    const idx = Math.max(0, activeEnabledIndex());
    return enabled[Math.min(enabled.length - 1, Math.max(0, idx + count))] ?? null;
  };

  const typeTo = (char: string) => {
    const state = typeahead.current;
    if (state.timer) clearTimeout(state.timer);
    state.query += char.toLocaleLowerCase();
    state.timer = setTimeout(() => {
      state.query = "";
      state.timer = null;
    }, TYPEAHEAD_RESET_MS);
    if (enabled.length === 0) return;

    const query = state.query;
    // Repeating one letter cycles through the options that start with it.
    const repeated = [...query].every((c) => c === query[0]) ? query[0] : null;
    const start = activeEnabledIndex();
    // A fresh letter looks past the active option; a longer query may stay on it.
    const offset = query.length === 1 ? 1 : 0;
    const ordered = enabled.map(
      (_, i) => enabled[(start + offset + i + enabled.length) % enabled.length] as ListboxOption,
    );
    const startsWith = (o: ListboxOption, q: string) => o.label.toLocaleLowerCase().startsWith(q);
    const match =
      ordered.find((o) => startsWith(o, query)) ??
      (repeated
        ? enabled
            .map((_, i) => enabled[(start + 1 + i) % enabled.length] as ListboxOption)
            .find((o) => startsWith(o, repeated))
        : undefined);
    if (match) setActive(match.value);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const modifier = e.ctrlKey || e.metaKey;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        const next = step(e.key === "ArrowDown" ? 1 : -1);
        if (!next) return;
        setActive(next.value);
        if (multiple && e.shiftKey) toggle(next.value);
        return;
      }
      case "Home":
        e.preventDefault();
        setActive(enabled[0]?.value ?? null);
        return;
      case "End":
        e.preventDefault();
        setActive(enabled[enabled.length - 1]?.value ?? null);
        return;
      case "PageDown":
      case "PageUp": {
        e.preventDefault();
        const next = jump(e.key === "PageDown" ? PAGE_SIZE : -PAGE_SIZE);
        if (next) setActive(next.value);
        return;
      }
      case "Enter":
        if (activeValue) {
          e.preventDefault();
          toggle(activeValue);
        }
        return;
      case " ":
        // Mid-query, a space belongs to the label being typed ("New Y…").
        if (typeahead.current.query) {
          e.preventDefault();
          typeTo(" ");
          return;
        }
        if (activeValue) {
          e.preventDefault();
          toggle(activeValue);
        }
        return;
      default:
        if (multiple && modifier && e.key.toLowerCase() === "a") {
          e.preventDefault();
          const all = enabled.map((o) => o.value);
          const everySelected = all.every((v) => selected.includes(v));
          // Disabled options keep whatever state they had; only enabled ones are toggled.
          const locked = selected.filter((v) => !all.includes(v));
          commit(everySelected ? locked : [...locked, ...all]);
          return;
        }
        if (e.key.length === 1 && !modifier && !e.altKey) {
          typeTo(e.key);
        }
    }
  };

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-multiselectable={multiple || undefined}
      aria-label={ariaLabel}
      aria-activedescendant={disabled ? undefined : activeId}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      data-slot="listbox"
      data-disabled={disabled || undefined}
      onKeyDown={onKeyDown}
      className={cn(
        // Field chrome from Input's recipe — `fieldTrigger`, because the list is a focusable
        // element rather than a text input (`:read-only` would match it permanently).
        fieldTrigger,
        "group/listbox max-h-64 overflow-auto overscroll-contain p-1 text-sm",
        className,
      )}
      {...props}
    >
      {options.map((o, index) => {
        const isSel = selected.includes(o.value);
        const isActive = activeValue === o.value;
        return (
          // Options are not buttons: a button is its own focus target, which would pull DOM
          // focus off the listbox and leave aria-activedescendant describing nothing. A pointer
          // press on a plain element focuses the listbox itself, which is the APG model.
          // biome-ignore lint/a11y/useKeyWithClickEvents: the listbox owns the keyboard (aria-activedescendant).
          // biome-ignore lint/a11y/useFocusableInteractive: an aria-activedescendant option must not take DOM focus.
          <div
            key={o.value}
            id={`${baseId}-option-${index}`}
            role="option"
            aria-selected={isSel}
            aria-disabled={o.disabled || undefined}
            data-slot="listbox-option"
            data-active={isActive || undefined}
            data-value={o.value}
            onClick={() => {
              if (o.disabled || disabled) return;
              setActive(o.value);
              toggle(o.value);
            }}
            className={cn(
              "relative flex min-h-[calc(var(--qx-control-height)-0.25rem)] w-full cursor-default items-center gap-2 rounded-md px-2 py-1 text-start select-none pointer-coarse:min-h-11",
              "transition-colors duration-fast ease-standard",
              "not-aria-disabled:hover:bg-accent group-focus/listbox:data-[active]:bg-accent",
              "aria-selected:bg-brand-subtle not-aria-disabled:aria-selected:hover:bg-brand-subtle-hover group-focus/listbox:aria-selected:data-[active]:bg-brand-subtle-hover",
              "group-focus-visible/listbox:data-[active]:focus-ring-inset",
              "aria-disabled:cursor-not-allowed aria-disabled:opacity-disabled",
              "group-focus/listbox:data-[active]:forced-colors-selected",
            )}
          >
            <span
              data-slot="listbox-option-indicator"
              className="flex size-4 shrink-0 items-center justify-center text-brand forced-colors:text-inherit"
            >
              {isSel && <CheckIcon aria-hidden strokeWidth={2.5} className="size-4" />}
            </span>
            <span className="min-w-0 flex-1 wrap-break-word">{o.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export type { ListboxOption, ListboxProps };
export { Listbox };
