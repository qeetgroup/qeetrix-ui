import * as React from "react";

import { cn } from "@/lib/utils";

type DiffOp = { type: "same" | "add" | "remove"; text: string; oldLine?: number; newLine?: number };

/** Minimal LCS-based line diff — no dependency. */
function diffLines(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  let oldL = 1;
  let newL = 1;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "same", text: a[i], oldLine: oldL++, newLine: newL++ });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "remove", text: a[i], oldLine: oldL++ });
      i++;
    } else {
      ops.push({ type: "add", text: b[j], newLine: newL++ });
      j++;
    }
  }
  while (i < n) ops.push({ type: "remove", text: a[i++], oldLine: oldL++ });
  while (j < m) ops.push({ type: "add", text: b[j++], newLine: newL++ });
  return ops;
}

interface DiffViewerProps extends React.HTMLAttributes<HTMLDivElement> {
  before: string;
  after: string;
  /** "unified" (default) or side-by-side "split". */
  mode?: "unified" | "split";
}

const gutter = "w-8 shrink-0 select-none text-end text-muted-foreground";
const rowBg = (t: DiffOp["type"]) =>
  t === "add" ? "bg-success/10" : t === "remove" ? "bg-destructive/10" : "";

/** Read-only text/JSON diff (config history, file versions, audit). */
function DiffViewer({ before, after, mode = "unified", className, ...props }: DiffViewerProps) {
  const ops = React.useMemo(
    () => diffLines(before.split("\n"), after.split("\n")),
    [before, after],
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
        <div role="group" aria-label="Before version" className="border-e border-border">
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
                {op.type === "remove" && <span className="sr-only">Removed:</span>}
                <span className="whitespace-pre-wrap">{op.text}</span>
              </div>
            ) : (
              <div key={rowKey} className="bg-muted/30 px-2 py-0.5">
                &nbsp;
              </div>
            );
          })}
        </div>
        <div role="group" aria-label="After version">
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
                  className={cn(
                    "w-3 shrink-0 select-none",
                    op.type === "add" && "text-success",
                  )}
                >
                  {op.type === "add" ? "+" : " "}
                </span>
                {op.type === "add" && <span className="sr-only">Added:</span>}
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
