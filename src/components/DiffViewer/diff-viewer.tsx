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

/* ── Word-level emphasis ────────────────────────────────────────────────────────────────────
 * A modified line shows up as a removal followed by an addition. When a block of removals is
 * followed directly by a block of additions, the i-th of each are paired and diffed by word, so
 * the changed words carry a stronger wash than the line around them. Pairs that share almost
 * nothing are left alone — highlighting every word of a rewritten line is noise, not emphasis.
 */

type Segment = { text: string; changed: boolean };

/** Token count above which a pair is not word-diffed: the LCS table is tokens(a) × tokens(b). */
const MAX_WORD_TOKENS = 200;
/** Below this share of unchanged characters, a pair is a rewrite and gets no word emphasis. */
const MIN_SHARED_RATIO = 0.4;

const WORD_RE = /\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu;

function wordDiff(before: string, after: string): [Segment[], Segment[]] | null {
  const a = before.match(WORD_RE) ?? [];
  const b = after.match(WORD_RE) ?? [];
  if (a.length === 0 || b.length === 0) return null;
  if (a.length > MAX_WORD_TOKENS || b.length > MAX_WORD_TOKENS) return null;

  const width = b.length + 1;
  const table = new Uint16Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * width + j] =
        a[i] === b[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }

  const left: Segment[] = [];
  const right: Segment[] = [];
  const push = (list: Segment[], text: string, changed: boolean) => {
    const previous = list[list.length - 1];
    if (previous && previous.changed === changed) previous.text += text;
    else list.push({ text, changed });
  };
  let shared = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push(left, a[i], false);
      push(right, b[j], false);
      shared += a[i].length;
      i++;
      j++;
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
      push(left, a[i++], true);
    } else {
      push(right, b[j++], true);
    }
  }
  while (i < a.length) push(left, a[i++], true);
  while (j < b.length) push(right, b[j++], true);

  if (shared / Math.max(before.length, after.length) < MIN_SHARED_RATIO) return null;
  return [mergeSmallGaps(left), mergeSmallGaps(right)];
}

/**
 * Folds a one- or two-character unchanged run between two changes into the change, so
 * `ap-south` → `eu-west` highlights as one edit rather than two words with a dash between them.
 */
function mergeSmallGaps(segments: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (let k = 0; k < segments.length; k++) {
    const segment = segments[k];
    const bridge =
      !segment.changed &&
      segment.text.length <= 2 &&
      segment.text.trim() !== "" &&
      segments[k - 1]?.changed &&
      segments[k + 1]?.changed;
    const previous = out[out.length - 1];
    if ((bridge || segment.changed) && previous?.changed) previous.text += segment.text;
    else out.push({ ...segment, changed: segment.changed || Boolean(bridge) });
  }
  return out;
}

/** Word segments for every paired removal/addition, keyed by op index. */
function pairSegments(ops: DiffOp[]): Map<number, Segment[]> {
  const segments = new Map<number, Segment[]>();
  let index = 0;
  while (index < ops.length) {
    if (ops[index].type !== "remove") {
      index++;
      continue;
    }
    const removeStart = index;
    while (index < ops.length && ops[index].type === "remove") index++;
    const addStart = index;
    while (index < ops.length && ops[index].type === "add") index++;
    const pairs = Math.min(addStart - removeStart, index - addStart);
    for (let k = 0; k < pairs; k++) {
      const result = wordDiff(ops[removeStart + k].text, ops[addStart + k].text);
      if (!result) continue;
      segments.set(removeStart + k, result[0]);
      segments.set(addStart + k, result[1]);
    }
  }
  return segments;
}

