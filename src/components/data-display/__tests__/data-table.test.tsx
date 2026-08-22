// `createColumnHelper` is re-exported from the package root (`@qeetrix/ui`);
// it originates from @tanstack/react-table, imported directly here.
import { createColumnHelper, type PaginationState, type SortingState } from "@tanstack/react-table";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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

// SEC-002. Exported rows are untrusted data: a cell a spreadsheet evaluates instead of
// displaying executes on the machine of whoever opens the file. These assert the exported bytes,
// not that a button rendered.
describe("DataTable CSV export", () => {
  const capturedBlobs: Blob[] = [];

  function installObjectUrl() {
    capturedBlobs.length = 0;
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: (blob: Blob) => {
        capturedBlobs.push(blob);
        return "blob:qeetrix-test";
      },
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: () => {},
    });
  }

  afterEach(() => {
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");
    vi.restoreAllMocks();
  });

  /** Render, click Export, and return the bytes the browser would have downloaded. */
  async function exportedCsv(ui: React.ReactElement) {
    installObjectUrl();
    // A detached anchor in jsdom has no navigation to perform, but stubbing click keeps the
    // assertion about serialisation rather than about jsdom's link handling.
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(ui);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(capturedBlobs).toHaveLength(1);
    return await capturedBlobs[0].text();
  }

  type Cell = { value: string };
  const cellColumns = [createColumnHelper<Cell>().accessor("value", { header: "Value" })];

  const exportOneCell = (value: string, escaping?: "prefix" | "none") =>
    exportedCsv(
      <DataTable
        columns={cellColumns}
        data={[{ value }]}
        enableExport
        exportFormulaEscaping={escaping}
        enableColumnVisibility={false}
      />,
    );

  it("exports the visible columns and filtered rows", async () => {
    const csv = await exportedCsv(
      <DataTable columns={columns} data={data} enableExport enableColumnVisibility={false} />,
    );
    expect(csv).toBe(
      [
        "name,email,role",
        "Grace,grace@qeet.io,Admin",
        "Ada,ada@qeet.io,Member",
        "Linus,linus@qeet.io,Member",
      ].join("\n"),
    );
  });

  it.each([
    ["=1+1", "'=1+1"],
    [
      '=HYPERLINK("https://attacker.example","click")',
      '"\'=HYPERLINK(""https://attacker.example"",""click"")"',
    ],
    ["+1+1", "'+1+1"],
    ["-2+3", "'-2+3"],
    ["@SUM(A1:A9)", "'@SUM(A1:A9)"],
    // No comma, quote or line break, so CSV quoting is not triggered — only the guard applies.
    ["=cmd|' /c calc'!A1", "'=cmd|' /c calc'!A1"],
    ["  =1+1", "'  =1+1"],
  ])("neutralises %j", async (value, expected) => {
    const csv = await exportOneCell(value);
    expect(csv.split("\n")[1]).toBe(expected);
  });

  it.each([["\t=1+1"], ["\r=1+1"]])("neutralises a smuggled formula lead %j", async (value) => {
    const csv = await exportOneCell(value);
    // The cell is quoted because it contains a carriage return or begins with a tab, and the
    // apostrophe precedes the smuggling character so the whole cell is text.
    expect(csv.split("\n")[1].replace(/^"|"$/g, "")).toBe(`'${value}`);
  });

  it.each([["-5"], ["+5"], ["-1.5"], ["-2e10"], ["5"], ["hello"], ["a=b"], ["user@qeet.io"]])(
    "leaves %j untouched",
    async (value) => {
      const csv = await exportOneCell(value);
      expect(csv.split("\n")[1]).toBe(value);
    },
  );

  it("quotes commas, quotes, and line breaks without losing them", async () => {
    const csv = await exportOneCell('a,b "c"\nd');
    expect(csv.split("\n").slice(1).join("\n")).toBe('"a,b ""c""\nd"');
  });

  it("guards a bare dash, which is deliberate rather than an oversight", async () => {
    // A lone "-" is a common placeholder and cannot execute anything, but the rule is a single
    // auditable line: a formula lead that is not a plain number is text. Spreadsheets hide the
    // apostrophe; `exportFormulaEscaping="none"` is the escape hatch when that matters.
    expect((await exportOneCell("-")).split("\n")[1]).toBe("'-");
  });

  it("writes values verbatim when escaping is explicitly disabled", async () => {
    const csv = await exportOneCell("=1+1", "none");
    expect(csv.split("\n")[1]).toBe("=1+1");
  });

  it("neutralises a formula in a column header too", async () => {
    type Row = { "=1+1": string };
    const csv = await exportedCsv(
      <DataTable
        columns={[createColumnHelper<Row>().accessor("=1+1", { header: "X" })]}
        data={[{ "=1+1": "ok" }]}
        enableExport
        enableColumnVisibility={false}
      />,
    );
    expect(csv.split("\n")[0]).toBe("'=1+1");
  });
});

