"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

interface FeedProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Marks the feed busy (e.g. while loading more) for assistive tech. */
  busy?: boolean;
  "aria-label"?: string;
  /** Class applied to each auto-wrapped `<article>`. */
  itemClassName?: string;
}

/**
 * APG Feed pattern: an `aria-live` scrollable list of articles (activity streams,
 * audit timelines, notification feeds). Each direct child is wrapped in a focusable
 * `role=article` with `aria-posinset` / `aria-setsize`. The generic primitive under
 * `NotificationCenter`.
 */
function Feed({
  busy,
  className,
  children,
  "aria-label": ariaLabel,
  itemClassName,
  onKeyDown,
  ...props
}: FeedProps) {
  const items = React.Children.toArray(children);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || !(event.target instanceof Element)) {
      return;
    }

    const currentArticle = event.target.closest<HTMLElement>('[data-slot="feed-item"]');
    if (!currentArticle || currentArticle.parentElement !== event.currentTarget) {
      return;
    }

    const articles = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(':scope > [data-slot="feed-item"]'),
    );
    const currentIndex = articles.indexOf(currentArticle);

    if (event.key === "PageDown") {
      event.preventDefault();
      articles[Math.min(currentIndex + 1, articles.length - 1)]?.focus();
      return;
    }

    if (event.key === "PageUp") {
      event.preventDefault();
      articles[Math.max(currentIndex - 1, 0)]?.focus();
      return;
    }

    if (!event.ctrlKey || (event.key !== "Home" && event.key !== "End")) {
      return;
    }

    const focusable = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => !element.closest("[inert]"),
    );
    const firstInsideIndex = focusable.findIndex((element) => event.currentTarget.contains(element));
    let lastInsideIndex = firstInsideIndex;
    for (let index = firstInsideIndex + 1; index < focusable.length; index += 1) {
      if (event.currentTarget.contains(focusable[index])) {
        lastInsideIndex = index;
      }
    }

    const destination =
      event.key === "Home"
        ? focusable
            .slice(0, firstInsideIndex)
            .reverse()
            .find((element) => !event.currentTarget.contains(element))
        : focusable
            .slice(lastInsideIndex + 1)
            .find((element) => !event.currentTarget.contains(element));

    if (destination) {
      event.preventDefault();
      destination.focus();
    }
  }

  return (
    <div
      role="feed"
      aria-busy={busy || undefined}
      aria-label={ariaLabel}
      data-slot="feed"
      className={cn("flex flex-col gap-3", className)}
      {...props}
      onKeyDown={handleKeyDown}
    >
      {items.map((child, i) => {
        const itemKey = React.isValidElement(child) && child.key ? child.key : `feed-item-${i}`;
        return (
          <article
            key={itemKey}
            data-slot="feed-item"
            tabIndex={0}
            aria-posinset={i + 1}
            aria-setsize={items.length}
            className={cn(
              "rounded-lg border border-border bg-card p-4 text-card-foreground shadow-rest transition-shadow outline-none hover:shadow-hover focus-visible:ring-3 focus-visible:ring-ring/50",
              itemClassName,
            )}
          >
            {child}
          </article>
        );
      })}
    </div>
  );
}

export type { FeedProps };
export { Feed };
