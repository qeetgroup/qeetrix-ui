import type { Row } from "@qeetrix/ui";

/**
 * Exact-match facet filter for DataTable faceted columns. The built-in `arrIncludesSome` (which
 * the DataTable docs recommend) matches by substring on string cells, so selecting "active" also
 * keeps "inactive" rows — see the bug list in the playground report.
 */
export function matchesAny<TData>(row: Row<TData>, columnId: string, selected: string[]): boolean {
  return selected.includes(String(row.getValue(columnId)));
}
