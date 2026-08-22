/**
 * Real-browser proof for the widened column-resize target (A11Y-008).
 *
 * The jsdom suite says it outright: "jsdom computes no geometry, so the widened hit area is not
 * assertable here". It asserts the value model instead. So the two claims the fix actually made
 * — a 12px pointer target, and a visual rule that stays 1px wide — were unverified. Both are
 * geometry, and one of them lives in a pseudo-element, which jsdom's `getComputedStyle` does
 * not report at all.
 */
import { createColumnHelper } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable } from "@/components/DataTable/data-table";

type Person = { name: string; email: string };

const columnHelper = createColumnHelper<Person>();
const columns = [
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("email", { header: "Email" }),
];
const data: Person[] = [
  { name: "Grace", email: "grace@qeet.io" },
  { name: "Ada", email: "ada@qeet.io" },
];

/** The pointer target the fix promised, in CSS pixels. */
const TARGET_WIDTH = 12;

describe("DataTable column resize separator — real geometry", () => {
  it("presents a 12px pointer target that hit-testing actually lands on", () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        enableColumnVisibility={false}
        enableColumnResizing
      />,
    );

    const handle = screen.getByRole("separator", { name: "Resize name column" });
    const rect = handle.getBoundingClientRect();
    expect(rect.width).toBeCloseTo(TARGET_WIDTH, 0);
    expect(rect.height).toBeGreaterThan(0);

    // The point that matters: the old 4px handle would not have been under the pointer here.
    // `elementFromPoint` is real hit-testing — jsdom has no implementation of it worth using.
    const hit = document.elementFromPoint(
      rect.right - TARGET_WIDTH / 2,
      rect.top + rect.height / 2,
    );
    expect(hit).toBe(handle);
  });

  it("keeps the visible rule 1px wide even though the target is wider", () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        enableColumnVisibility={false}
        enableColumnResizing
      />,
    );

    const handle = screen.getByRole("separator", { name: "Resize name column" });
    // The whole reason the rule is a pseudo-element: widening the focusable box must not
    // thicken the line. jsdom reports nothing for `::after`, so this has never been checked.
    expect(getComputedStyle(handle, "::after").width).toBe("1px");
    expect(getComputedStyle(handle).borderRightWidth).toBe("0px");
  });
});
