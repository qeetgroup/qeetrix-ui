import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { SegmentedControl, SegmentedControlItem } from "@/components/Button/segmented-control";

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
