import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { type ActiveFilter, FilterBar, type FilterField } from "@/components/layout/filter-bar";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const FIELDS: FilterField[] = [
  { key: "status", label: "Status", options: [{ label: "Active", value: "active" }] },
  { key: "name", label: "Name" },
];

describe("FilterBar", () => {
  it("renders active filters as chips with readable labels", () => {
    const filters: ActiveFilter[] = [{ field: "status", operator: "is", value: "active" }];
    render(<FilterBar fields={FIELDS} value={filters} onValueChange={() => {}} />);
    expect(screen.getByText("Status is Active")).toBeInTheDocument();
  });

  it("removes a filter via its chip", () => {
    const onValueChange = vi.fn();
    const filters: ActiveFilter[] = [{ field: "name", operator: "contains", value: "ada" }];
    render(<FilterBar fields={FIELDS} value={filters} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onValueChange).toHaveBeenCalledWith([]);
  });

  it("clears all filters", () => {
    const onValueChange = vi.fn();
    render(
      <FilterBar
        fields={FIELDS}
        value={[{ field: "name", operator: "is", value: "x" }]}
        onValueChange={onValueChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onValueChange).toHaveBeenCalledWith([]);
  });

  it("has no axe violations", async () => {
    const { container } = render(<FilterBar fields={FIELDS} value={[]} onValueChange={() => {}} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
