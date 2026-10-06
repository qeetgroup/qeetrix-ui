import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Table/table";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function Example() {
  return (
    <Table>
      <TableCaption>Recent invoices</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>INV-001</TableCell>
          <TableCell>$120</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

describe("Table", () => {
  it("exposes table semantics", () => {
    render(<Example />);
    expect(screen.getByRole("table", { name: "Recent invoices" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getByRole("cell", { name: "INV-001" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Example />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Table modernization", () => {
  it("keeps the header type role when cn merges it with a text colour", () => {
    render(<Example />);
    // tailwind-merge used to read `text-caption` as a colour and drop it in favour of
    // `text-muted-foreground`; both have to survive.
    const header = screen.getAllByRole("columnheader")[0];
    expect(header).toHaveClass("text-caption", "text-muted-foreground");
  });

  it("positions the selected indicator's cell at zero specificity", () => {
    render(
      <Table aria-label="Invoices">
        <TableBody>
          <TableRow data-state="selected">
            <TableCell className="absolute">INV-001</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    // The rule that makes the first cell `relative` is wrapped in :where(), so a consumer's own
    // positioning — `absolute` in a stacked layout — wins without `!`.
    expect(screen.getByRole("row").className).toContain(
      "[:where(&[data-state=selected]>:first-child)]:relative",
    );
    expect(screen.getByRole("cell")).toHaveClass("absolute");
  });

  it("marks a selected row with the Qeet selected vocabulary and an indicator", () => {
    render(
      <Table aria-label="Invoices">
        <TableBody>
          <TableRow data-state="selected">
            <TableCell>INV-001</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const row = screen.getByRole("row");
    expect(row).toHaveAttribute("data-state", "selected");
    expect(row.className).toContain("--qx-component-table-row-background-selected");
    expect(row.className).toContain("--qx-component-table-row-indicator");
  });

  it("lets a consumer opt a row out of the hover wash", () => {
    render(
      <Table aria-label="Invoices">
        <TableBody>
          <TableRow className="hover:bg-transparent">
            <TableCell>INV-001</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("row")).toHaveClass("hover:bg-transparent");
  });

  it("makes the header sticky inside a capped container", () => {
    const { container } = render(
      <Table aria-label="Sessions" containerClassName="max-h-48">
        <TableHeader sticky>
          <TableRow>
            <TableHead>Session</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );
    expect(container.querySelector('[data-slot="table-container"]')).toHaveClass("max-h-48");
    const header = container.querySelector('[data-slot="table-header"]');
    expect(header).toHaveAttribute("data-sticky");
    expect(header).toHaveClass("sticky", "top-0");
  });

  it("renders an empty row that spans the columns", () => {
    render(
      <Table aria-label="Sessions">
        <TableHeader>
          <TableRow>
            <TableHead>Session</TableHead>
            <TableHead>Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty colSpan={2}>No sessions</TableEmpty>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("cell", { name: "No sessions" })).toHaveAttribute("colspan", "2");
  });

  it("forwards a ref to the row element", () => {
    const ref = { current: null as HTMLTableRowElement | null };
    render(
      <Table aria-label="Invoices">
        <TableBody>
          <TableRow ref={ref}>
            <TableCell>INV-001</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(ref.current?.tagName).toBe("TR");
  });

  it("has no axe violations with a footer, sticky header and empty row", async () => {
    const { container } = render(
      <Table aria-label="Invoices" containerClassName="max-h-48">
        <TableHeader sticky>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty colSpan={2}>Nothing yet</TableEmpty>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>$0</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
