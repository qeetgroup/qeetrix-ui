"use client";

import { SearchIcon } from "@qeetrix/icons/icons/search";
import * as React from "react";
import { Kbd, KbdGroup } from "@/components/Kbd/kbd";
import { VisuallyHidden } from "@/internal/visually-hidden";
import type { MessagesFor } from "@/lib/messages";
import { commandPaletteMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

export interface CommandPaletteItem {
  /** Stable id used as React key. */
  id: string;
  /** Visible label. */
  title: string;
  /** Optional group heading (items are clustered by group in display order). */
  group?: string;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** Extra search terms — matched in addition to title/group. */
  keywords?: string[];
  /**
   * The keyboard shortcut that runs the same command outside the palette, shown at the end of
   * the row and exposed as the option's description — e.g. `["⌘", "K"]` or `"Ctrl+K"`. Display
   * only: the palette does not bind it.
   */
  shortcut?: string | readonly string[];
  /** Optional payload the caller can attach (e.g. a route, a callback). */
  payload?: unknown;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandPaletteItem[];
  onSelect: (item: CommandPaletteItem) => void;
  placeholder?: string;
  emptyMessage?: string;
  /** Show the footer hint with ↑↓ / ↵ / esc. Default true. */
  showHint?: boolean;
  /**
   * Text announced politely when the result count changes. Replace it to
   * translate; return `""` to opt out of the announcement.
   *
   * Equivalent to `messages={{ resultCount }}` and wins over it.
   */
  resultCountLabel?: (count: number) => string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"commandPalette">;
  className?: string;
}

function matches(item: CommandPaletteItem, q: string): boolean {
  if (!q) return true;
  const ql = q.toLowerCase();
  if (item.title.toLowerCase().includes(ql)) return true;
  if (item.group?.toLowerCase().includes(ql)) return true;
  if (item.keywords?.some((k) => k.toLowerCase().includes(ql))) return true;
  return false;
}

function ShortcutKeys({ id, shortcut }: { id: string; shortcut: string | readonly string[] }) {
  const keys = typeof shortcut === "string" ? [shortcut] : shortcut;
  return (
    <span id={id} data-slot="command-palette-shortcut" className="ms-auto flex shrink-0 ps-3">
      {/* Keys read in the order they are pressed in every language, so the group is LTR even in
          an RTL row ("G then T" must not become "T G"). */}
      <KbdGroup dir="ltr">
        {keys.map((key, index) => (
          // Shortcut keys may repeat ("G", "G"), so position is part of the identity.
          // biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
          <Kbd key={`${key}-${index}`}>{key}</Kbd>
        ))}
      </KbdGroup>
    </span>
  );
}

/**
 * CommandPalette is a Cmd-K modal: a centered search box with a filtered,
 * grouped list of navigable items. Built on the browser's native
 * `<dialog>` (top-layer rendering, focus trap, ESC handling, ARIA modal
 * semantics for free).
 *
 * Caller owns open state, items, and onSelect. Items render in the order
 * provided, clustered by `group` headings as they appear in the
 * filtered list.
 *
 * Keyboard: ↑↓ moves highlight, ↵ selects, ESC closes. Clicking the
 * backdrop also closes. The highlighted result is scrolled into view and the
 * result count is announced politely, so a keyboard or screen-reader user is
 * never operating an option that has scrolled out of the list.
 *
 * Focus never leaves the search field: results are reached through
 * `aria-activedescendant`, so the active result carries its own ≥3:1 indicator (a Qeet bar at
 * the inline start) rather than relying on a focus ring it never receives.
 */
function CommandPalette({
  open,
  onOpenChange,
  items,
  onSelect,
  placeholder,
  emptyMessage,
  showHint = true,
  resultCountLabel,
  messages: messageOverrides,
  className,
}: CommandPaletteProps) {
  const messages = useMessages("commandPalette", commandPaletteMessages, messageOverrides);
  const resolvedPlaceholder = placeholder ?? messages.placeholder;
  const resolvedEmptyMessage = emptyMessage ?? messages.empty;
  const countLabel = resultCountLabel ?? messages.resultCount;
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();
  const [query, setQuery] = React.useState("");
  const [highlight, setHighlight] = React.useState(0);

  const filtered = React.useMemo(() => items.filter((i) => matches(i, query)), [items, query]);

  // Cluster filtered items by group, preserving original order.
  const grouped = React.useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, CommandPaletteItem[]>();
    for (const item of filtered) {
      const g = item.group ?? "";
      if (!map.has(g)) {
        map.set(g, []);
        order.push(g);
      }
      map.get(g)?.push(item);
    }
    return order.map((g) => ({ group: g, items: map.get(g) ?? [] }));
  }, [filtered]);

  // Drive the native dialog open/closed from React state.
  React.useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Defer focus to after the dialog finishes opening.
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  // Reset query + highlight every time the palette opens.
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
    }
  }, [open]);

  // Clamped in render, not in an effect: an effect would leave one committed
  // frame where `aria-activedescendant` points past the end of the list.
  const activeIndex =
    filtered.length === 0 ? -1 : Math.min(Math.max(highlight, 0), filtered.length - 1);
  const activeId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  // The result list scrolls; without this the highlight can move to a row that is not on screen.
  React.useEffect(() => {
    if (!open || !activeId) return;
    const node = listRef.current?.querySelector(`[id="${activeId}"]`);
    (node as HTMLElement | null)?.scrollIntoView?.({ block: "nearest" });
  }, [open, activeId]);

  function commit(item: CommandPaletteItem | undefined) {
    if (!item) return;
    onSelect(item);
    onOpenChange(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // An IME composition (Japanese, Chinese, Hindi transliteration…) uses Enter and the arrows to
    // pick a candidate. Those keystrokes belong to the input method, not to the palette.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(activeIndex >= 0 ? filtered[activeIndex] : undefined);
    }
    // Native <dialog> handles Esc → close → onClose handler below.
  }

  return (
    <dialog
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself, outside its
        // child content box) closes the palette.
        if (e.target === dialogRef.current) onOpenChange(false);
      }}
      aria-label={messages.label}
      data-slot="command-palette"
      className={cn(
        // A modal <dialog> is positioned by the UA with `inset: 0; margin: auto`. Pinning both
        // inline edges and letting `mx-auto` centre a fixed width keeps it centred in any UA;
        // the block axis is pinned to 10vh from the top instead of the UA's vertical centring,
        // so the search field does not jump as results filter.
        "fixed inset-x-0 top-[10vh] bottom-auto mx-auto my-0 max-h-[calc(100dvh-20vh)] w-[min(var(--qx-component-command-palette-width),calc(100%-2rem))] max-w-none overflow-hidden rounded-(--qx-corner-overlay) border border-border bg-popover p-0 text-popover-foreground shadow-modal",
        "backdrop:bg-(--qx-color-overlay-scrim)",
        "duration-fast ease-enter open:animate-in open:fade-in-0 open:zoom-in-97",
        className,
      )}
    >
      <div className="flex max-h-[calc(100dvh-20vh)] flex-col">
        <div
          data-slot="command-palette-search"
          // The field is the palette's only tab stop and is always focused while it is open, so
          // the search row's divider is its focus indicator: it turns the Qeet focus colour.
          className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 has-[input:focus-visible]:border-ring"
        >
          <SearchIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            placeholder={resolvedPlaceholder}
            aria-label={resolvedPlaceholder}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={activeId}
            aria-expanded={open}
            autoComplete="off"
            spellCheck={false}
            className="h-12 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <VisuallyHidden role="status" aria-live="polite" data-slot="command-palette-status">
          {open ? countLabel(filtered.length) : ""}
        </VisuallyHidden>
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={messages.results}
          data-slot="command-palette-list"
          // Keep focus in the search field when a result, a heading or the gaps are clicked.
          onMouseDown={(e) => e.preventDefault()}
          className="max-h-96 min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
        >
          {filtered.length === 0 ? (
            <div
              data-slot="command-palette-empty"
              className="px-6 py-10 text-center text-sm text-muted-foreground"
            >
              {resolvedEmptyMessage}
            </div>
          ) : (
            grouped.map(({ group, items: groupItems }, groupIndex) => {
              const headingId = `${listboxId}-group-${groupIndex}`;
              const options = groupItems.map((item) => {
                const idx = filtered.indexOf(item);
                const isHighlighted = idx === activeIndex;
                const optionId = `${listboxId}-option-${idx}`;
                const shortcutId = `${optionId}-shortcut`;
                return (
                  <button
                    key={item.id}
                    id={optionId}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-label={item.title}
                    aria-describedby={item.shortcut ? shortcutId : undefined}
                    aria-selected={isHighlighted}
                    data-highlighted={isHighlighted || undefined}
                    data-slot="command-palette-item"
                    className={cn(
                      "relative flex min-h-(--qx-component-command-palette-item-height) w-full scroll-mt-9 items-center gap-3 rounded-(--qx-corner-chip) px-3 py-1.5 text-start text-sm text-foreground outline-none select-none",
                      // Pointer movement and arrows move the same highlight, so hover needs
                      // no separate state; the bar is the ≥3:1 cue the tint cannot give.
                      "before:absolute before:inset-y-2 before:inset-s-0 before:w-0.5 before:rounded-full before:bg-border-brand before:opacity-0",
                      "data-highlighted:bg-(--qx-component-command-palette-item-selected-background) data-highlighted:before:opacity-100",
                      "forced-colors:before:hidden data-highlighted:forced-colors-selected",
                    )}
                    // pointermove, not mouseenter: scrolling the list under a resting
                    // pointer must not steal the highlight from the arrow keys.
                    onPointerMove={() => {
                      if (idx !== activeIndex) setHighlight(idx);
                    }}
                    onClick={() => commit(item)}
                  >
                    {item.icon && (
                      <span
                        aria-hidden
                        className="grid size-4 shrink-0 place-items-center text-muted-foreground [&_svg]:size-4"
                      >
                        {item.icon}
                      </span>
                    )}
                    <span className="min-w-0 truncate">{item.title}</span>
                    {item.shortcut && <ShortcutKeys id={shortcutId} shortcut={item.shortcut} />}
                  </button>
                );
              });
              if (!group) return <div key="_">{options}</div>;
              return (
                // biome-ignore lint/a11y/useSemanticElements: the listbox pattern groups options with role="group"; a <fieldset> is not allowed inside a listbox.
                <div key={group} role="group" aria-labelledby={headingId}>
                  <div
                    id={headingId}
                    data-slot="command-palette-group-heading"
                    // Sticky, so a long group keeps its heading in view while it scrolls.
                    className="sticky top-0 z-10 -mx-1.5 bg-popover px-4.5 pt-2.5 pb-1 font-ui text-xs font-medium text-muted-foreground"
                  >
                    {group}
                  </div>
                  {options}
                </div>
              );
            })
          )}
        </div>
        {showHint && (
          <div
            data-slot="command-palette-footer"
            className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-2 font-ui text-xs text-muted-foreground"
          >
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <KbdGroup>
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                </KbdGroup>
                {messages.navigateHint}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>↵</Kbd>
                {messages.selectHint}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>{messages.escapeKey}</Kbd>
                {messages.closeHint}
              </span>
            </span>
            <span className="shrink-0 tabular-nums">
              {/* `resultCountLabel` may return "" to silence the announcement; the visible count
                  still shows, from the catalogue. */}
              {countLabel(filtered.length) || messages.resultCount(filtered.length)}
            </span>
          </div>
        )}
      </div>
    </dialog>
  );
}

export type { CommandPaletteProps };
export { CommandPalette };
