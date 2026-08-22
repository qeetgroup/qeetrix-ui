import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createColumnHelper } from "@tanstack/react-table";
import { render } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it } from "vitest";

import { DataTable } from "@/components/DataTable/data-table";
import { DiffViewer } from "@/components/DiffViewer/diff-viewer";
import { Feed } from "@/components/Feed/feed";
import { JSONTree } from "@/components/JsonTree/json-tree";
import { OrgChart } from "@/components/OrgChart/org-chart";
import { type TreeNode, TreeView } from "@/components/TreeView/tree-view";
import { ScheduleCalendar, type ScheduleEvent } from "@/components/Calendar/schedule-calendar";

/* ── What this file measures ───────────────────────────────────────────────────────────────
 * The gap this closes is that nothing in the repo carried a number: no render budget, no
 * observer budget, no input-size contract, and no benchmark to notice a regression. Every
 * figure below is recorded in `baseline.json` with the fixture that produced it, and asserted
 * as a ceiling.
 *
 * **These are not browser performance numbers.** vitest runs jsdom, which does no layout and no
 * paint: `getBoundingClientRect` is all zeros and `ResizeObserver` never fires. What is being
 * counted is JavaScript work and DOM construction — element count, listener count, observer
 * count, and how many times a component reads its input array. Those are deterministic, which
 * is the point: a wall-clock millisecond budget on shared CI is a flake generator, while
 * "TreeView builds 521 elements for 120 expanded nodes" is the same number on every machine.
 *
 * Budgets are a **ratchet**, not a target: each one is the value measured on the day it was
 * recorded plus a stated headroom, and `scripts/check/performance.mjs` refuses any commit that
 * raises one. Improving a component means re-recording a smaller number, never a larger one.
 *
 * To re-record after an intended change: run this file, take the measured value from the
 * failure message, and update both `measured` and `budget` in `baseline.json`.
 */

type Metric = { measured: number; budget: number };
type Baseline = {
  cases: Record<string, { fixture: string; metrics: Record<string, Metric> }>;
};

const baseline = JSON.parse(
  readFileSync(resolve(process.cwd(), "src/__tests__/performance/baseline.json"), "utf8"),
) as Baseline;

/* ── Counters ──────────────────────────────────────────────────────────────────────────────
 * `dataReads` is the interesting one. A component's asymptotic behaviour is invisible in its
 * output — a quadratic diff and a linear diff render the same rows — so the fixture's data
 * array is handed over behind a Proxy that counts index reads. That is implementation-agnostic
 * (any algorithm has to read the elements it compares) and exact, so the *growth* of the count
 * between two input sizes is a complexity assertion rather than a timing guess.
 */

let dataReads = 0;