interface DiffViewerProps extends React.HTMLAttributes<HTMLDivElement> {
  before: string;
  after: string;
  /** "unified" (default) or side-by-side "split". */
  mode?: "unified" | "split";
  /**
   * Visible name of the old version — a filename, a revision, a timestamp. In split mode the
   * before pane's header; defaults to the `before` message. In unified mode, giving either label
   * adds a header with both and the change counts.
   */
  beforeLabel?: React.ReactNode;
  /** Visible name of the new version. See `beforeLabel`. */
  afterLabel?: React.ReactNode;
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

const gutter = "min-w-8 shrink-0 px-2 text-end text-muted-foreground tabular-nums select-none";

const LINE_BACKGROUND: Record<DiffOp["type"], string> = {
  add: "bg-(--qx-component-diff-viewer-add-background)",
  remove: "bg-(--qx-component-diff-viewer-remove-background)",
  same: "",
};

const EMPHASIS: Record<"add" | "remove", string> = {
  add: "rounded-xs bg-(--qx-component-diff-viewer-add-emphasis)",
  remove: "rounded-xs bg-(--qx-component-diff-viewer-remove-emphasis)",
};

/**
 * The change marker. Colour is the third channel, not the first: the glyph is visible in every
 * mode (and in forced colours), and a screen reader hears the prefix instead of "plus" or "dash".
 */
function Marker({ type, label }: { type: DiffOp["type"]; label: string }) {
  return (
    <span
      data-slot="diff-line-marker"
      className={cn(
        "w-4 shrink-0 text-center font-medium select-none",
        type === "add" && "text-success-text",
        type === "remove" && "text-destructive-text",
      )}
    >
      <span aria-hidden="true">{type === "add" ? "+" : type === "remove" ? "\u2212" : " "}</span>
      {type !== "same" && <span className="sr-only">{label}</span>}
    </span>
  );
}

function LineText({ op, segments }: { op: DiffOp; segments: Segment[] | undefined }) {
  const emphasis = op.type === "same" ? undefined : EMPHASIS[op.type];
  return (
    <span
      data-slot="diff-line-text"
      className="min-w-0 flex-1 pe-3 wrap-anywhere whitespace-pre-wrap"
    >
      {segments && emphasis
        ? segments.map((segment, index) =>
            segment.changed ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: segments have no identity but their position.
              <span key={index} className={emphasis}>
                {segment.text}
              </span>
            ) : (
              segment.text
            ),
          )
        : op.text}
    </span>
  );
}

/**
 * Read-only text/JSON diff (config history, file versions, audit).
 *
 * Changed lines sit on the status surfaces, carry a +/− marker and an announced prefix, and —
 * where a line was modified rather than replaced — the edited words are emphasised. The content
 * is laid out left to right in every locale, because it is code.
 *
 * Diffing is linear in the input for the shape real diffs have (see `maxEditDistance` for the
 * worst case), but the *output* is not virtualized: every line becomes about five elements in
 * unified mode and about seven in split mode, which renders both panes. Paginate or excerpt
 * upstream rather than handing it an entire large file.
 */
