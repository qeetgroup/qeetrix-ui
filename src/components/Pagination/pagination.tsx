"use client";

import { ChevronLeftIcon } from "@qeetrix/icons/icons/chevron-left";
import { ChevronRightIcon } from "@qeetrix/icons/icons/chevron-right";
import { ChevronsLeftIcon } from "@qeetrix/icons/icons/chevrons-left";

import { Button } from "@/components/Button/button";
import { Spinner } from "@/components/Spinner/spinner";
import type { MessagesFor } from "@/lib/messages";
import { paginationMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

interface PaginationProps {
  /** True when there's a previous page (i.e. not on the first page). */
  hasPrev?: boolean;
  /** True when there's a next page (driven by API's next_cursor). */
  hasNext?: boolean;
  /** Jump to the first page. */
  onFirst?: () => void;
  /**
   * Step back one page. Falls back to {@link PaginationProps.onFirst} when omitted, which is what
   * the "Prev" control did unconditionally before this prop existed — it announced "Previous page"
   * while jumping to the first. Cursor pagination often cannot step backwards, in which case
   * leaving this unset and relying on the fallback is a deliberate choice, not an oversight.
   */
  onPrev?: () => void;
  /** Advance to the next page. */
  onNext?: () => void;
  /** Optional explicit page label override. When omitted, derived from
   *  itemsOnPage and pageSize. */
  label?: React.ReactNode;
  /** Number of rows currently shown — used to derive the default label. */
  itemsOnPage?: number;
  /** Page size — used together with itemsOnPage to label the page. */
  pageSize?: number;
  /** Optional total count, if the API exposes one. */
  total?: number;
  /**
   * A refetch is in flight: the controls disable, the bar is marked `aria-busy`, and a spinner
   * (announced through its own status role) sits beside the label.
   */
  loading?: boolean;
  /**
   * BCP-47 locale for the row counts. Defaults to the nearest `DirectionProvider`'s locale,
   * then to the runtime's own — so an application that declares its locale once gets Indian
   * digit grouping in the footer without passing it here.
   */
  locale?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"pagination">;
  className?: string;
}

/**
 * Pagination is the cursor-based pagination footer used by every
 * index screen — a "First page" jump, a "Next" advance, and a centered
 * label describing the current page. The model matches the backend's
 * cursor pagination API (`limit` + `next_cursor`); add a `total` if you
 * know it for a "showing 1–50 of 1,234" header.
 *
 * It adapts to the width it is given, not the viewport — in a split pane or a card the "Prev"
 * control folds away first, then the "First" label (its accessible name stays), so the row
 * count keeps its room. The label is a polite live region: paging announces the new range.
 *
 * Render only when at least one side has navigable history — the
 * footer is noise on a single-page result set:
 *
 * ```tsx
 * {(hasPrev || hasNext) && (
 *   <Pagination
 *     hasPrev={hasPrev}
 *     hasNext={hasNext}
 *     onFirst={() => setCursor(undefined)}
 *     onNext={() => setCursor(data.next_cursor)}
 *     itemsOnPage={data.items.length}
 *     pageSize={50}
 *   />
 * )}
 * ```
 */
function Pagination({
  hasPrev,
  hasNext,
  onFirst,
  onPrev,
  onNext,
  label,
  itemsOnPage,
  pageSize,
  total,
  loading,
  locale,
  messages: messageOverrides,
  className,
}: PaginationProps) {
  const messages = useMessages("pagination", paginationMessages, messageOverrides);
  const contextLocale = useLocale();
  // `undefined` is passed through deliberately: `Intl` reads it as the runtime's own locale,
  // which follows the user's browser. Substituting a default would override that.
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(locale ?? contextLocale).format(value);
  const derivedLabel =
    label ??
    (() => {
      if (itemsOnPage == null) return null;
      if (total != null) {
        return messages.showingOfTotal(formatNumber(itemsOnPage), formatNumber(total));
      }
      if (pageSize != null) {
        return messages.rowsOnPage(formatNumber(itemsOnPage), itemsOnPage);
      }
      return messages.rows(formatNumber(itemsOnPage));
    })();

  return (
    <nav
      data-slot="pagination"
      aria-label={messages.label}
      aria-busy={loading || undefined}
      className={cn(
        // A size container, so the controls respond to the footer's own width. `w-full` makes
        // that width definite: a size container cannot take its width from its content.
        "@container flex w-full items-center justify-between gap-3 border-t px-3 py-2 text-sm",
        className,
      )}
    >
      <div data-slot="pagination-prev" className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev || loading}
          onClick={onFirst}
          aria-label={messages.firstPage}
        >
          <ChevronsLeftIcon aria-hidden className="rtl:rotate-180" />
          <span className="hidden @xs:inline">{messages.first}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev || loading}
          onClick={onPrev ?? onFirst}
          aria-label={messages.previousPage}
          className="hidden @md:inline-flex"
        >
          <ChevronLeftIcon aria-hidden className="rtl:rotate-180" /> {messages.previous}
        </Button>
      </div>

      {(derivedLabel || loading) && (
        <div
          data-slot="pagination-status"
          className="flex min-w-0 items-center justify-center gap-2"
        >
          {loading && <Spinner size="sm" />}
          {derivedLabel && (
            <span
              data-slot="pagination-label"
              aria-live="polite"
              aria-atomic="true"
              className="truncate text-xs text-muted-foreground tabular-nums @sm:text-sm"
            >
              {derivedLabel}
            </span>
          )}
        </div>
      )}

      <Button
        data-slot="pagination-next"
        variant="outline"
        size="sm"
        disabled={!hasNext || loading}
        onClick={onNext}
        aria-label={messages.nextPage}
        className="shrink-0"
      >
        {messages.next} <ChevronRightIcon aria-hidden className="rtl:rotate-180" />
      </Button>
    </nav>
  );
}

export type { PaginationProps };
export { Pagination };