function tracked<T>(items: T[]): T[] {
  return new Proxy(items, {
    get(target, property, receiver) {
      if (typeof property === "string" && property.length > 0 && !Number.isNaN(Number(property))) {
        dataReads++;
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

/** Same counter, one level in: reads of each item's fields, for a component that copies the
 *  array before scanning it (a copy hides index reads but not field reads). */
function trackedItems<T extends object>(items: T[]): T[] {
  return tracked(
    items.map(
      (item) =>
        new Proxy(item, {
          get(target, property, receiver) {
            dataReads++;
            return Reflect.get(target, property, receiver);
          },
        }),
    ),
  );
}

type Counters = { elements: number; listeners: number; observers: number; dataReads: number };

/** Mounts `ui`, counts what it built, and unmounts. */
function measureRaw(ui: React.ReactElement): Counters {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalResizeObserver = window.ResizeObserver;
  const originalSplit = String.prototype.split;
  // Narrowed to the one overload called below: `.call` would otherwise resolve to `split`'s
  // symbol-splitter signature. The unnarrowed reference above is what gets restored.
  const callSplit = originalSplit as (
    this: string,
    separator: string | RegExp,
    limit?: number,
  ) => string[];
  let listeners = 0;
  let observers = 0;
  dataReads = 0;

  EventTarget.prototype.addEventListener = function countingAddEventListener(
    this: EventTarget,
    ...args: Parameters<EventTarget["addEventListener"]>
  ) {
    listeners++;
    return originalAddEventListener.apply(this, args);
  };
  window.ResizeObserver = class CountingResizeObserver extends originalResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      super(callback);
      observers++;
    }
  };
  // DiffViewer takes its input as two strings and splits them itself, so there is no array to
  // wrap. Wrapping the *result* of a newline split is the same measurement: the diff's reads of
  // its line arrays. Only the large fixtures below split on newlines, hence the length floor.
  function countingSplit(this: string, separator: string | RegExp, limit?: number) {
    const result = callSplit.call(this, separator, limit);
    return separator === "\n" && result.length >= 64 ? tracked(result) : result;
  }
  // Only the (separator, limit) overload is implemented — nothing under test calls the
  // Symbol.split one — so the assignment needs the cast.
  String.prototype.split = countingSplit as unknown as typeof String.prototype.split;

  try {
    const { container, unmount } = render(ui);
    const counters = {
      elements: container.querySelectorAll("*").length,
      listeners,
      observers,
      dataReads,
    };
    unmount();
    return counters;
  } finally {
    EventTarget.prototype.addEventListener = originalAddEventListener;
    window.ResizeObserver = originalResizeObserver;
    String.prototype.split = originalSplit;
  }
}

// React 19 attaches its delegated listeners to the container, so every mount — even of an
// empty div — registers ~140 of them. That constant would swamp the interesting number, and the
// first mount in a file pays one-off costs on top, so the floor is measured twice and the
// recorded figure is what the component adds beyond it.
let listenerFloor: number | null = null;

function measure(ui: React.ReactElement): Counters {
  if (listenerFloor === null) {
    measureRaw(<div data-slot="warm-up" />);
    listenerFloor = measureRaw(<div data-slot="warm-up" />).listeners;
  }
  const counters = measureRaw(ui);
  return { ...counters, listeners: Math.max(0, counters.listeners - listenerFloor) };
}

/** Asserts every recorded metric for `name` and returns what was measured. */
function assertBudget(name: string, counters: Counters) {
  const recorded = baseline.cases[name];
  expect(
    recorded,
    `no baseline recorded for "${name}" — measured ${JSON.stringify(counters)}`,
  ).toBeDefined();
  for (const [metric, { budget }] of Object.entries(recorded.metrics)) {
    const value = counters[metric as keyof Counters];
    expect(
      value,
      `${name}.${metric}: measured ${value}, budget ${budget}. Budgets only shrink — if this is an intended regression, justify it in the changeset; otherwise re-record a smaller number.`,
    ).toBeLessThanOrEqual(budget);
  }
  return counters;
}

/* ── Fixtures ──────────────────────────────────────────────────────────────────────────────*/

const lines = (count: number) => Array.from({ length: count }, (_, i) => `const value${i} = ${i};`);

function changedInTheMiddle(count: number) {
  const before = lines(count);
  const after = before.slice();
  after[Math.floor(count / 2)] = "const value = changed;";
  return { before: before.join("\n"), after: after.join("\n") };
}

type Person = { name: string; email: string; role: string };
const columnHelper = createColumnHelper<Person>();
const personColumns = [
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("email", { header: "Email" }),
  columnHelper.accessor("role", { header: "Role" }),
];
const people = (count: number): Person[] =>
  Array.from({ length: count }, (_, i) => ({
    name: `Person ${i}`,
    email: `person${i}@qeet.in`,
    role: i % 2 === 0 ? "Admin" : "Member",
  }));

const treeNodes = (roots: number, childrenEach: number, defaultOpen: boolean): TreeNode[] =>
  Array.from({ length: roots }, (_, i) => ({
    id: `root-${i}`,
    label: `Root ${i}`,
    defaultOpen,
    children: Array.from({ length: childrenEach }, (_, j) => ({
      id: `leaf-${i}-${j}`,
      label: `Leaf ${i}.${j}`,
    })),
  }));

const orgTree = (breadth: number, depth: number) => {
  const build = (level: number, path: string): Parameters<typeof OrgChart>[0]["data"] => ({
    id: path,
    label: `Node ${path}`,
    children:
      level >= depth
        ? undefined
        : Array.from({ length: breadth }, (_, i) => build(level + 1, `${path}.${i}`)),
  });
  return build(0, "root");
};

const jsonPayload = (keys: number) =>
  Object.fromEntries(
    Array.from({ length: keys }, (_, i) => [`key${i}`, { enabled: i % 2 === 0, value: i }]),
  );

const scheduleEvents = (count: number): ScheduleEvent[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `event-${i}`,
    title: `Event ${i}`,
    start: new Date(2026, 6, 1 + (i % 28), 9, 0),
    end: new Date(2026, 6, 1 + (i % 28), 10, 0),
  }));
const scheduleFocus = new Date(2026, 6, 10);

/* ── DiffViewer: the complexity property, not a stopwatch ──────────────────────────────────*/

describe("DiffViewer scale", () => {
  it("reads its input a linear number of times, not a quadratic one", () => {
    // The implementation this replaced filled an (n+1)x(m+1) LCS matrix, so quadrupling the
    // input multiplied the reads by ~16. Trimming the common prefix and suffix and running
    // Myers over what is left makes a one-line change cost a constant number of passes,
    // whatever the file length. The assertion is on the *ratio*, so it holds on any machine.
    const small = measure(<DiffViewer {...changedInTheMiddle(250)} />);
    const large = measure(<DiffViewer {...changedInTheMiddle(1000)} />);

    assertBudget("diff-viewer/lines-250-one-change", small);
    assertBudget("diff-viewer/lines-1000-one-change", large);

    const growth = large.dataReads / small.dataReads;
    // Linear is 4.0 for a 4x input; the LCS matrix was ~16.
    expect(growth).toBeLessThan(6);
    expect(large.dataReads).toBeLessThan(1000 * 8);
  });

  it("bounds the worst case with maxEditDistance", () => {
    // Two inputs with nothing in common are the case Myers is worst at: the edit distance is
    // the whole input, so the search is what costs. `maxEditDistance` is the ceiling on it.
    const before = Array.from({ length: 300 }, (_, i) => `left ${i}`).join("\n");
    const after = Array.from({ length: 300 }, (_, i) => `right ${i}`).join("\n");

    const capped = measure(<DiffViewer before={before} after={after} maxEditDistance={16} />);
    const uncapped = measure(<DiffViewer before={before} after={after} />);

    assertBudget("diff-viewer/disjoint-300-ceiling-16", capped);
    assertBudget("diff-viewer/disjoint-300-default-ceiling", uncapped);
    // The ceiling has to actually bite: an order of magnitude less work, and the same rows.
    expect(capped.dataReads * 10).toBeLessThan(uncapped.dataReads);
    expect(capped.elements).toBe(uncapped.elements);
  });

  it("renders a large diff without building a matrix for it", () => {
    // A 5 000-line pair is 25 million LCS cells: the previous implementation allocated that
    // before rendering a row. This is a tripwire, not a benchmark — the margin is ~1000x, so
    // it fails on an accidental reintroduction and not on a slow CI box.
    const counters = measure(<DiffViewer {...changedInTheMiddle(5000)} />);
    assertBudget("diff-viewer/lines-5000-one-change", counters);
    // 5 001 rows — 5 000 lines, one of them replaced — of one div and four spans each, plus
    // the container itself.
    expect(counters.elements).toBe(5001 * 5 + 1);
  }, 20_000);
});

/* ── The components PERF-002 names ─────────────────────────────────────────────────────────*/

describe("DataTable scale", () => {
  it("keeps the DOM independent of the dataset size when paginated", () => {
    const small = measure(
      <DataTable
        columns={personColumns}
        data={tracked(people(200))}
        enableColumnVisibility={false}
      />,
    );
    const large = measure(
      <DataTable
        columns={personColumns}
        data={tracked(people(2000))}
        enableColumnVisibility={false}
      />,
    );

    assertBudget("data-table/rows-200-paginated", small);
    assertBudget("data-table/rows-2000-paginated", large);
    // The contract worth locking: ten times the data, the same DOM.
    expect(large.elements).toBe(small.elements);
    // The rows are still all read — sorting and filtering are client-side — so the JS cost does
    // grow with the dataset even though the DOM does not. That is the ceiling consumers need to
    // know about: pass `manualPagination` for datasets beyond the recorded fixture.
    expect(large.dataReads).toBeGreaterThan(small.dataReads);
  });

  it("records what the always-constructed virtualizer costs", () => {
    // `useVirtualizer` is called unconditionally, so the disabled case pays for its setup.
    // Nobody owns "disable it" in this pass; the number is recorded so a future change can be
    // shown to help. jsdom never fires the observer, so this is construction cost only.
    const off = measure(
      <DataTable
        columns={personColumns}
        data={tracked(people(200))}
        enableColumnVisibility={false}
      />,
    );
    const on = measure(
      <DataTable
        columns={personColumns}
        data={tracked(people(200))}
        enableColumnVisibility={false}
        enableVirtualization
      />,
    );
    assertBudget("data-table/rows-200-virtualized", on);
    expect(off.observers).toBeLessThanOrEqual(on.observers);
  });
});

describe("TreeView scale", () => {
  it("does not render collapsed subtrees", () => {
    const collapsed = measure(<TreeView data={tracked(treeNodes(20, 5, false))} />);
    const expanded = measure(<TreeView data={tracked(treeNodes(20, 5, true))} />);

    assertBudget("tree-view/roots-20-children-5-collapsed", collapsed);
    assertBudget("tree-view/roots-20-children-5-expanded", expanded);
    // 20 rows against 120: closed branches cost nothing but their own row.
    expect(collapsed.elements * 3).toBeLessThan(expanded.elements);
  });

  it("grows linearly with the number of visible nodes", () => {
    const small = measure(<TreeView data={tracked(treeNodes(20, 5, true))} />);
    const large = measure(<TreeView data={tracked(treeNodes(40, 5, true))} />);
    expect(large.elements / small.elements).toBeLessThan(2.2);
  });
});

describe("OrgChart scale", () => {
  it("renders the whole tree eagerly, linearly in node count", () => {
    // OrgChart has no collapsed state: every node is in the DOM. 156 nodes here (1 + 5 + 25 +
    // 125), so the per-node element cost is the number that matters.
    const small = measure(<OrgChart data={orgTree(5, 2)} />);
    const large = measure(<OrgChart data={orgTree(5, 3)} />);

    assertBudget("org-chart/breadth-5-depth-2", small);
    assertBudget("org-chart/breadth-5-depth-3", large);
    // 31 nodes to 156 — five times the nodes, no worse than five times the elements.
    expect(large.elements / small.elements).toBeLessThan(6);
  });
});

describe("JSONTree scale", () => {
  it("keeps collapsed nodes out of the DOM", () => {
    const shallow = measure(<JSONTree value={jsonPayload(100)} />);
    const deep = measure(<JSONTree value={jsonPayload(100)} initialOpenDepth={3} />);

    assertBudget("json-tree/keys-100-default-depth", shallow);
    assertBudget("json-tree/keys-100-fully-open", deep);
    // A collapsed container costs its own summary row and nothing else, so the default-depth
    // DOM is bounded by the 100 top-level keys rather than the 300 nodes underneath them...
    expect(shallow.elements).toBeLessThan(100 * 12);
    // ...and expanding them adds elements in proportion to what became visible.
    expect(deep.elements - shallow.elements).toBeGreaterThan(100 * 4);
  });
});

describe("Feed scale", () => {
  it("renders every child eagerly", () => {
    const items = (count: number) =>
      Array.from({ length: count }, (_, index) => `item-${index}`).map((id) => (
        <div key={id}>{id}</div>
      ));
    const small = measure(<Feed aria-label="Activity">{items(100)}</Feed>);
    const large = measure(<Feed aria-label="Activity">{items(200)}</Feed>);

    assertBudget("feed/items-100", small);
    assertBudget("feed/items-200", large);
    expect(large.elements / small.elements).toBeLessThan(2.2);
  });
});

describe("ScheduleCalendar scale", () => {
  it("rescans the whole event list once per visible day", () => {
    // The month grid filters the sorted event list inside a per-day map, so each event's bounds
    // are read once per visible day: reads are (visible days) x (events), a ~40x constant on a
    // 42-cell month grid. Linear in the event count, but with a constant worth knowing before
    // handing it a year of events. Counted on the event objects rather than the array, because
    // the component copies the array to sort it.
    const small = measure(
      <ScheduleCalendar events={trackedItems(scheduleEvents(100))} defaultDate={scheduleFocus} />,
    );
    const large = measure(
      <ScheduleCalendar events={trackedItems(scheduleEvents(400))} defaultDate={scheduleFocus} />,
    );

    assertBudget("schedule-calendar/events-100-month", small);
    assertBudget("schedule-calendar/events-400-month", large);
    // Four times the events, no worse than five times the reads: linear, not quadratic.
    expect(large.dataReads / small.dataReads).toBeLessThan(5);
  });
});