// A11Y-005. Virtualization keeps a window of rows in the DOM, so anything that counts `<tr>`
// elements — every screen reader — sees a different table from the one the user asked for. These
// tests assert the row set assistive technology would compute: the total, each row's position in
// it, and that the layout spacers are not part of it.
describe("DataTable virtualized row semantics", () => {
  // jsdom performs no layout, so the row virtualizer measures a 0px viewport and windows nothing
  // (its range is empty, which is also why a virtualized table used to server-render no rows at
  // all). Reporting a fixed `offsetHeight` is what @tanstack/virtual reads for the scroll
  // viewport, and it is enough to make the window real: with 500 rows at 50px in a 300px
  // viewport only ~17 render, and scrolling moves that window.
  const nativeOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get: () => 300,
    });
  });
  afterAll(() => {
    if (nativeOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", nativeOffsetHeight);
    }
  });

  const manyRows: Person[] = Array.from({ length: 500 }, (_, i) => ({
    name: `Person ${i}`,
    email: `person${i}@qeet.io`,
    role: i % 2 === 0 ? "Admin" : "Member",
  }));

  const renderVirtualized = () =>
    render(
      <DataTable
        columns={columns}
        data={manyRows}
        enableVirtualization
        maxHeight={300}
        estimateRowHeight={50}
        enableSearch={false}
        enableColumnVisibility={false}
      />,
    );

  /** Scroll the virtualized body. jsdom ignores `scrollTop` writes, so define it outright. */
  function scrollBody(container: HTMLElement, top: number) {
    const body = container.querySelector('[data-slot="data-table-scroll"]') as HTMLElement;
    Object.defineProperty(body, "scrollTop", { configurable: true, value: top, writable: true });
    fireEvent.scroll(body);
    return body;
  }

  it("reports the size of the whole row set, not of the window", () => {
    const { container } = renderVirtualized();

    // The window has to be genuinely smaller than the data, and genuinely non-empty, or the
    // rest of this proves nothing.
    const windowed = container.querySelectorAll("tbody tr[data-slot='table-row']").length;
    expect(windowed).toBeGreaterThan(10);
    expect(windowed).toBeLessThan(60);
    // 500 body rows + the header row, because ARIA row indices count header rows.
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "501");
  });

  it("keeps layout spacers out of the row set", () => {
    const { container } = renderVirtualized();
    scrollBody(container, 5000);

    // Both spacers are in the DOM: one for the rows above the window, one for those below.
    expect(container.querySelectorAll('[data-slot="data-table-virtual-spacer"]')).toHaveLength(2);
    // None of them reaches the accessibility tree, so no row announces as blank.
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(
      container.querySelectorAll("tbody tr[data-slot='table-row']").length + 1,
    );
    for (const row of rows) expect(row.textContent).not.toBe("");
  });

  it("numbers each rendered row by its place in the full set", () => {
    const { container } = renderVirtualized();
    scrollBody(container, 5000);

    const bodyRows = Array.from(
      container.querySelectorAll<HTMLElement>("tbody tr[data-slot='table-row']"),
    );
    const first = bodyRows[0];
    // 5000px / 50px = row 100, minus 10 rows of overscan, so the window starts at row 90.
    expect(first).toHaveTextContent("Person 90");
    // Header row is index 1, so the 91st body row is index 92 — not the "index 2" its DOM
    // position would imply.
    expect(first).toHaveAttribute("aria-rowindex", "92");

    // Indices stay contiguous and keep matching their own cell values.
    bodyRows.forEach((row, offset) => {
      expect(row).toHaveTextContent(`Person ${90 + offset}`);
      expect(row).toHaveAttribute("aria-rowindex", String(92 + offset));
    });
  });

  it("indexes the header row so the body indices line up", () => {
    renderVirtualized();
    const [headerRow] = screen.getAllByRole("row");

    expect(within(headerRow).getByRole("columnheader", { name: /name/i })).toBeInTheDocument();
    expect(headerRow).toHaveAttribute("aria-rowindex", "1");
  });

  it("claims no windowed row model when every row is in the DOM", () => {
    render(<DataTable columns={columns} data={data} enableColumnVisibility={false} />);

    // aria-rowcount/aria-rowindex exist to describe rows that are missing. Emitting them when
    // nothing is missing invites the two numbers to drift apart.
    expect(screen.getByRole("table")).not.toHaveAttribute("aria-rowcount");
    for (const row of screen.getAllByRole("row")) {
      expect(row).not.toHaveAttribute("aria-rowindex");
    }
  });

  it("server-renders rows instead of an empty body", () => {
    // The virtualizer cannot measure a viewport on the server, and an unmeasured virtualizer has
    // an empty range: this table used to server-render a header, no rows, and no empty state.
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        data={manyRows}
        enableVirtualization
        maxHeight={300}
        estimateRowHeight={50}
        enableColumnVisibility={false}
      />,
    );

    expect(html).toContain('aria-rowcount="501"');
    expect(html).toContain("Person 0");
    expect(html).toContain('aria-rowindex="2"');
  });

  it("puts the scrolling body in the tab order", async () => {
    const user = userEvent.setup();
    const { container } = renderVirtualized();

    // Rows outside the window are unreachable until the body scrolls, and a scroll container
    // that only answers the pointer cannot be scrolled by a keyboard-only user at all.
    await user.tab();
    expect(document.activeElement).toBe(container.querySelector('[data-slot="data-table-scroll"]'));
  });

  it("has no axe violations while windowed", async () => {
    const { container } = renderVirtualized();
    scrollBody(container, 5000);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

// A11Y-008. Every row's checkbox and expander used to carry the same name, the resize handle
// exposed no value, and nothing said the table was loading.
describe("DataTable control names", () => {
  it("names each row's checkbox after the row", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={data}
        enableColumnVisibility={false}
        enableRowSelection
        getRowLabel={(row) => row.original.name}
      />,
    );

    // Not three identical "Select row" entries in the control list.
    expect(screen.queryAllByRole("checkbox", { name: "Select row" })).toHaveLength(0);
    await user.click(screen.getByRole("checkbox", { name: "Select Ada" }));

    // The name identifies the row it actually selects.
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    const adaRow = screen.getByRole("cell", { name: "Ada" }).closest("tr");
    expect(adaRow).toHaveAttribute("data-state", "selected");
  });

  it("keeps the generic row name when no label is supplied", () => {
    render(
      <DataTable columns={columns} data={data} enableColumnVisibility={false} enableRowSelection />,
    );
    expect(screen.getAllByRole("checkbox", { name: "Select row" })).toHaveLength(3);
  });

  it("says what the select-all checkbox will actually select", () => {
    const { unmount } = render(
      <DataTable
        columns={columns}
        data={data}
        enableColumnVisibility={false}
        enableRowSelection
        pageSize={2}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: "Select all rows on this page" }),
    ).toBeInTheDocument();
    unmount();

    // With pagination off there is no page to qualify, and the control does select everything.
    render(
      <DataTable
        columns={columns}
        data={data}
        enableColumnVisibility={false}
        enableRowSelection
        pageSize={0}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeInTheDocument();
  });

  it("names the row expander and exposes whether it is open", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={data}
        enableColumnVisibility={false}
        enableExpanding
        getRowCanExpand={() => true}
        getRowLabel={(row) => row.original.name}
        renderSubComponent={(row) => <p>Detail for {row.original.name}</p>}
      />,
    );

    const expander = screen.getByRole("button", { name: "Expand Ada" });
    expect(expander).toHaveAttribute("aria-expanded", "false");

    await user.click(expander);
    expect(screen.getByText("Detail for Ada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse Ada" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("names the table from a visible caption", () => {
    render(
      <DataTable columns={columns} data={data} enableColumnVisibility={false} caption="Team" />,
    );
    // A native <caption> is the table's accessible name, and stays on screen.
    expect(screen.getByRole("table", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByText("Team").tagName).toBe("CAPTION");
  });

  it("names the table without showing the name when asked", () => {
    render(<DataTable columns={columns} data={data} enableColumnVisibility={false} label="Team" />);
    expect(screen.getByRole("table", { name: "Team" })).toBeInTheDocument();
    expect(screen.queryByText("Team")).not.toBeInTheDocument();
  });

  it("announces a fetch instead of changing rows silently", () => {
    const { rerender } = render(
      <DataTable columns={columns} data={data} enableColumnVisibility={false} />,
    );
    // The live region is mounted before it has anything to say; one that appears together with
    // its text is routinely missed.
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("");
    expect(screen.getByRole("table")).not.toHaveAttribute("aria-busy");

    rerender(<DataTable columns={columns} data={data} enableColumnVisibility={false} busy />);
    expect(status).toHaveTextContent("Loading rows");
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
  });
});

// A11Y-008, resize half. The handle was a nameless-valued button on a 4px target; it is now a
// window splitter that publishes the width it controls. jsdom computes no geometry, so the
// widened hit area is not assertable here — what is assertable is the value model and that the
// bounds it publishes are the bounds it enforces.
describe("DataTable column resize separator", () => {
  const renderResizable = (cols = columns) =>
    render(
      <DataTable columns={cols} data={data} enableColumnVisibility={false} enableColumnResizing />,
    );

  const separator = (name: string) => screen.getByRole("separator", { name });
  const headerWidth = (index: number) =>
    (screen.getAllByRole("columnheader")[index] as HTMLElement).style.width;

  it("publishes the width it controls", () => {
    renderResizable();
    const handle = separator("Resize name column");

    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("aria-valuenow", "150");
    expect(handle).toHaveAttribute("aria-valuemin", "40");
    expect(handle).toHaveAttribute("aria-valuemax", "960");
    // Pixels are not a percentage of anything, so the value is also given as text.
    expect(handle).toHaveAttribute("aria-valuetext", "150 pixels");
  });

  it("moves the column, and its published value, with the arrow keys", async () => {
    const user = userEvent.setup();
    renderResizable();
    await user.click(separator("Resize name column"));

    await user.keyboard("{ArrowRight}");
    expect(headerWidth(0)).toBe("158px");
    expect(separator("Resize name column")).toHaveAttribute("aria-valuetext", "158 pixels");

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(headerWidth(0)).toBe("142px");
  });

  it("stops where it says it stops", async () => {
    const user = userEvent.setup();
    renderResizable();
    await user.click(separator("Resize name column"));

    await user.keyboard("{End}{ArrowRight}");
    expect(separator("Resize name column")).toHaveAttribute("aria-valuenow", "960");
    expect(headerWidth(0)).toBe("960px");

    await user.keyboard("{Home}{ArrowLeft}");
    expect(separator("Resize name column")).toHaveAttribute("aria-valuenow", "40");
    expect(headerWidth(0)).toBe("40px");
  });

  it("publishes a column's own bounds when it declares them", async () => {
    const user = userEvent.setup();
    renderResizable([columnHelper.accessor("name", { header: "Name", minSize: 80, maxSize: 200 })]);
    const handle = separator("Resize name column");

    expect(handle).toHaveAttribute("aria-valuemin", "80");
    expect(handle).toHaveAttribute("aria-valuemax", "200");

    await user.click(handle);
    await user.keyboard("{Home}");
    expect(headerWidth(0)).toBe("80px");
  });

  it("has no axe violations with resizing enabled", async () => {
    const { container } = renderResizable();
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/* ── Persisted UI state ────────────────────────────────────────────────────────────────────
 * SSR-002. `persistKey` reads and writes bytes this component does not own: the key can change
 * while mounted, the browser can refuse the write, and the payload can be anything.
 */
describe("DataTable persisted state", () => {
  const storageKey = (key: string) => `qx-datatable:${key}`;
  const firstRowName = () => within(screen.getAllByRole("row")[1]).getAllByRole("cell")[0];
  const saved = (key: string) => JSON.parse(localStorage.getItem(storageKey(key)) ?? "null");

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const persisted = (key: string) => (
    <DataTable columns={columns} data={data} persistKey={key} enableColumnVisibility={false} />
  );

  it("loads the new key's saved view when the key changes, and leaves the old one alone", () => {
    localStorage.setItem(
      storageKey("orders"),
      JSON.stringify({ sorting: [{ id: "name", desc: true }] }),
    );

    const { rerender } = render(persisted("users"));
    // Sort the users table ascending by name: Ada first.
    fireEvent.click(screen.getByRole("button", { name: /name/i }));
    expect(firstRowName()).toHaveTextContent("Ada");
    expect(saved("users").sorting).toEqual([{ id: "name", desc: false }]);

    rerender(persisted("orders"));

    // The orders view is descending by name — its own saved sort, not the one in hand.
    expect(firstRowName()).toHaveTextContent("Linus");
    expect(saved("orders").sorting).toEqual([{ id: "name", desc: true }]);
    // And the users view is still where it was left, not overwritten by the table it replaced.
    expect(saved("users").sorting).toEqual([{ id: "name", desc: false }]);
  });

  it("replaces the previous view rather than merging into it", () => {
    localStorage.setItem(
      storageKey("users"),
      JSON.stringify({ sorting: [{ id: "name", desc: true }], columnSizing: { name: 320 } }),
    );

    const { rerender } = render(persisted("users"));
    expect(firstRowName()).toHaveTextContent("Linus");

    rerender(persisted("empty"));

    // Nothing is saved under "empty", so the table is back to the data order, and the sizing
    // from the previous key has not followed it across.
    expect(firstRowName()).toHaveTextContent("Grace");
    // No `density`: nothing was toggled locally, and the density this table inherits is not a
    // preference of its own.
    expect(saved("empty")).toEqual({
      sorting: [],
      columnVisibility: {},
      columnSizing: {},
      columnPinning: { left: [], right: [] },
    });
  });

  it("keeps working when the browser refuses the write", () => {
    // A full origin, or Safari with storage disabled. This used to throw out of the effect,
    // which unmounts the tree: the table stopped rendering because a preference could not be
    // saved.
    const prototype = Object.getPrototypeOf(window.localStorage);
    const originalSetItem = prototype.setItem;
    prototype.setItem = () => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    };

    try {
      render(persisted("users"));
      fireEvent.click(screen.getByRole("button", { name: /name/i }));

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(firstRowName()).toHaveTextContent("Ada");
    } finally {
      prototype.setItem = originalSetItem;
    }
  });

  it("treats a payload of the wrong shape as no saved view", () => {
    // `sorting` as a string parses as JSON and then threw `sorting.find is not a function` from
    // inside TanStack, during render.
    localStorage.setItem(storageKey("users"), JSON.stringify({ sorting: "name" }));

    render(persisted("users"));

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(firstRowName()).toHaveTextContent("Grace");
  });

  it.each([
    ["not JSON at all", "{sorting:"],
    ["a JSON array", "[1,2,3]"],
    ["a JSON string", '"dark"'],
    ["null", "null"],
  ])("survives stored bytes that are %s", (_label, bytes) => {
    localStorage.setItem(storageKey("users"), bytes);

    render(persisted("users"));

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(firstRowName()).toHaveTextContent("Grace");
  });

  it("keeps the fields it recognises from a partly corrupt payload", () => {
    localStorage.setItem(
      storageKey("users"),
      JSON.stringify({
        sorting: [{ id: "name", desc: true }, { id: "email" }, "role"],
        columnSizing: { name: "wide", email: 240 },
        density: "roomy",
      }),
    );

    render(persisted("users"));

    // The valid sort entry survives; the one with no direction and the bare string do not.
    expect(firstRowName()).toHaveTextContent("Linus");
    expect(saved("users")).toEqual({
      sorting: [{ id: "name", desc: true }],
      columnVisibility: {},
      columnSizing: { email: 240 },
      columnPinning: { left: [], right: [] },
    });
  });

  it("persists the density the user chose, not the one the table inherited", () => {
    const inheritedCompact = (
      <DensityProvider density="compact">
        <DataTable
          columns={columns}
          data={data}
          persistKey="users"
          enableDensity
          enableColumnVisibility={false}
        />
      </DensityProvider>
    );

    render(inheritedCompact);
    // Nothing was toggled, so there is no density preference to restore — writing "compact" here
    // would pin an application-wide setting into this one table's saved view.
    expect(saved("users").density).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Comfortable rows" }));
    expect(saved("users").density).toBe("comfortable");
  });

  it("renders the same markup on the server whether or not a view is saved", () => {
    const withoutSavedView = renderToStaticMarkup(persisted("users"));
    localStorage.setItem(
      storageKey("users"),
      JSON.stringify({ sorting: [{ id: "name", desc: true }] }),
    );

    // Server output may not depend on storage the server cannot see: the browser's first render
    // has to be able to reproduce it byte for byte.
    expect(renderToStaticMarkup(persisted("users"))).toBe(withoutSavedView);
  });
});
