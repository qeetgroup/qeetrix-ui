import * as React from "react";

import type { MessagesFor } from "@/lib/messages";
import { diffViewerMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

type DiffOp = { type: "same" | "add" | "remove"; text: string; oldLine?: number; newLine?: number };
type Move = { type: "same" | "add" | "remove"; index: number };

/* ── Line diff ─────────────────────────────────────────────────────────────────────────────
 * Myers' greedy shortest-edit-script search, not a longest-common-subsequence matrix. The
 * previous implementation allocated an (n+1)x(m+1) matrix of numbers before it rendered
 * anything: 400 million cells for two 20k-line files, which exhausts memory long before it
 * finishes. This walks the edit graph instead, so the cost tracks how *different* the inputs
 * are rather than how long they are: O((n + m) * d) comparisons for an edit distance of d.
 *
 * Three parts:
 *   1. trim the common prefix and suffix — linear, and the entire cost of a one-line change
 *   2. Myers over the divergent middle, keeping one furthest-reaching band per edit depth so
 *      the path can be walked back. The bands are the only super-linear term, at ~4 * d^2
 *      bytes, which is what `maxEditDistance` exists to bound
 *   3. past `maxEditDistance`, stop searching and report the middle as a wholesale
 *      replacement (every line removed, then every line added) — a correct diff, not a
 *      minimal one
 *
 * The op list is identical to the one the LCS walk produced for every diff whose alignment is
 * unique; the tests hold a reference LCS implementation and assert that. Where an input admits
 * several equally minimal alignments — which needs many repeated lines, such as bare closing
 * braces — the two can choose different ones. The number of changed lines is the same either
 * way, and matches the LCS minimum.
 */

/** Default `maxEditDistance`: bounds scratch memory at roughly 4 MB. */
const DEFAULT_MAX_EDIT_DISTANCE = 1000;

/**
 * Shortest edit script for `a[aStart, aStart + n)` against `b[bStart, bStart + m)`, or `null`
 * when it would take more than `maxDepth` insertions plus deletions to get there.
 */
function shortestEditScript(
  a: string[],
  aStart: number,
  n: number,
  b: string[],
  bStart: number,
  m: number,
  maxDepth: number,
): Move[] | null {
  const deepest = Math.min(n + m, maxDepth);
  // V holds the furthest x reached on each diagonal k = x - y, indexed with an offset so that
  // negative diagonals address into the array. The offset carries one slot of slack each side
  // so both the k +/- 1 reads below and the `subarray` bounds stay non-negative at the widest
  // band — a negative `subarray` start would silently wrap to the end of the array.
  const offset = n + m + 1;
  const v = new Int32Array(2 * (n + m) + 3);
  const trace: Int32Array[] = [];
  let depth = -1;

  search: for (let d = 0; d <= deepest; d++) {
    const band = new Int32Array(2 * d + 3);
    band.set(v.subarray(offset - d - 1, offset + d + 2));
    trace.push(band);

    for (let k = -d; k <= d; k += 2) {
      // Extend whichever depth-(d - 1) path reaches further: down is an insertion, right a
      // deletion. Preferring right on a tie is what keeps the output aligned with the LCS
      // walk this replaced.
      const down = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]);
      let x = down ? v[offset + k + 1] : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[aStart + x] === b[bStart + y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        depth = d;
        break search;
      }
    }
  }
  if (depth < 0) return null;

  // Walk the recorded bands back from (n, m). `band[k + d + 1]` undoes the subarray offset.
  const moves: Move[] = [];
  let x = n;
  let y = m;
  for (let d = depth; d > 0; d--) {
    const band = trace[d];
    const k = x - y;
    const down = k === -d || (k !== d && band[d + k] < band[d + k + 2]);
    const previousK = down ? k + 1 : k - 1;
    const previousX = band[d + previousK + 1];
    const previousY = previousX - previousK;
    while (x > previousX && y > previousY) {
      x--;
      y--;
      moves.push({ type: "same", index: aStart + x });
    }
    if (x === previousX) {
      y--;
      moves.push({ type: "add", index: bStart + y });
    } else {
      x--;
      moves.push({ type: "remove", index: aStart + x });
    }
  }
  while (x > 0 && y > 0) {
    x--;
    y--;
    moves.push({ type: "same", index: aStart + x });
  }
  return moves.reverse();
}

function diffLines(a: string[], b: string[], maxEditDistance: number): DiffOp[] {
  const ops: DiffOp[] = [];
  let oldLine = 1;
  let newLine = 1;
  const same = (text: string) =>
    ops.push({ type: "same", text, oldLine: oldLine++, newLine: newLine++ });
  const removed = (text: string) => ops.push({ type: "remove", text, oldLine: oldLine++ });
  const added = (text: string) => ops.push({ type: "add", text, newLine: newLine++ });

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let trailing = 0;
  while (
    a.length - trailing - 1 >= start &&
    b.length - trailing - 1 >= start &&
    a[a.length - trailing - 1] === b[b.length - trailing - 1]
  ) {
    trailing++;
  }

  const aEnd = a.length - trailing;
  const bEnd = b.length - trailing;
  const n = aEnd - start;
  const m = bEnd - start;

  for (let i = 0; i < start; i++) same(a[i]);

  const moves =
    n > 0 && m > 0 ? shortestEditScript(a, start, n, b, start, m, maxEditDistance) : null;
  if (moves) {
    for (const move of moves) {
      if (move.type === "same") same(a[move.index]);
      else if (move.type === "remove") removed(a[move.index]);
      else added(b[move.index]);
    }
  } else {
    for (let i = start; i < aEnd; i++) removed(a[i]);
    for (let j = start; j < bEnd; j++) added(b[j]);
  }

  for (let i = aEnd; i < a.length; i++) same(a[i]);
  return ops;
}

