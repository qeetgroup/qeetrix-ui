import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Listbox } from "@/components/selection/listbox";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const OPTIONS = [
  { label: "Red", value: "r" },
  { label: "Green", value: "g" },
  { label: "Blue", value: "b" },
];

describe("Listbox", () => {
  it("renders options with listbox semantics", () => {
    render(<Listbox options={OPTIONS} aria-label="Colour" />);
    expect(screen.getByRole("listbox", { name: "Colour" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("selects an option on click (single-select)", () => {
    const onValueChange = vi.fn();
    render(<Listbox options={OPTIONS} aria-label="Colour" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("option", { name: "Green" }));
    expect(onValueChange).toHaveBeenCalledWith("g");
    expect(screen.getByRole("option", { name: "Green" })).toHaveAttribute("aria-selected", "true");
  });

  it("supports keyboard selection", () => {
    const onValueChange = vi.fn();
    render(<Listbox options={OPTIONS} aria-label="Colour" onValueChange={onValueChange} />);
    const lb = screen.getByRole("listbox");
    fireEvent.keyDown(lb, { key: "ArrowDown" });
    fireEvent.keyDown(lb, { key: "Enter" });
    expect(onValueChange).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Listbox options={OPTIONS} aria-label="Colour" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
