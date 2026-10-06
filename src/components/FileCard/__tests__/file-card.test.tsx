import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FileCard } from "@/components/FileCard/file-card";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const card = () => document.querySelector("[data-slot=file-card]") as HTMLElement;

describe("FileCard", () => {
  it("renders name, size and meta", () => {
    render(<FileCard name="Q3 Report.pdf" size="2.4 MB" meta="Ada · 2d ago" />);
    expect(screen.getByText("Q3 Report.pdf")).toBeInTheDocument();
    expect(screen.getByText(/2\.4 MB/)).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<FileCard name="photo.png" size="800 KB" />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("truncates the name and keeps the full name in a tooltip", () => {
    const long = "Acme-India-Pvt-Ltd-GST-registration-certificate-REG-06.pdf";
    render(<FileCard name={long} />);
    const nameNode = screen.getByText(long).closest("[title]");
    expect(nameNode).toHaveClass("truncate");
    expect(nameNode).toHaveAttribute("title", long);
  });

  it("isolates the name and each meta segment for bidirectional text", () => {
    render(<FileCard layout="row" name="report (1).pdf" size="2 MB" meta="Ada" />);
    expect(screen.getByText("report (1).pdf").tagName).toBe("BDI");
    expect(screen.getByText("2 MB").tagName).toBe("BDI");
    expect(screen.getByText("Ada").tagName).toBe("BDI");
  });

  it("shows the extension separately, so truncation never hides the file type", () => {
    render(<FileCard name="Acme-India-GST-registration-certificate.pdf" />);
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("shows no extension label for a name without one", () => {
    render(<FileCard name="README" />);
    expect(document.querySelector("[data-slot=file-card-preview]")).not.toHaveTextContent(/\S/);
  });

  it("puts the extension in the meta line in the row layout", () => {
    render(<FileCard layout="row" name="settlements.csv" size="642 KB" />);
    expect(card()).toHaveAttribute("data-layout", "row");
    expect(document.querySelector("[data-slot=file-card-meta]")).toHaveTextContent("CSV · 642 KB");
  });

  it("marks selection on the root", () => {
    render(<FileCard name="a.pdf" selected />);
    expect(card()).toHaveAttribute("data-selected");
  });

  it("keeps actions outside the open target and clickable on their own", () => {
    const onOpen = vi.fn();
    const onAction = vi.fn();
    render(
      <FileCard
        name="a.pdf"
        onOpen={onOpen}
        actions={
          <button type="button" onClick={onAction}>
            Download a.pdf
          </button>
        }
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download a.pdf" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe("FileCard opening", () => {
  it("is static by default — no tab stop, no interactive marker", () => {
    render(<FileCard name="a.pdf" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(card()).not.toHaveAttribute("data-interactive");
  });

  it("renders the name as a link with href", () => {
    render(<FileCard name="QP-INV-00412.pdf" href="/invoices/412" />);
    const link = screen.getByRole("link", { name: "QP-INV-00412.pdf" });
    expect(link).toHaveAttribute("href", "/invoices/412");
    expect(card()).toHaveAttribute("data-interactive");
  });

  it("renders the name as a button with onOpen", () => {
    const onOpen = vi.fn();
    render(<FileCard name="a.pdf" onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "a.pdf" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations when interactive with actions", async () => {
    const { container } = render(
      <FileCard
        name="a.pdf"
        href="/a"
        selected
        actions={
          <button type="button" aria-label="More actions for a.pdf">
            …
          </button>
        }
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("FileCard transfer state", () => {
  it("shows a named, determinate progress bar and the percentage while uploading", () => {
    render(<FileCard name="report.pdf" size="2 MB" status="uploading" progress={40} />);
    const bar = screen.getByRole("progressbar", { name: "Uploading report.pdf" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(card()).toHaveAttribute("data-status", "uploading");
  });

  it("names a download differently, and is indeterminate without progress", () => {
    render(<FileCard name="export.zip" status="downloading" />);
    const bar = screen.getByRole("progressbar", { name: "Downloading export.zip" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
  });

  it("formats the percentage for the locale", () => {
    render(<FileCard name="a.pdf" status="uploading" progress={40} />);
    // Default locale is the environment's; the value is clamped and rounded either way.
    expect(document.querySelector("[data-slot=file-card-meta]")).toHaveTextContent(/40\s?%/);
  });

  it("announces a failure with the given text, replacing the meta line", () => {
    render(<FileCard name="a.pdf" size="1 MB" status="error" error="Virus scan failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Virus scan failed");
    expect(screen.queryByText("1 MB")).toBeNull();
    expect(card()).toHaveAttribute("data-status", "error");
  });

  it("falls back to a generic failure message, and accepts a translation", () => {
    const { rerender } = render(<FileCard name="a.pdf" status="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Transfer failed.");
    rerender(<FileCard name="a.pdf" status="error" messages={{ failed: "Échec du transfert." }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Échec du transfert.");
  });

  it("has no axe violations while uploading and when failed", async () => {
    const { container } = render(
      <>
        <FileCard name="a.pdf" status="uploading" progress={10} />
        <FileCard name="b.pdf" layout="row" status="error" error="Too large" />
      </>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("FileCard hover never repaints a state edge (integration pass)", () => {
  it("guards the hover border so a selected or errored card keeps its own", () => {
    render(<FileCard name="Q3 Report.pdf" size="2.4 MB" onOpen={() => {}} selected />);
    const cls = card().className;
    expect(cls).toContain(
      "data-interactive:not-data-selected:not-data-[status=error]:hover:border-(--qx-component-file-card-border-hover)",
    );
    expect(cls).not.toMatch(/(^|\s)data-interactive:hover:border-/);
  });
});
