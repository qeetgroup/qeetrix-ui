// `createColumnHelper` is re-exported from the package root (`@qeetrix/ui`);
// it originates from @tanstack/react-table, imported directly here.
import { createColumnHelper, type PaginationState, type SortingState } from "@tanstack/react-table";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { DataTable } from "@/components/data-display/data-table";
import { DensityProvider } from "@/providers/density-provider";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

type Person = { name: string; email: string; role: string };

const columnHelper = createColumnHelper<Person>();
const columns = [
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("email", { header: "Email" }),
  columnHelper.accessor("role", { header: "Role" }),
];
const facetedColumns = [
  columnHelper.accessor("role", {
    header: "Role",
    filterFn: (row, columnId, filterValue: string[]) =>
      filterValue.includes(row.getValue(columnId)),
  }),
];

const data: Person[] = [
  { name: "Grace", email: "grace@qeet.io", role: "Admin" },
  { name: "Ada", email: "ada@qeet.io", role: "Member" },
  { name: "Linus", email: "linus@qeet.io", role: "Member" },
];

describe("DataTable", () => {
  it("renders a table with a columnheader per column", () => {
    render(<DataTable columns={columns} data={data} enableColumnVisibility={false} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /email/i })).toBeInTheDocument();
  });

  it("renders a row per datum with cell values", () => {
    render(<DataTable columns={columns} data={data} enableColumnVisibility={false} />);
    // header row + 3 body rows
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(screen.getByRole("cell", { name: "ada@qeet.io" })).toBeInTheDocument();
    expect(screen.getByText("Linus")).toBeInTheDocument();
  });

  it("sorts rows when a sortable header is activated", () => {
    render(<DataTable columns={columns} data={data} enableColumnVisibility={false} />);
    // Default (unsorted) order keeps the data order: Grace first.
    expect(within(screen.getAllByRole("row")[1]).getByText("Grace")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /name/i }));
    // Ascending by name → Ada first.
    expect(within(screen.getAllByRole("row")[1]).getByText("Ada")).toBeInTheDocument();
  });

  it("announces the current sort direction on sortable headers", () => {
    render(<DataTable columns={columns} data={data} enableColumnVisibility={false} />);
    const nameHeader = screen.getByRole("columnheader", { name: /name/i });

    expect(nameHeader).toHaveAttribute("aria-sort", "none");
    fireEvent.click(within(nameHeader).getByRole("button"));
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(within(nameHeader).getByRole("button"));
    expect(nameHeader).toHaveAttribute("aria-sort", "descending");
  });

  it("exposes faceted filter options as toggle buttons", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={facetedColumns}
        data={data}
        enableSearch={false}
        enableColumnVisibility={false}
        facetedFilters={[
          {
            columnId: "role",
            title: "Role",
            options: [
              { label: "Admin", value: "Admin" },
              { label: "Member", value: "Member" },
            ],
          },
        ]}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: /^role$/i })[0]);
    const adminOption = await screen.findByRole("button", { name: /admin/i });
    expect(adminOption).toHaveAttribute("aria-pressed", "false");

    await user.click(adminOption);
    expect(adminOption).toHaveAttribute("aria-pressed", "true");
  });

  it("gives each column options menu a contextual name", () => {
    render(
      <DataTable columns={columns} data={data} enableColumnVisibility={false} enablePinning />,
    );

    expect(screen.getByRole("button", { name: /column options for name/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /column options for email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /column options for role/i })).toBeInTheDocument();
  });

  it("filters rows via the toolbar search box", () => {
    render(<DataTable columns={columns} data={data} enableSearch />);
    fireEvent.change(screen.getByRole("textbox", { name: /search/i }), {
      target: { value: "ada" },
    });
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.queryByText("Grace")).not.toBeInTheDocument();
    expect(screen.queryByText("Linus")).not.toBeInTheDocument();
  });

  it("delegates controlled sorting without reordering manual data", async () => {
    const user = userEvent.setup();

    function ManualSortingTable() {
      const [sorting, setSorting] = React.useState<SortingState>([]);

      return (
        <DataTable
          columns={columns}
          data={data}
          enableColumnVisibility={false}
          manualSorting
          state={{ sorting }}
          onSortingChange={setSorting}
        />
      );
    }

    render(<ManualSortingTable />);
    await user.click(screen.getByRole("button", { name: /name/i }));

    expect(screen.getByRole("columnheader", { name: /name/i })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(within(screen.getAllByRole("row")[1]).getByText("Grace")).toBeInTheDocument();
  });

  it("delegates controlled global filtering to the consumer", async () => {
    const user = userEvent.setup();

    function ManualFilteringTable() {
      const [globalFilter, setGlobalFilter] = React.useState("ada");
      const filteredData = data.filter((person) =>
        person.name.toLowerCase().includes(globalFilter.toLowerCase()),
      );

      return (
        <DataTable
          columns={columns}
          data={filteredData}
          enableColumnVisibility={false}
          manualFiltering
          state={{ globalFilter }}
          onGlobalFilterChange={setGlobalFilter}
        />
      );
    }

    render(<ManualFilteringTable />);
    const search = screen.getByRole("textbox", { name: /search/i });

    expect(search).toHaveValue("ada");
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.queryByText("Grace")).not.toBeInTheDocument();

    await user.clear(search);
    expect(screen.getByText("Grace")).toBeInTheDocument();
  });

  it("delegates controlled manual pagination with a server row count", async () => {
    const user = userEvent.setup();

    function ManualPaginationTable() {
      const [pagination, setPagination] = React.useState<PaginationState>({
        pageIndex: 0,
        pageSize: 1,
      });
      const pageData = data.slice(pagination.pageIndex, pagination.pageIndex + 1);

      return (
        <DataTable
          columns={columns}
          data={pageData}
          enableColumnVisibility={false}
          pageSize={1}
          manualPagination
          rowCount={data.length}
          state={{ pagination }}
          onPaginationChange={setPagination}
        />
      );
    }

    render(<ManualPaginationTable />);
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
  });

  it("delegates controlled row selection using a stable row id", async () => {
    const user = userEvent.setup();

    function ControlledSelectionTable() {
      const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({
        "ada@qeet.io": true,
      });

      return (
        <DataTable
          columns={columns}
          data={data}
          enableColumnVisibility={false}
          enableRowSelection
          getRowId={(person) => person.email}
          state={{ rowSelection }}
          onRowSelectionChange={setRowSelection}
        />
      );
    }

    render(<ControlledSelectionTable />);
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[1]);
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
  });

  it("renders the empty state when there is no data", () => {
    render(<DataTable columns={columns} data={[]} enableColumnVisibility={false} />);
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it("inherits ambient density until the local toggle overrides it", () => {
    const { container } = render(
      <DensityProvider density="compact">
        <DataTable columns={columns} data={data} enableDensity />
      </DensityProvider>,
    );
    const tableRoot = container.querySelector('[data-slot="data-table"]');

    expect(tableRoot).toHaveAttribute("data-density", "compact");
    expect(tableRoot).not.toHaveAttribute("data-qx-density");

    fireEvent.click(screen.getByRole("button", { name: "Comfortable rows" }));
    expect(tableRoot).toHaveAttribute("data-density", "comfortable");
    expect(tableRoot).toHaveAttribute("data-qx-density", "comfortable");
  });

  it("honors an explicit default density over the ambient mode", () => {
    const { container } = render(
      <DensityProvider density="compact">
        <DataTable columns={columns} data={data} defaultDensity="comfortable" />
      </DensityProvider>,
    );

    expect(container.querySelector('[data-slot="data-table"]')).toHaveAttribute(
      "data-qx-density",
      "comfortable",
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <DataTable columns={columns} data={data} enableColumnVisibility={false} />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations with the toolbar enabled", async () => {
    const { container } = render(
      <DataTable columns={columns} data={data} enableSearch enableColumnVisibility />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
