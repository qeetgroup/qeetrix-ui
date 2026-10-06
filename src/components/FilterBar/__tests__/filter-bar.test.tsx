import { act, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  type ActiveFilter,
  FilterBar,
  type FilterBarView,
  type FilterField,
} from "@/components/FilterBar/filter-bar";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const FIELDS: FilterField[] = [
  { key: "status", label: "Status", options: [{ label: "Active", value: "active" }] },
  { key: "name", label: "Name" },
];

const VIEWS: FilterBarView[] = [
  {
    id: "active",
    label: "Active members",
    filters: [{ field: "status", operator: "is", value: "active" }],
  },
  {
    id: "ada",
    label: "Ada",
    filters: [{ field: "name", operator: "contains", value: "ada" }],
    search: "lovelace",
  },
];

/** A parent that owns the filters, so removals really re-render the bar. */
function Controlled({ initial }: { initial: ActiveFilter[] }) {
  const [value, setValue] = React.useState(initial);
  return <FilterBar fields={FIELDS} value={value} onValueChange={setValue} />;
}

describe("FilterBar", () => {
  it("renders active filters as chips with readable labels", () => {
    const filters: ActiveFilter[] = [{ field: "status", operator: "is", value: "active" }];
    render(<FilterBar fields={FIELDS} value={filters} onValueChange={() => {}} />);
    expect(screen.getByText("Status is Active")).toBeInTheDocument();
  });

  it("removes a filter via its chip, naming the filter it removes", () => {
    const onValueChange = vi.fn();
    const filters: ActiveFilter[] = [{ field: "name", operator: "contains", value: "ada" }];
    render(<FilterBar fields={FIELDS} value={filters} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove filter Name contains ada" }));
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

describe("FilterBar active filters", () => {
  it("is a named group that announces the applied count", () => {
    render(
      <FilterBar
        fields={FIELDS}
        value={[{ field: "status", operator: "is", value: "active" }]}
        onValueChange={() => {}}
      />,
    );
    expect(screen.getByRole("group", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByText("1 filter applied")).toHaveAttribute("aria-live", "polite");
  });

  it("uses the Qeet selected surface for applied filters", () => {
    const { container } = render(
      <FilterBar
        fields={FIELDS}
        value={[{ field: "status", operator: "is", value: "active" }]}
        onValueChange={() => {}}
      />,
    );
    const chip = container.querySelector('[data-slot="filter-bar-chip"]');
    expect(chip).toHaveClass("bg-brand-subtle", "border-border-brand");
    expect(chip).not.toHaveClass("bg-primary");
  });

  it("moves focus to the next chip after a removal", () => {
    render(
      <Controlled
        initial={[
          { field: "status", operator: "is", value: "active" },
          { field: "name", operator: "contains", value: "ada" },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove filter Status is Active" }));
    expect(screen.getByRole("button", { name: "Remove filter Name contains ada" })).toHaveFocus();
  });

  it("moves focus to Add filter when the last chip goes", () => {
    render(<Controlled initial={[{ field: "name", operator: "contains", value: "ada" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove filter Name contains ada" }));
    expect(screen.getByRole("button", { name: "Add filter" })).toHaveFocus();
  });

  it("reopens a filter's builder from its chip, titled and labelled", () => {
    render(
      <FilterBar
        fields={FIELDS}
        value={[{ field: "name", operator: "contains", value: "ada" }]}
        onValueChange={() => {}}
      />,
    );
    const chip = screen.getByRole("button", { name: "Name contains ada" });
    expect(chip).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(chip);
    expect(screen.getByRole("dialog", { name: "Edit filter" })).toBeInTheDocument();
    expect(screen.getByLabelText("Field")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter value")).toHaveValue("ada");
  });

  it("commits an edited filter in place", () => {
    const onValueChange = vi.fn();
    render(
      <FilterBar
        fields={FIELDS}
        value={[
          { field: "status", operator: "is", value: "active" },
          { field: "name", operator: "contains", value: "ada" },
        ]}
        onValueChange={onValueChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Name contains ada" }));
    fireEvent.change(screen.getByLabelText("Filter value"), { target: { value: "grace" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onValueChange).toHaveBeenCalledWith([
      { field: "status", operator: "is", value: "active" },
      { field: "name", operator: "contains", value: "grace" },
    ]);
  });

  it("opens an add-filter dialog with labelled fields", () => {
    render(<FilterBar fields={FIELDS} value={[]} onValueChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Add filter" }));
    expect(screen.getByRole("dialog", { name: "Add filter" })).toBeInTheDocument();
    expect(screen.getByLabelText("Field")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });
});

describe("FilterBar search", () => {
  it("shows a labelled search field when searching is wired", () => {
    const onSearchChange = vi.fn();
    render(
      <FilterBar
        fields={FIELDS}
        value={[]}
        onValueChange={() => {}}
        onSearchChange={onSearchChange}
      />,
    );
    const search = screen.getByRole("searchbox", { name: "Search" });
    fireEvent.change(search, { target: { value: "ada" } });
    expect(onSearchChange).toHaveBeenCalledWith("ada");
    expect(search).toHaveValue("ada");
  });

  it("stays authoritative when search is controlled", () => {
    render(<FilterBar fields={FIELDS} value={[]} onValueChange={() => {}} search="" />);
    const search = screen.getByRole("searchbox", { name: "Search" });
    fireEvent.change(search, { target: { value: "ada" } });
    expect(search).toHaveValue("");
  });

  it("has no search field unless asked for", () => {
    render(<FilterBar fields={FIELDS} value={[]} onValueChange={() => {}} />);
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});

describe("FilterBar saved views", () => {
  it("applies a view's filters and search", async () => {
    const onValueChange = vi.fn();
    const onSearchChange = vi.fn();
    const onViewChange = vi.fn();
    render(
      <FilterBar
        fields={FIELDS}
        value={[]}
        onValueChange={onValueChange}
        onSearchChange={onSearchChange}
        views={VIEWS}
        onViewChange={onViewChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Views" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitemradio", { name: "Ada" }));
    });
    expect(onValueChange).toHaveBeenCalledWith(VIEWS[1].filters);
    expect(onSearchChange).toHaveBeenCalledWith("lovelace");
    expect(onViewChange).toHaveBeenCalledWith(VIEWS[1]);
  });

  it("names the active view and marks it modified when the filters drift", () => {
    const { rerender } = render(
      <FilterBar
        fields={FIELDS}
        value={VIEWS[0].filters}
        onValueChange={() => {}}
        views={VIEWS}
        viewId="active"
      />,
    );
    expect(screen.getByRole("button", { name: "Active members" })).toBeInTheDocument();
    rerender(
      <FilterBar
        fields={FIELDS}
        value={[]}
        onValueChange={() => {}}
        views={VIEWS}
        viewId="active"
      />,
    );
    expect(screen.getByRole("button", { name: "Active members, modified" })).toBeInTheDocument();
  });

  it("asks the caller to save the current view", () => {
    const onSaveView = vi.fn();
    const filters = [{ field: "name", operator: "is", value: "x" }];
    render(
      <FilterBar
        fields={FIELDS}
        value={filters}
        onValueChange={() => {}}
        views={VIEWS}
        onSaveView={onSaveView}
        defaultSearch="q"
        onSearchChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Views" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Save current view…" }));
    expect(onSaveView).toHaveBeenCalledWith({ filters, search: "q" });
  });
});

describe("FilterBar layout", () => {
  it("renders trailing actions", () => {
    render(
      <FilterBar
        fields={FIELDS}
        value={[]}
        onValueChange={() => {}}
        actions={<button type="button">Columns</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Columns" })).toBeInTheDocument();
  });

  it("disables every control", () => {
    render(
      <FilterBar
        fields={FIELDS}
        value={[{ field: "name", operator: "is", value: "x" }]}
        onValueChange={() => {}}
        onSearchChange={() => {}}
        disabled
      />,
    );
    expect(screen.getByRole("button", { name: "Add filter" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove filter Name is x" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeDisabled();
    expect(screen.getByRole("searchbox")).toBeDisabled();
  });

  it("collapses into an overflow list on request", () => {
    const { container } = render(
      <FilterBar
        fields={FIELDS}
        value={[{ field: "name", operator: "is", value: "x" }]}
        onValueChange={() => {}}
        overflow="collapse"
      />,
    );
    expect(container.querySelector('[data-slot="filter-bar"]')).toHaveAttribute(
      "data-overflow",
      "collapse",
    );
    expect(container.querySelector('[data-slot="overflow-list"]')).not.toBeNull();
    expect(screen.getByText("Name is x")).toBeInTheDocument();
  });

  it("has no axe violations with search, views, chips and actions", async () => {
    const { container } = render(
      <FilterBar
        fields={FIELDS}
        value={VIEWS[0].filters}
        onValueChange={() => {}}
        onSearchChange={() => {}}
        views={VIEWS}
        viewId="active"
        actions={<button type="button">Columns</button>}
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
