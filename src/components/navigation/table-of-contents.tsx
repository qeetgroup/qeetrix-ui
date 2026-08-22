"use client";

import * as React from "react";

import type { MessagesFor } from "@/lib/messages";
import { tableOfContentsMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/** Tracks which of the given heading ids is currently in view (scroll-spy). */
function useScrollSpy(ids: string[], rootMargin = "0px 0px -70% 0px") {
  const [activeId, setActiveId] = React.useState<string | null>(ids[0] ?? null);

  React.useEffect(() => {
    if (ids.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootMargin, ids.length, ids.forEach]);

  return activeId;
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
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"tableOfContents">;
}

/** Scroll-spy table of contents (navigation landmark). */
function TableOfContents({
  items,
  activeId: controlledActive,
  messages: messageOverrides,
  className,
  ...props
}: TableOfContentsProps) {
  const messages = useMessages("tableOfContents", tableOfContentsMessages, messageOverrides);
  const ids = React.useMemo(() => items.map((i) => i.id), [items]);
  const spyActive = useScrollSpy(ids);
  const active = controlledActive ?? spyActive;

  return (
    <nav
      aria-label={messages.label}
      data-slot="table-of-contents"
      className={cn("text-sm", className)}
      {...props}
    >
      <ul className="border-s border-border">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id} style={{ paddingInlineStart: `${(item.depth ?? 0) * 12}px` }}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "-ms-px block border-s border-transparent py-1 ps-3 transition-colors hover:text-foreground",
                  isActive ? "border-primary font-medium text-foreground" : "text-muted-foreground",
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
