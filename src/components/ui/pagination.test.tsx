import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Pagination } from "@/components/ui/pagination";
import { I18nProvider } from "@/i18n";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Pagination", () => {
  it("renders Next button when hasNext=true", () => {
    render(<Pagination hasNext onNext={vi.fn()} />);
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("renders First button when hasPrev=true", () => {
    render(<Pagination hasPrev onFirst={vi.fn()} />);
    expect(screen.getByRole("button", { name: /first/i })).toBeInTheDocument();
  });

  it("fires onNext when Next is clicked", () => {
    const onNext = vi.fn();
    render(<Pagination hasNext onNext={onNext} />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("fires onFirst when First is clicked", () => {
    const onFirst = vi.fn();
    render(<Pagination hasPrev onFirst={onFirst} />);
    fireEvent.click(screen.getByRole("button", { name: /first/i }));
    expect(onFirst).toHaveBeenCalledTimes(1);
  });

  it("shows custom label", () => {
    render(<Pagination label="Showing 1–50" />);
    expect(screen.getByText("Showing 1–50")).toBeInTheDocument();
  });

  it("derives label from itemsOnPage and pageSize", () => {
    render(<Pagination itemsOnPage={25} pageSize={50} total={120} />);
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it("localizes controls and formats derived counts with the active locale", () => {
    render(
      <I18nProvider
        locale="de-DE"
        messages={{
          pagination: {
            label: "Seitennavigation",
            first: "Erste",
            firstPage: "Erste Seite",
            previous: "Zurück",
            previousShort: "Zurück",
            previousPage: "Vorherige Seite",
            next: "Weiter",
            nextPage: "Nächste Seite",
            showing: "{count} von {total}",
          },
        }}
      >
        <Pagination hasPrev hasNext itemsOnPage={1200} total={3400} />
      </I18nProvider>,
    );

    expect(screen.getByRole("navigation", { name: "Seitennavigation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Erste Seite" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nächste Seite" })).toBeInTheDocument();
    expect(screen.getByText("1.200 von 3.400")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Pagination
        hasPrev
        hasNext
        onFirst={vi.fn()}
        onNext={vi.fn()}
        itemsOnPage={50}
        pageSize={50}
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
