import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { DiffViewer } from "@/components/DiffViewer/diff-viewer";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("DiffViewer", () => {
  it("shows added and removed lines", () => {
    render(<DiffViewer before={"a\nb\nc"} after={"a\nB\nc"} />);
    expect(screen.getByText("b")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("renders split mode", () => {
    const { container } = render(<DiffViewer before={"x\ny"} after={"x\nz"} mode="split" />);
    expect(container.querySelector('[data-slot="diff-viewer"]')).not.toBeNull();
  });

  it("identifies split columns and changes without relying on color", () => {
    render(<DiffViewer before={"same\nold"} after={"same\nnew"} mode="split" />);

    expect(screen.getByRole("group", { name: "Before version" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "After version" })).toBeInTheDocument();
    expect(screen.getByText("Removed:")).toBeInTheDocument();
    expect(screen.getByText("Added:")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<DiffViewer before={"x"} after={"y"} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/* ── Algorithm equivalence ─────────────────────────────────────────────────────────────────
 * DiffViewer used to build a full LCS matrix and walk it; it now runs Myers' greedy search.
 * `lcsDiff` below is that previous implementation, kept as the reference: the replacement has
 * to agree with it, and where several minimal alignments exist it at least has to change the
 * same *number* of lines. These read the rendered rows rather than calling the algorithm, so
 * they assert the output a consumer sees.
 */

type Op = { type: "same" | "add" | "remove"; text: string; oldLine?: number; newLine?: number };

/** The pre-Myers implementation, verbatim, as the reference alignment. */
function lcsDiff(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: Op[] = [];
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

/** Reads the op list back out of a rendered unified diff. */
function renderedOps(container: Element): Op[] {
  const root = container.querySelector('[data-slot="diff-viewer"]');
  if (!root) throw new Error("no diff-viewer rendered");
  return Array.from(root.children).map((row) => {
    const cells = Array.from(row.children).map((cell) => cell.textContent ?? "");
    const [oldLine, newLine, marker, text] = cells;
    const type = marker === "+" ? "add" : marker === "-" ? "remove" : "same";
    const op: Op = { type, text };
    if (oldLine) op.oldLine = Number(oldLine);
    if (newLine) op.newLine = Number(newLine);
    return op;
  });
}

const asKey = (ops: Op[]) =>
  ops.map((o) => `${o.type}:${o.oldLine ?? ""}:${o.newLine ?? ""}:${o.text}`).join("\n");
const changed = (ops: Op[]) => ops.filter((o) => o.type !== "same").length;

/** Deterministic LCG — a seeded corpus, so a failure is reproducible. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function edited(lines: string[], edits: number, random: () => number) {
  const out = lines.slice();
  for (let e = 0; e < edits; e++) {
    const at = Math.floor(random() * out.length);
    const kind = Math.floor(random() * 3);
    if (kind === 0) out.splice(at, 1);
    else if (kind === 1) out.splice(at, 0, `  "inserted${e}": true,`);
    else out[at] = `  "changed${e}": true,`;
  }
  return out;
}

describe("DiffViewer diff algorithm", () => {
  it("renders the same alignment as the reference LCS diff for document-shaped inputs", () => {
    const random = makeRandom(20260822);
    let compared = 0;
    for (let round = 0; round < 12; round++) {
      // Two shapes: distinct lines (a source file) and heavily repeated lines (formatted JSON,
      // where `},` occurs on a third of the lines and alignments are easy to get wrong).
      const size = 12 + Math.floor(random() * 12);
      const source = Array.from({ length: size }, (_, i) => `const value${i} = ${i} * 2;`);
      const json = Array.from(
        { length: size },
        (_, i) => [`  "key${i}": {`, `    "on": true`, "  },"][i % 3],
      );
      for (const before of [source, json]) {
        const after = edited(before, 1 + Math.floor(random() * 4), random);
        const { container, unmount } = render(
          <DiffViewer before={before.join("\n")} after={after.join("\n")} />,
        );
        expect(asKey(renderedOps(container))).toBe(asKey(lcsDiff(before, after)));
        compared++;
        unmount();
      }
    }
    expect(compared).toBe(24);
  });

  it("changes the minimal number of lines even where several alignments tie", () => {
    // Two-symbol lines make ties the norm: Myers and the LCS walk can pick different equally
    // minimal alignments, so the invariant is the edit count and the reconstruction, not the
    // exact op order.
    const random = makeRandom(7);
    for (let round = 0; round < 150; round++) {
      const line = () => (random() < 0.5 ? "x" : "y");
      // At least one line each side: `[].join("\n")` is `""`, which the component reads back
      // as a single empty line, so an empty array is not expressible through the props.
      const before = Array.from({ length: 1 + Math.floor(random() * 6) }, line);
      const after = Array.from({ length: 1 + Math.floor(random() * 6) }, line);
      const { container, unmount } = render(
        <DiffViewer before={before.join("\n")} after={after.join("\n")} />,
      );
      const ops = renderedOps(container);
      expect(changed(ops)).toBe(changed(lcsDiff(before, after)));
      // Reconstruction: same + remove rows are `before`, same + add rows are `after`.
      expect(ops.filter((o) => o.type !== "add").map((o) => o.text)).toEqual(before);
      expect(ops.filter((o) => o.type !== "remove").map((o) => o.text)).toEqual(after);
      // Gutters number the two files independently and consecutively.
      expect(ops.filter((o) => o.type !== "add").map((o) => o.oldLine)).toEqual(
        before.map((_, i) => i + 1),
      );
      unmount();
    }
  });

  it("numbers unchanged lines on both sides and changed lines on one", () => {
    const { container } = render(<DiffViewer before={"a\nb\nc"} after={"a\nB\nc"} />);
    expect(renderedOps(container)).toEqual([
      { type: "same", text: "a", oldLine: 1, newLine: 1 },
      { type: "remove", text: "b", oldLine: 2 },
      { type: "add", text: "B", newLine: 2 },
      { type: "same", text: "c", oldLine: 3, newLine: 3 },
    ]);
  });

  it("falls back to a wholesale replacement past maxEditDistance", () => {
    // Nothing in common: the minimal script needs 8 edits, so a ceiling of 2 has to give up.
    const before = ["a1", "a2", "a3", "a4"];
    const after = ["b1", "b2", "b3", "b4"];
    const { container } = render(
      <DiffViewer before={before.join("\n")} after={after.join("\n")} maxEditDistance={2} />,
    );
    const ops = renderedOps(container);
    expect(ops.map((o) => o.type)).toEqual([
      "remove",
      "remove",
      "remove",
      "remove",
      "add",
      "add",
      "add",
      "add",
    ]);
    // Still a correct diff: it reconstructs both inputs, it is just not minimal.
    expect(ops.filter((o) => o.type !== "add").map((o) => o.text)).toEqual(before);
    expect(ops.filter((o) => o.type !== "remove").map((o) => o.text)).toEqual(after);
  });

  it("keeps the common prefix and suffix out of the fallback region", () => {
    const before = ["head", "a1", "a2", "a3", "tail"];
    const after = ["head", "b1", "b2", "b3", "tail"];
    const { container } = render(
      <DiffViewer before={before.join("\n")} after={after.join("\n")} maxEditDistance={0} />,
    );
    expect(renderedOps(container).map((o) => o.type)).toEqual([
      "same",
      "remove",
      "remove",
      "remove",
      "add",
      "add",
      "add",
      "same",
    ]);
  });

  it("handles empty, identical, and one-sided inputs", () => {
    const cases: [string, string][] = [
      ["", ""],
      ["a", "a"],
      ["", "a\nb"],
      ["a\nb", ""],
      ["a\n\nb", "a\nb"],
    ];
    for (const [before, after] of cases) {
      const { container, unmount } = render(<DiffViewer before={before} after={after} />);
      expect(asKey(renderedOps(container))).toBe(
        asKey(lcsDiff(before.split("\n"), after.split("\n"))),
      );
      unmount();
    }
  });
});
