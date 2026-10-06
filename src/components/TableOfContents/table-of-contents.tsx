"use client";

import * as React from "react";

import type { MessagesFor } from "@/lib/messages";
import { tableOfContentsMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/** Separates ids in the effect key; cannot occur in an `id` produced by a slugger. */
const ID_SEPARATOR = "\u0000";

/**
 * Tracks which of the given heading ids is currently in view (scroll-spy).
 *
 * The active heading is the first one, in document order, inside the observed band (the top
 * 30% of the viewport by default). While none is — the reader is in the middle of a long
 * section — the last answer stands, rather than snapping back to the top.
 */
function useScrollSpy(ids: string[], rootMargin = "0px 0px -70% 0px") {
  const [activeId, setActiveId] = React.useState<string | null>(ids[0] ?? null);
  // The effect has to re-run when the *set* of ids changes, not just its length: a page that
  // swaps its headings for the same number of different ones kept observing the old elements.
  // (The previous dependency list was `ids.length` and `ids.forEach` — the latter is
  // `Array.prototype.forEach`, the same function for every array.)
  const key = ids.join(ID_SEPARATOR);

  React.useEffect(() => {
    const order = key === "" ? [] : key.split(ID_SEPARATOR);
    if (order.length === 0) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = order.find((id) => visible.has(id));
        if (first) setActiveId(first);
      },
      { rootMargin },
    );
    for (const id of order) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [key, rootMargin]);

  // An id left over from a previous item set is no answer at all.
  if (activeId !== null && ids.includes(activeId)) return activeId;
  return ids[0] ?? null;
}

interface TocItem {
  id: string;
  label: string;
  /** Nesting depth (0 = top level). */
  depth?: number;
}

interface TableOfContentsProps extends React.HTMLAttributes<HTMLElement> {
  items: TocItem[];
  /** Override the scroll-spy active id (controlled). */
  activeId?: string;
  /**
   * Keep the outline in view while the page scrolls: it sticks
   * `--qx-component-table-of-contents-sticky-offset` from the top of the viewport and, when it
   * is taller than the screen, scrolls on its own. Raise the offset under a sticky header —
   * set the variable on the outline or any ancestor.
   */
  sticky?: boolean;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"tableOfContents">;
}

/**
 * Scroll-spy table of contents (navigation landmark).
 *
 * The current section is marked `aria-current="location"` and drawn with the Qeet
 * inline-start indicator riding the outline's track — the same signature as the sidebar — at
 * every depth, because nesting indents the label, not the bar. When the outline scrolls on its
 * own (`sticky`, or a height cap of your own), the current entry is kept in view inside it
 * without ever scrolling the page.
 */
function TableOfContents({
  items,
  activeId: controlledActive,
  sticky = false,
  messages: messageOverrides,
  className,
  ...props
}: TableOfContentsProps) {
  const messages = useMessages("tableOfContents", tableOfContentsMessages, messageOverrides);
  const ids = React.useMemo(() => items.map((i) => i.id), [items]);
  const spyActive = useScrollSpy(ids);
  const active = controlledActive ?? spyActive;
  const navRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const nav = navRef.current;
    if (!nav || active === null || nav.scrollHeight <= nav.clientHeight) return;
    const link = Array.from(nav.querySelectorAll<HTMLElement>("[data-toc-id]")).find(
      (element) => element.dataset.tocId === active,
    );
    if (!link) return;
    // Only the outline's own scroll position moves. `scrollIntoView` would also scroll the page
    // whenever the outline itself is partly off screen.
    const bounds = nav.getBoundingClientRect();
    const target = link.getBoundingClientRect();
    const margin = target.height;
    if (target.top < bounds.top) {
      nav.scrollTop -= bounds.top - target.top + margin;
    } else if (target.bottom > bounds.bottom) {
      nav.scrollTop += target.bottom - bounds.bottom + margin;
    }
  }, [active]);

  return (
    <nav
      ref={navRef}
      aria-label={messages.label}
      data-slot="table-of-contents"
      data-sticky={sticky ? "" : undefined}
      className={cn(
        "text-sm",
        sticky &&
          "sticky top-(--qx-component-table-of-contents-sticky-offset) max-h-[calc(100svh-var(--qx-component-table-of-contents-sticky-offset)*2)] overflow-y-auto overscroll-contain",
        className,
      )}
      {...props}
    >
      <ul data-slot="table-of-contents-list" className="flex flex-col border-s border-border">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                data-toc-id={item.id}
                data-active={isActive ? "" : undefined}
                aria-current={isActive ? "location" : undefined}
                // Depth indents the label inside the link; the link itself always starts on the
                // track, so the indicator lines up at every level.
                style={{
                  paddingInlineStart: `calc(var(--spacing) * ${3 + (item.depth ?? 0) * 3})`,
                }}
                className={cn(
                  "relative -ms-px block rounded-e-sm py-1 pe-2 text-pretty text-muted-foreground transition-colors duration-fast ease-standard hover:text-foreground focus-visible:focus-ring-inset",
                  "before:pointer-events-none before:absolute before:inset-y-0.5 before:inset-s-0 before:w-0.5 before:rounded-full before:bg-border-brand before:opacity-0 before:transition-opacity before:duration-fast before:ease-standard",
                  isActive &&
                    "font-medium text-foreground before:opacity-100 forced-colors:before:bg-[Highlight]",
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export type { TableOfContentsProps, TocItem };
export { TableOfContents, useScrollSpy };
