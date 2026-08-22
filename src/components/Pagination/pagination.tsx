"use client";

import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon } from "lucide-react";

import { Button } from "@/components/Button/button";
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
  /** Disable everything while a refetch is in flight. */
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
      className={cn(
        "flex items-center justify-between gap-3 border-t px-3 py-2 text-sm",
        className,
      )}
    >
      <div data-slot="pagination-prev" className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev || loading}
          onClick={onFirst}
          aria-label={messages.firstPage}
        >
          <ChevronsLeftIcon aria-hidden className="rtl:rotate-180" /> {messages.first}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasPrev || loading}
          onClick={onPrev ?? onFirst}
          aria-label={messages.previousPage}
          className="hidden sm:inline-flex"
        >
          <ChevronLeftIcon aria-hidden className="rtl:rotate-180" /> {messages.previous}
        </Button>
      </div>

      {derivedLabel && (
        <span
          data-slot="pagination-label"
          className="truncate text-xs text-muted-foreground sm:text-sm"
        >
          {derivedLabel}
        </span>
      )}

      <Button
        data-slot="pagination-next"
        variant="outline"
        size="sm"
        disabled={!hasNext || loading}
        onClick={onNext}
        aria-label={messages.nextPage}
      >
        {messages.next} <ChevronRightIcon aria-hidden className="rtl:rotate-180" />
      </Button>
    </nav>
  );
}

export type { PaginationProps };
export { Pagination };
