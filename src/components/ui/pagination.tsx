"use client";

import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n, useTranslations } from "@/i18n";
import { cn } from "@/lib/utils";

interface PaginationProps {
  /** True when there's a previous page (i.e. not on the first page). */
  hasPrev?: boolean;
  /** True when there's a next page (driven by API's next_cursor). */
  hasNext?: boolean;
  /** Jump to the first page. */
  onFirst?: () => void;
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
  onNext,
  label,
  itemsOnPage,
  pageSize,
  total,
  loading,
  className,
}: PaginationProps) {
  const { locale } = useI18n();
  const t = useTranslations("pagination");
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
  const derivedLabel =
    label ??
    (() => {
      if (itemsOnPage == null) return null;
      if (total != null) {
        return t("showing", {
          count: formatNumber(itemsOnPage),
          total: formatNumber(total),
        });
      }
      if (pageSize != null) {
        return t(itemsOnPage === 1 ? "rowOnPage" : "rowsOnPage", {
          count: formatNumber(itemsOnPage),
        });
      }
      return t("rows", { count: formatNumber(itemsOnPage) });
    })();

  return (
    <nav
      data-slot="pagination"
      aria-label={t("label")}
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
          aria-label={t("firstPage")}
        >
          <ChevronsLeftIcon /> {t("first")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasPrev || loading}
          onClick={onFirst}
          aria-label={t("previousPage")}
          className="hidden sm:inline-flex"
        >
          <ChevronLeftIcon /> {t("previousShort")}
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
        aria-label={t("nextPage")}
      >
        {t("next")} <ChevronRightIcon />
      </Button>
    </nav>
  );
}

export type { PaginationProps };
export { Pagination };
