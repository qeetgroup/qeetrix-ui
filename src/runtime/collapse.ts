/**
 * How many items of a single-line list fit before the rest have to collapse.
 *
 * Pure arithmetic, extracted from OverflowList so it can be tested with real widths: jsdom
 * performs no layout, so every measurement in a rendered test is zero and a fit decision
 * cannot be observed at all.
 *
 * @see docs/architecture/component-layers.md
 */

/** Which end of the list collapses first. */
type CollapseFrom = "start" | "end";

interface VisibleCountInput {
  /** Intrinsic width of each item, in document order. */
  widths: number[];
  /** Width available on the line. `0` means "not measured yet". */
  available: number;
  /** Column gap between items. */
  gap: number;
  /** Width to reserve for the overflow trigger, which is only shown when something collapses. */
  triggerWidth: number;
  collapseFrom: CollapseFrom;
}

/**
 * The number of items to render.
 *
 * Two properties matter and neither held before:
 *
 * - **The measured end is the kept end.** With `collapseFrom: "start"` the *last* items stay
 *   visible, so the fit has to be accumulated from the end of the list. Measuring the leading
 *   items and then slicing off the front gives the right count only when every item happens to
 *   be the same width.
 * - **The trigger is only reserved for when it exists.** If the whole list fits, no trigger is
 *   rendered and none is reserved — which also means the result cannot oscillate: reserving
 *   space is only ever considered in the branch where something is already collapsing.
 */
function computeVisibleCount(input: VisibleCountInput): number {
  const { widths, available, gap, triggerWidth, collapseFrom } = input;
  if (widths.length === 0) return 0;

  // Unmeasured (no layout yet, or a zero-width container): render everything rather than
  // collapsing a list nobody has measured.
  if (available <= 0) return widths.length;

  const total = widths.reduce((sum, width, index) => sum + width + (index > 0 ? gap : 0), 0);
  if (total <= available) return widths.length;

  const budget = available - triggerWidth - gap;
  const order = collapseFrom === "start" ? [...widths].reverse() : widths;

  let used = 0;
  let count = 0;
  for (const width of order) {
    const next = used + width + (count > 0 ? gap : 0);
    if (next > budget) break;
    used = next;
    count += 1;
  }
  return count;
}

export type { CollapseFrom, VisibleCountInput };
export { computeVisibleCount };
