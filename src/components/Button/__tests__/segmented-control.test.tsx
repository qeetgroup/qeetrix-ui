import { fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { SegmentedControl, SegmentedControlItem } from "@/components/Button/segmented-control";
import { DirectionProvider } from "@/providers/direction-provider";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("SegmentedControl", () => {
  it("renders a radiogroup and selects on click", () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl defaultValue="list" onValueChange={onValueChange}>
        <SegmentedControlItem value="list">List</SegmentedControlItem>
        <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Grid" }));
    expect(onValueChange).toHaveBeenCalledWith("grid");
  });

  it("marks the active segment with aria-checked", () => {
    render(
      <SegmentedControl defaultValue="list">
        <SegmentedControlItem value="list">List</SegmentedControlItem>
        <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(screen.getByRole("radio", { name: "List" })).toBeChecked();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <SegmentedControl defaultValue="list" aria-label="View">
        <SegmentedControlItem value="list">List</SegmentedControlItem>
        <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/*
 * jsdom lays nothing out, so every offset is 0. Give each segment a deterministic geometry —
 * 60px wide, 28px tall, laid end to end (or stacked) in DOM order — so the indicator's
 * placement is observable.
 */
function stubSegmentGeometry() {
  const index = (el: HTMLElement) =>
    Array.from(
      el.parentElement?.querySelectorAll('[data-slot="segmented-control-item"]') ?? [],
    ).indexOf(el);
  const isItem = (el: HTMLElement) => el.dataset.slot === "segmented-control-item";
  const vertical = (el: HTMLElement) =>
    el.closest('[data-slot="segmented-control"]')?.getAttribute("data-orientation") === "vertical";
  const spies = [
    vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (
      this: HTMLElement,
    ) {
      return isItem(this) && !vertical(this) ? 2 + index(this) * 60 : 2;
    }),
    vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(function (
      this: HTMLElement,
    ) {
      return isItem(this) && vertical(this) ? 2 + index(this) * 28 : 2;
    }),
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(() => 60),
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(() => 28),
  ];
  return () => {
    for (const spy of spies) spy.mockRestore();
  };
}

const indicator = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="segmented-control-indicator"]');

function Three(props: Partial<React.ComponentProps<typeof SegmentedControl>>) {
  return (
    <SegmentedControl aria-label="Range" {...props}>
      <SegmentedControlItem value="day">Day</SegmentedControlItem>
      <SegmentedControlItem value="week">Week</SegmentedControlItem>
      <SegmentedControlItem value="month">Month</SegmentedControlItem>
    </SegmentedControl>
  );
}

describe("SegmentedControl indicator", () => {
  it("follows the selection instead of staying on the first one", () => {
    const restore = stubSegmentGeometry();
    try {
      const { container } = render(<Three defaultValue="day" />);
      expect(indicator(container)?.style.transform).toBe("translate(2px, 2px)");
      fireEvent.click(screen.getByRole("radio", { name: "Month" }));
      expect(indicator(container)?.style.transform).toBe("translate(122px, 2px)");
      expect(indicator(container)?.style.width).toBe("60px");
    } finally {
      restore();
    }
  });

  it("follows a controlled value", () => {
    const restore = stubSegmentGeometry();
    try {
      const { container, rerender } = render(<Three value="day" />);
      rerender(<Three value="week" />);
      expect(indicator(container)?.style.transform).toBe("translate(62px, 2px)");
    } finally {
      restore();
    }
  });

  it("stacks down the block axis when vertical", () => {
    const restore = stubSegmentGeometry();
    try {
      const { container } = render(<Three orientation="vertical" defaultValue="month" />);
      expect(indicator(container)?.style.transform).toBe("translate(2px, 58px)");
    } finally {
      restore();
    }
  });

  it("is hidden when nothing is selected", () => {
    const { container } = render(<Three />);
    expect(indicator(container)?.style.opacity).toBe("0");
  });

  it("uses the Qeet selected vocabulary", () => {
    const { container } = render(<Three defaultValue="day" />);
    expect(indicator(container)).toHaveClass("bg-brand-subtle", "border-border-brand");
  });
});

describe("SegmentedControl keyboard", () => {
  it("moves and selects with the arrow keys along its axis, wrapping at the end", () => {
    const onValueChange = vi.fn();
    render(<Three defaultValue="month" onValueChange={onValueChange} />);
    const month = screen.getByRole("radio", { name: "Month" });
    month.focus();
    fireEvent.keyDown(month, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "Day" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Day" })).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith("day");
  });

  it("mirrors the inline keys under RTL", () => {
    render(
      <DirectionProvider direction="rtl">
        <Three defaultValue="week" />
      </DirectionProvider>,
    );
    const week = screen.getByRole("radio", { name: "Week" });
    week.focus();
    // In RTL the next segment is to the left.
    fireEvent.keyDown(week, { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: "Month" })).toBeChecked();
    fireEvent.keyDown(screen.getByRole("radio", { name: "Month" }), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "Week" })).toBeChecked();
  });

  it("uses Up / Down when vertical", () => {
    render(<Three orientation="vertical" defaultValue="day" />);
    const day = screen.getByRole("radio", { name: "Day" });
    day.focus();
    fireEvent.keyDown(day, { key: "ArrowDown" });
    expect(screen.getByRole("radio", { name: "Week" })).toBeChecked();
  });

  it("skips a disabled segment", () => {
    render(
      <SegmentedControl aria-label="Mode" defaultValue="a">
        <SegmentedControlItem value="a">A</SegmentedControlItem>
        <SegmentedControlItem value="b" disabled>
          B
        </SegmentedControlItem>
        <SegmentedControlItem value="c">C</SegmentedControlItem>
      </SegmentedControl>,
    );
    const a = screen.getByRole("radio", { name: "A" });
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "C" })).toBeChecked();
  });

  it("makes the selected segment the only tab stop", () => {
    render(<Three defaultValue="week" />);
    expect(screen.getByRole("radio", { name: "Week" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Day" })).toHaveAttribute("tabindex", "-1");
  });

  it("stays reachable when nothing is selected yet", () => {
    render(<Three />);
    // No forced -1: the native radio group makes the first segment the stop.
    for (const name of ["Day", "Week", "Month"]) {
      expect(screen.getByRole("radio", { name })).not.toHaveAttribute("tabindex");
    }
  });

  it("runs a consumer's onKeyDown first and respects preventDefault", () => {
    const onKeyDown = vi.fn((e: React.KeyboardEvent) => e.preventDefault());
    render(<Three defaultValue="day" onKeyDown={onKeyDown} />);
    const day = screen.getByRole("radio", { name: "Day" });
    fireEvent.keyDown(day, { key: "ArrowRight" });
    expect(onKeyDown).toHaveBeenCalled();
    expect(day).toBeChecked();
  });
});

describe("SegmentedControl forms and state", () => {
  it("submits the selected value under its name", () => {
    render(
      <form aria-label="prefs">
        <Three name="range" defaultValue="week" />
      </form>,
    );
    const data = new FormData(screen.getByRole("form", { name: "prefs" }) as HTMLFormElement);
    expect(data.get("range")).toBe("week");
  });

  it("marks a disabled control and fades it once, at the track", () => {
    render(<Three defaultValue="day" disabled />);
    const group = screen.getByRole("radiogroup", { name: "Range" });
    expect(group).toHaveAttribute("aria-disabled", "true");
    expect(group.className).toContain("aria-disabled:opacity-disabled");
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    // Segments do not fade again on top of the track.
    const item = screen.getByRole("radio", { name: "Day" }).closest("label");
    expect(item).not.toHaveClass("opacity-disabled");
  });

  it("draws focus on the segment, since the radio is visually hidden", () => {
    render(<Three defaultValue="day" />);
    const item = screen.getByRole("radio", { name: "Day" }).closest("label");
    expect(item?.className).toContain("has-[:focus-visible]:focus-ring");
    expect(item?.className).not.toContain("ring-ring/disabled");
  });

  it("has no axe violations across orientations and with nothing selected", async () => {
    const { container } = render(
      <div>
        <Three orientation="vertical" defaultValue="day" />
        <SegmentedControl aria-label="Empty">
          <SegmentedControlItem value="x">X</SegmentedControlItem>
          <SegmentedControlItem value="y">Y</SegmentedControlItem>
        </SegmentedControl>
      </div>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