function DiffViewer({
  before,
  after,
  mode = "unified",
  beforeLabel,
  afterLabel,
  maxEditDistance = DEFAULT_MAX_EDIT_DISTANCE,
  messages: messageOverrides,
  className,
  ...props
}: DiffViewerProps) {
  const messages = useMessages("diffViewer", diffViewerMessages, messageOverrides);
  const beforeId = React.useId();
  const afterId = React.useId();
  const ops = React.useMemo(
    () => diffLines(before.split("\n"), after.split("\n"), maxEditDistance),
    [before, after, maxEditDistance],
  );
  const segments = React.useMemo(() => pairSegments(ops), [ops]);
  const added = ops.filter((op) => op.type === "add").length;
  const removed = ops.filter((op) => op.type === "remove").length;

  const stats = (
    <span data-slot="diff-viewer-stats" className="ms-auto flex shrink-0 gap-2 tabular-nums">
      <span className="text-success-text">+{added}</span>
      <span className="text-destructive-text">
        {"\u2212"}
        {removed}
      </span>
    </span>
  );

  const frame = cn(
    "overflow-x-auto rounded-lg border border-border bg-surface font-mono text-code leading-5 text-foreground",
    className,
  );
  const header =
    "flex min-h-9 items-center gap-2 border-b border-border bg-surface-subtle px-3 py-1.5 font-sans text-caption text-muted-foreground";

  if (mode === "split") {
    return (
      <div data-slot="diff-viewer" data-mode="split" dir="ltr" className={frame} {...props}>
        <div className="grid min-w-max grid-cols-2">
          {/* biome-ignore lint/a11y/useSemanticElements: role="group" names a diff pane; <fieldset> would add form semantics. */}
          <div role="group" aria-labelledby={beforeId} className="min-w-0 border-e border-border">
            <div data-slot="diff-viewer-header" className={header}>
              <span id={beforeId} className="min-w-0 truncate">
                {beforeLabel ?? messages.before}
              </span>
            </div>
            <div className="py-1">
              {ops.map((op, i) => {
                const rowKey = `old-${i}`;
                return op.type !== "add" ? (
                  <div
                    key={rowKey}
                    data-slot="diff-line"
                    data-type={op.type}
                    className={cn("flex", LINE_BACKGROUND[op.type])}
                  >
                    <span data-slot="diff-line-number-old" className={gutter}>
                      {op.oldLine}
                    </span>
                    <Marker type={op.type} label={messages.removed} />
                    <LineText op={op} segments={segments.get(i)} />
                  </div>
                ) : (
                  // A line that exists only on the other side: a quiet placeholder keeps the two
                  // panes aligned row for row.
                  <div
                    key={rowKey}
                    aria-hidden="true"
                    data-slot="diff-line-placeholder"
                    className="bg-surface-subtle"
                  >
                    &nbsp;
                  </div>
                );
              })}
            </div>
          </div>
          {/* biome-ignore lint/a11y/useSemanticElements: role="group" names a diff pane; <fieldset> would add form semantics. */}
          <div role="group" aria-labelledby={afterId} className="min-w-0">
            <div data-slot="diff-viewer-header" className={header}>
              <span id={afterId} className="min-w-0 truncate">
                {afterLabel ?? messages.after}
              </span>
              {stats}
            </div>
            <div className="py-1">
              {ops.map((op, i) => {
                const rowKey = `new-${i}`;
                return op.type !== "remove" ? (
                  <div
                    key={rowKey}
                    data-slot="diff-line"
                    data-type={op.type}
                    className={cn("flex", LINE_BACKGROUND[op.type])}
                  >
                    <span data-slot="diff-line-number-new" className={gutter}>
                      {op.newLine}
                    </span>
                    <Marker type={op.type} label={messages.added} />
                    <LineText op={op} segments={segments.get(i)} />
                  </div>
                ) : (
                  <div
                    key={rowKey}
                    aria-hidden="true"
                    data-slot="diff-line-placeholder"
                    className="bg-surface-subtle"
                  >
                    &nbsp;
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const labelled = beforeLabel != null || afterLabel != null;

  return (
    <div data-slot="diff-viewer" data-mode="unified" dir="ltr" className={frame} {...props}>
      {labelled && (
        <div data-slot="diff-viewer-header" className={header}>
          <span className="min-w-0 truncate">{beforeLabel ?? messages.before}</span>
          <span aria-hidden="true">{"\u2192"}</span>
          <span className="min-w-0 truncate">{afterLabel ?? messages.after}</span>
          {stats}
        </div>
      )}
      <div data-slot="diff-viewer-lines" className="min-w-max py-1">
        {ops.map((op, i) => {
          const rowKey = `row-${i}`;
          return (
            <div
              key={rowKey}
              data-slot="diff-line"
              data-type={op.type}
              className={cn("flex", LINE_BACKGROUND[op.type])}
            >
              <span data-slot="diff-line-number-old" className={gutter}>
                {op.oldLine ?? ""}
              </span>
              <span data-slot="diff-line-number-new" className={gutter}>
                {op.newLine ?? ""}
              </span>
              <Marker
                type={op.type}
                label={op.type === "add" ? messages.added : messages.removed}
              />
              <LineText op={op} segments={segments.get(i)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { DiffViewerProps };
export { DiffViewer };
