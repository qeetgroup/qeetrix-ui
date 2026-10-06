"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

type FeedVariant = "card" | "list";

interface FeedProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Marks the feed busy (e.g. while loading more) for assistive tech. */
  busy?: boolean;
  "aria-label"?: string;
  /** Class applied to each auto-wrapped `<article>`. */
  itemClassName?: string;
  /**
   * How articles are presented.
   *
   * - `card` (default) — each article is its own raised card. For short streams of rich
   *   entries: comments, announcements, a handful of notifications.
   * - `list` — articles are rows inside one bordered surface, separated by hairlines. For long,
   *   scannable streams — audit logs, activity histories — where a card per entry would turn
   *   the page into a wall of boxes.
   */
  variant?: FeedVariant;
  /**
   * Rendered instead of the feed when there are no children — "No events match these
   * filters", a first-run hint. Without it an empty feed renders an empty `role="feed"`.
   */
  empty?: React.ReactNode;
}

const ARTICLE_CLASS: Record<FeedVariant, string> = {
  // Not interactive, so no hover lift: a card that rises under the pointer promises a click it
  // does not answer. Focus is the APG feed's article focus, drawn outside the card.
  card: "rounded-(--qx-corner-surface) border border-border bg-card p-[var(--qx-component-feed-card-padding)] text-card-foreground shadow-rest outline-none focus-visible:focus-ring",
  // Rows sit inside the feed's own clipping surface, so the indicator is drawn inside the row.
  // The hover tint only tracks the pointer across a wide row; it is not an affordance.
  list: "px-[var(--qx-component-feed-row-padding-x)] py-[var(--qx-component-feed-row-padding-y)] text-card-foreground outline-none transition-colors duration-fast ease-standard hover:bg-surface-subtle focus-visible:focus-ring-inset motion-reduce:transition-none",
};

const FEED_CLASS: Record<FeedVariant, string> = {
  card: "flex flex-col gap-3",
  list: "flex flex-col divide-y divide-border-subtle overflow-hidden rounded-(--qx-corner-surface) border border-border bg-card",
};

interface FeedItemLabelling {
  /** The ID of the element that names the article — usually its title. */
  labelledBy?: string;
  /** The ID of the element that summarises the article. */
  describedBy?: string;
}

const FeedItemContext = React.createContext<{
  setLabelledBy: (id: string | undefined) => void;
  setDescribedBy: (id: string | undefined) => void;
} | null>(null);

/**
 * Names the enclosing feed article by elements inside it. The APG feed pattern requires each
 * article to have an accessible name; an auto-wrapped child cannot pass one up, so it registers
 * its title (and summary) here instead. A no-op outside a `Feed`. `AuditEvent` uses it, and a
 * product's own feed entries can too.
 *
 * Registered after mount, so server HTML and the first client render agree; an explicit
 * `aria-labelledby` / `aria-describedby` on a `FeedItem` wins.
 */
function useFeedItemLabel({ labelledBy, describedBy }: FeedItemLabelling) {
  const context = React.useContext(FeedItemContext);
  React.useEffect(() => {
    if (!context || labelledBy === undefined) return;
    context.setLabelledBy(labelledBy);
    return () => context.setLabelledBy(undefined);
  }, [context, labelledBy]);
  React.useEffect(() => {
    if (!context || describedBy === undefined) return;
    context.setDescribedBy(describedBy);
    return () => context.setDescribedBy(undefined);
  }, [context, describedBy]);
}

type FeedItemProps = React.ComponentProps<"article">;

/**
 * An explicit feed article, for when a child needs its own attributes — most often
 * `aria-labelledby` / `aria-describedby` pointing at its title and summary. As a direct child
 * of `Feed` it *is* the article (no second wrapper), and `Feed` still supplies the position,
 * set size, focusability and variant styling. Outside a `Feed` it renders a plain `<article>`.
 */
function FeedItem({ className, ...props }: FeedItemProps) {
  return <article data-slot="feed-item" className={className} {...props} />;
}

function FeedArticle({
  position,
  setSize,
  variant,
  itemClassName,
  className,
  "aria-labelledby": labelledByProp,
  "aria-describedby": describedByProp,
  children,
  ...props
}: FeedItemProps & {
  position: number;
  setSize: number;
  variant: FeedVariant;
  itemClassName?: string;
}) {
  const [labelledBy, setLabelledBy] = React.useState<string>();
  const [describedBy, setDescribedBy] = React.useState<string>();
  const context = React.useMemo(() => ({ setLabelledBy, setDescribedBy }), []);
  return (
    <FeedItemContext.Provider value={context}>
      <article
        data-slot="feed-item"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the WAI-ARIA feed pattern requires each article to be focusable.
        tabIndex={0}
        aria-posinset={position}
        aria-setsize={setSize}
        aria-labelledby={labelledByProp ?? labelledBy}
        aria-describedby={describedByProp ?? describedBy}
        className={cn(ARTICLE_CLASS[variant], itemClassName, className)}
        {...props}
      >
        {children}
      </article>
    </FeedItemContext.Provider>
  );
}

/**
 * APG Feed pattern: an `aria-live` scrollable list of articles (activity streams,
 * audit timelines, notification feeds). Each direct child is wrapped in a focusable
 * `role=article` with `aria-posinset` / `aria-setsize`; a `FeedItem` child becomes the article
 * itself, carrying its own attributes. Articles are named through `FeedItem`'s
 * `aria-labelledby` or, from inside, `useFeedItemLabel`. The generic primitive under
 * `NotificationCenter` and `AuditLog`.
 *
 * Keyboard (APG): `PageDown` / `PageUp` move between articles; `Control+End` /
 * `Control+Home` leave the feed forwards / backwards. Tab still walks the controls inside
 * an article, so the feed never traps focus.
 */
function Feed({
  busy,
  className,
  children,
  "aria-label": ariaLabel,
  itemClassName,
  variant = "card",
  empty,
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
    const firstInsideIndex = focusable.findIndex((element) =>
      event.currentTarget.contains(element),
    );
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

  if (items.length === 0 && empty != null) {
    return (
      <div
        data-slot="feed-empty"
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
      >
        {empty}
      </div>
    );
  }

  return (
    <div
      role="feed"
      aria-busy={busy || undefined}
      aria-label={ariaLabel}
      data-slot="feed"
      data-variant={variant}
      className={cn(FEED_CLASS[variant], className)}
      {...props}
      onKeyDown={handleKeyDown}
    >
      {items.map((child, i) => {
        const itemKey = React.isValidElement(child) && child.key ? child.key : `feed-item-${i}`;
        if (React.isValidElement<FeedItemProps>(child) && child.type === FeedItem) {
          return (
            <FeedArticle
              key={itemKey}
              {...child.props}
              position={i + 1}
              setSize={items.length}
              variant={variant}
              itemClassName={itemClassName}
            />
          );
        }
        return (
          <FeedArticle
            key={itemKey}
            position={i + 1}
            setSize={items.length}
            variant={variant}
            itemClassName={itemClassName}
          >
            {child}
          </FeedArticle>
        );
      })}
    </div>
  );
}

export type { FeedItemLabelling, FeedItemProps, FeedProps, FeedVariant };
export { Feed, FeedItem, useFeedItemLabel };