interface DiffViewerProps extends React.HTMLAttributes<HTMLDivElement> {
  before: string;
  after: string;
  /** "unified" (default) or side-by-side "split". */
  mode?: "unified" | "split";
  /**
   * Ceiling on the number of insertions plus deletions the diff searches for before it reports
   * the divergent region as a wholesale replacement instead. Bounds the worst case — two inputs
   * with nothing in common — to `maxEditDistance * (lines)` comparisons and roughly
   * `4 * maxEditDistance^2` bytes of scratch memory. Default 1000.
   */
  maxEditDistance?: number;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"diffViewer">;
}

const gutter = "w-8 shrink-0 select-none text-end text-muted-foreground";
const rowBg = (t: DiffOp["type"]) =>
  t === "add" ? "bg-success/10" : t === "remove" ? "bg-destructive/10" : "";

/**
 * Read-only text/JSON diff (config history, file versions, audit).
 *
 * Diffing is linear in the input for the shape real diffs have (see `maxEditDistance` for the
 * worst case), but the *output* is not virtualized: every line becomes about four elements in
 * unified mode and about six in split mode, which renders both panes. Paginate or excerpt
 * upstream rather than handing it an entire large file.
 */
function DiffViewer({
  before,
  after,
  mode = "unified",
  maxEditDistance = DEFAULT_MAX_EDIT_DISTANCE,
  messages: messageOverrides,
  className,
  ...props
}: DiffViewerProps) {
  const messages = useMessages("diffViewer", diffViewerMessages, messageOverrides);
  const ops = React.useMemo(
    () => diffLines(before.split("\n"), after.split("\n"), maxEditDistance),
    [before, after, maxEditDistance],
  );

  if (mode === "split") {
    return (
      <div
        data-slot="diff-viewer"
        className={cn(
          "grid grid-cols-2 overflow-x-auto rounded-lg border border-border font-mono text-xs",
          className,
        )}
        {...props}
      >
        {/* biome-ignore lint/a11y/useSemanticElements: role="group" names a diff pane; <fieldset> would add form semantics. */}
        <div role="group" aria-label={messages.before} className="border-e border-border">
          {ops.map((op, i) => {
            const rowKey = `old-${i}`;
            return op.type !== "add" ? (
              <div
                key={rowKey}
                className={cn(
                  "flex gap-2 px-2 py-0.5",
                  rowBg(op.type === "remove" ? "remove" : "same"),
                )}
              >
                <span className={gutter}>{op.oldLine}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "w-3 shrink-0 select-none",
                    op.type === "remove" && "text-destructive",
                  )}
                >
                  {op.type === "remove" ? "-" : " "}
                </span>
                {op.type === "remove" && <span className="sr-only">{messages.removed}</span>}
                <span className="whitespace-pre-wrap">{op.text}</span>
              </div>
            ) : (
              <div key={rowKey} className="bg-muted/30 px-2 py-0.5">
                &nbsp;
              </div>
            );
          })}
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: role="group" names a diff pane; <fieldset> would add form semantics. */}
        <div role="group" aria-label={messages.after}>
          {ops.map((op, i) => {
            const rowKey = `new-${i}`;
            return op.type !== "remove" ? (
              <div
                key={rowKey}
                className={cn("flex gap-2 px-2 py-0.5", rowBg(op.type === "add" ? "add" : "same"))}
              >
                <span className={gutter}>{op.newLine}</span>
                <span
                  aria-hidden="true"
                  className={cn("w-3 shrink-0 select-none", op.type === "add" && "text-success")}
                >
                  {op.type === "add" ? "+" : " "}
                </span>
                {op.type === "add" && <span className="sr-only">{messages.added}</span>}
                <span className="whitespace-pre-wrap">{op.text}</span>
              </div>
            ) : (
              <div key={rowKey} className="bg-muted/30 px-2 py-0.5">
                &nbsp;
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      data-slot="diff-viewer"
      className={cn("overflow-x-auto rounded-lg border border-border font-mono text-xs", className)}
      {...props}
    >
      {ops.map((op, i) => {
        const rowKey = `row-${i}`;
        return (
          <div key={rowKey} className={cn("flex gap-2 px-2 py-0.5", rowBg(op.type))}>
            <span className={gutter}>{op.oldLine ?? ""}</span>
            <span className={gutter}>{op.newLine ?? ""}</span>
            <span
              className={cn(
                "w-3 shrink-0 select-none",
                op.type === "add" && "text-success",
                op.type === "remove" && "text-destructive",
              )}
            >
              {op.type === "add" ? "+" : op.type === "remove" ? "-" : " "}
            </span>
            <span className="whitespace-pre-wrap">{op.text}</span>
          </div>
        );
      })}
    </div>
  );
}

export type { DiffViewerProps };
export { DiffViewer };
