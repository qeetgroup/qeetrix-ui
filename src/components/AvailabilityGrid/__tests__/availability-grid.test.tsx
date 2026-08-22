import { act, fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { AvailabilityGrid } from "@/components/AvailabilityGrid/availability-grid";
import { DirectionProvider } from "@/providers/direction-provider";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const DAYS = ["Mon", "Tue"];
const TIMES = ["09:00", "09:30"];

const cell = (name: string) => screen.getByRole("gridcell", { name });
const cells = () => screen.getAllByRole("gridcell");

describe("AvailabilityGrid", () => {
  it("renders a slot per day × time", () => {
    render(<AvailabilityGrid days={DAYS} times={TIMES} value={[]} onValueChange={() => {}} />);
    expect(cells()).toHaveLength(4);
  });

  it("toggles a slot", () => {
    const onValueChange = vi.fn();
    render(<AvailabilityGrid days={DAYS} times={TIMES} value={[]} onValueChange={onValueChange} />);
    fireEvent.click(cell("Mon 09:00"));
    expect(onValueChange).toHaveBeenCalledWith(["0:0"]);
  });

  it("does not toggle unavailable slots", () => {
    const onValueChange = vi.fn();
    render(
      <AvailabilityGrid
        days={DAYS}
        times={TIMES}
        value={[]}
        unavailable={["1:1"]}
        onValueChange={onValueChange}
      />,
    );
    const blocked = cell("Tue 09:30");
    expect(blocked).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(blocked);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("keeps unavailable slots focusable so arrow navigation does not skip them", () => {
    render(
      <AvailabilityGrid
        days={DAYS}
        times={TIMES}
        value={[]}
        unavailable={["1:1"]}
        onValueChange={() => {}}
      />,
    );
    // `disabled` would remove the cell from the focus order entirely, leaving a
    // hole in the grid a keyboard user cannot perceive.
    expect(cell("Tue 09:30")).not.toBeDisabled();
    cell("Tue 09:30").focus();
    expect(cell("Tue 09:30")).toHaveFocus();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AvailabilityGrid days={DAYS} times={TIMES} value={[]} onValueChange={() => {}} />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("AvailabilityGrid grid semantics", () => {
  const WEEK = ["Mon", "Tue", "Wed"];
  const SLOTS = ["09:00", "09:30", "10:00"];

  function Week(props: Partial<React.ComponentProps<typeof AvailabilityGrid>> = {}) {
    return (
      <AvailabilityGrid days={WEEK} times={SLOTS} value={[]} onValueChange={() => {}} {...props} />
    );
  }

  it("exposes a named grid with rows and header cells", () => {
    render(<Week />);
    const grid = screen.getByRole("grid", { name: "Availability" });
    expect(grid).toHaveAttribute("aria-multiselectable", "true");
    // One header row plus one row per time slot.
    expect(screen.getAllByRole("row")).toHaveLength(SLOTS.length + 1);
    // The day headers plus the leading time column.
    expect(screen.getAllByRole("columnheader")).toHaveLength(WEEK.length + 1);
    expect(screen.getAllByRole("rowheader").map((h) => h.textContent)).toEqual(SLOTS);
  });

  it("names the grid from aria-label or aria-labelledby", () => {
    const { unmount } = render(<Week aria-label="Shift cover" />);
    expect(screen.getByRole("grid", { name: "Shift cover" })).toBeInTheDocument();
    unmount();

    render(
      <>
        <h2 id="cover-heading">Weekend cover</h2>
        <Week aria-labelledby="cover-heading" />
      </>,
    );
    expect(screen.getByRole("grid", { name: "Weekend cover" })).toBeInTheDocument();
  });

  it("reports the row and column counts including the headers", () => {
    render(<Week />);
    const grid = screen.getByRole("grid");
    expect(grid).toHaveAttribute("aria-rowcount", String(SLOTS.length + 1));
    expect(grid).toHaveAttribute("aria-colcount", String(WEEK.length + 1));
  });

  it("names every slot with both of its axes", () => {
    render(<Week />);
    for (const day of WEEK) {
      for (const time of SLOTS) {
        expect(screen.getByRole("gridcell", { name: `${day} ${time}` })).toBeInTheDocument();
      }
    }
  });

  it("takes exactly one tab stop no matter how many slots there are", () => {
    render(<Week />);
    const tabbable = cells().filter((c) => c.getAttribute("tabindex") === "0");
    // Nine slots, one tab stop. Before this the widget was nine tab stops (and a
    // real week of half-hour slots is well over a hundred).
    expect(cells()).toHaveLength(9);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAccessibleName("Mon 09:00");
  });

  it("moves focus and the tab stop with the arrow keys", () => {
    render(<Week />);
    const start = cell("Mon 09:00");
    start.focus();

    fireEvent.keyDown(start, { key: "ArrowRight" });
    expect(cell("Tue 09:00")).toHaveFocus();
    expect(cell("Tue 09:00")).toHaveAttribute("tabindex", "0");
    expect(cell("Mon 09:00")).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(cell("Tue 09:00"), { key: "ArrowDown" });
    expect(cell("Tue 09:30")).toHaveFocus();

    fireEvent.keyDown(cell("Tue 09:30"), { key: "ArrowLeft" });
    expect(cell("Mon 09:30")).toHaveFocus();

    fireEvent.keyDown(cell("Mon 09:30"), { key: "ArrowUp" });
    expect(cell("Mon 09:00")).toHaveFocus();
  });

  it("clamps at the edges instead of wrapping to another row", () => {
    render(<Week />);
    const corner = cell("Mon 09:00");
    corner.focus();
    fireEvent.keyDown(corner, { key: "ArrowLeft" });
    expect(cell("Mon 09:00")).toHaveFocus();
    fireEvent.keyDown(cell("Mon 09:00"), { key: "ArrowUp" });
    expect(cell("Mon 09:00")).toHaveFocus();
  });

  it("supports Home/End within a row and Ctrl+Home/End across the grid", () => {
    render(<Week />);
    const middle = cell("Tue 09:30");
    middle.focus();

    fireEvent.keyDown(middle, { key: "End" });
    expect(cell("Wed 09:30")).toHaveFocus();
    fireEvent.keyDown(cell("Wed 09:30"), { key: "Home" });
    expect(cell("Mon 09:30")).toHaveFocus();

    fireEvent.keyDown(cell("Mon 09:30"), { key: "End", ctrlKey: true });
    expect(cell("Wed 10:00")).toHaveFocus();
    fireEvent.keyDown(cell("Wed 10:00"), { key: "Home", ctrlKey: true });
    expect(cell("Mon 09:00")).toHaveFocus();
  });

  it("supports PageUp/PageDown within a column", () => {
    render(<Week />);
    const middle = cell("Tue 09:30");
    middle.focus();
    fireEvent.keyDown(middle, { key: "PageDown" });
    expect(cell("Tue 10:00")).toHaveFocus();
    fireEvent.keyDown(cell("Tue 10:00"), { key: "PageUp" });
    expect(cell("Tue 09:00")).toHaveFocus();
  });

  it("toggles the focused slot with Space and Enter", () => {
    const onValueChange = vi.fn();
    render(<Week onValueChange={onValueChange} />);
    const target = cell("Tue 09:30");
    target.focus();

    fireEvent.keyDown(target, { key: " " });
    expect(onValueChange).toHaveBeenLastCalledWith(["1:1"]);

    fireEvent.keyDown(target, { key: "Enter" });
    expect(onValueChange).toHaveBeenLastCalledWith(["1:1"]);
    expect(onValueChange).toHaveBeenCalledTimes(2);
  });

  it("does not toggle an unavailable slot from the keyboard", () => {
    const onValueChange = vi.fn();
    render(<Week unavailable={["1:1"]} onValueChange={onValueChange} />);
    const blocked = cell("Tue 09:30");
    blocked.focus();
    fireEvent.keyDown(blocked, { key: " " });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("expresses selection with aria-selected", () => {
    render(<Week value={["1:1"]} />);
    expect(cell("Tue 09:30")).toHaveAttribute("aria-selected", "true");
    expect(cell("Mon 09:00")).toHaveAttribute("aria-selected", "false");
  });

  it("keeps a tab stop when the grid shrinks under the roving position", () => {
    const { rerender } = render(<Week />);
    const last = cell("Wed 10:00");
    act(() => last.focus());
    expect(last).toHaveAttribute("tabindex", "0");

    rerender(
      <AvailabilityGrid days={["Mon"]} times={["09:00"]} value={[]} onValueChange={() => {}} />,
    );
    const remaining = cells();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveAttribute("tabindex", "0");
  });

  it("survives an empty grid", () => {
    render(<AvailabilityGrid days={[]} times={[]} value={[]} onValueChange={() => {}} />);
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.queryAllByRole("gridcell")).toHaveLength(0);
  });

  it("has no axe violations with blocked and selected slots", async () => {
    const { container } = render(<Week value={["0:0"]} unavailable={["2:2"]} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/*
 * ── Direction ───────────────────────────────────────────────────────────────────────────────
 *
 * A CSS grid lays its columns out along the inline axis, so under `dir="rtl"` the first day
 * is on the right and the arrow keys have to mirror with it. jsdom does not lay anything out,
 * so what is asserted is the key→cell mapping — which is the part that was wrong.
 */
describe("AvailabilityGrid direction", () => {
  const DAYS3 = ["Mon", "Tue", "Wed"];
  const TIMES2 = ["09:00", "09:30"];

  function Grid({ direction }: { direction?: "ltr" | "rtl" }) {
    return (
      <DirectionProvider direction={direction}>
        <AvailabilityGrid days={DAYS3} times={TIMES2} value={[]} onValueChange={() => {}} />
      </DirectionProvider>
    );
  }

  it("reports the resolved direction on the grid", () => {
    render(<Grid direction="rtl" />);
    expect(screen.getByRole("grid")).toHaveAttribute("data-direction", "rtl");
  });

  it("moves toward the next day on ArrowLeft in rtl", () => {
    render(<Grid direction="rtl" />);
    const start = cell("Mon 09:00");
    act(() => start.focus());

    fireEvent.keyDown(start, { key: "ArrowLeft" });
    expect(cell("Tue 09:00")).toHaveFocus();

    fireEvent.keyDown(cell("Tue 09:00"), { key: "ArrowLeft" });
    expect(cell("Wed 09:00")).toHaveFocus();

    fireEvent.keyDown(cell("Wed 09:00"), { key: "ArrowRight" });
    expect(cell("Tue 09:00")).toHaveFocus();
  });

  it("keeps ArrowRight advancing in ltr", () => {
    render(<Grid direction="ltr" />);
    const start = cell("Mon 09:00");
    act(() => start.focus());
    fireEvent.keyDown(start, { key: "ArrowRight" });
    expect(cell("Tue 09:00")).toHaveFocus();
  });

  it("clamps at the visual edge in rtl, rather than wrapping", () => {
    render(<Grid direction="rtl" />);
    const first = cell("Mon 09:00");
    act(() => first.focus());
    // Mon is the inline-start column, so the inline-start key has nowhere to go.
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(first).toHaveFocus();
  });

  it("does not mirror the row axis or the row/grid extremes", () => {
    render(<Grid direction="rtl" />);
    const start = cell("Mon 09:00");
    act(() => start.focus());

    fireEvent.keyDown(start, { key: "ArrowDown" });
    expect(cell("Mon 09:30")).toHaveFocus();

    // End addresses the last *column index*, which is the same cell in either direction —
    // the reading order changes, not the data.
    fireEvent.keyDown(cell("Mon 09:30"), { key: "End" });
    expect(cell("Wed 09:30")).toHaveFocus();

    fireEvent.keyDown(cell("Wed 09:30"), { key: "Home" });
    expect(cell("Mon 09:30")).toHaveFocus();
  });
});
