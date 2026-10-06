import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Pagination } from "@/components/Pagination/pagination";
import { DirectionProvider } from "@/providers/direction-provider";

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

/*
 * ── Direction and locale ────────────────────────────────────────────────────────────────────
 *
 * The chevrons point along the inline axis, so they are the one place a *physical* transform
 * is correct: the glyph itself has a direction and must be flipped, not repositioned. jsdom
 * applies no CSS, so what is asserted is the `rtl:` utility being emitted; that it turns the
 * arrow is a browser assertion (`TEST-001`).
 */
describe("Pagination direction and locale", () => {
  const icon = (name: RegExp) =>
    screen.getByRole("button", { name }).querySelector("svg") as SVGElement;

  it("mirrors every directional chevron", () => {
    render(<Pagination hasPrev hasNext onFirst={vi.fn()} onNext={vi.fn()} />);
    // All three point along the inline axis, and all three were previously unmirrored — in
    // Arabic the "Next" arrow pointed back toward the first page.
    expect(icon(/first/i).getAttribute("class")).toContain("rtl:rotate-180");
    expect(icon(/previous/i).getAttribute("class")).toContain("rtl:rotate-180");
    expect(icon(/next/i).getAttribute("class")).toContain("rtl:rotate-180");
  });

  it("formats row counts for an explicit locale", () => {
    render(<Pagination itemsOnPage={1234567} total={7654321} locale="en-IN" />);
    // Indian grouping: lakh/crore, not thousands.
    expect(screen.getByText("Showing 12,34,567 of 76,54,321")).toBeInTheDocument();
  });

  it("inherits the locale from a DirectionProvider", () => {
    render(
      <DirectionProvider locale="de-DE">
        <Pagination itemsOnPage={1234} total={98765} />
      </DirectionProvider>,
    );
    // The seam that matters: an application declares its locale once at the root and the
    // footer follows, instead of every call site restating it.
    expect(screen.getByText("Showing 1.234 of 98.765")).toBeInTheDocument();
  });

  it("lets an explicit locale prop beat the provider", () => {
    render(
      <DirectionProvider locale="de-DE">
        <Pagination itemsOnPage={1234} total={98765} locale="en-US" />
      </DirectionProvider>,
    );
    expect(screen.getByText("Showing 1,234 of 98,765")).toBeInTheDocument();
  });

  it("renders inside an rtl provider without losing its label", () => {
    render(
      <DirectionProvider locale="ar-EG">
        <Pagination hasNext onNext={vi.fn()} itemsOnPage={5} />
      </DirectionProvider>,
    );
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });
});

// The "Prev" control announced "Previous page" and called `onFirst` — the same handler as the
// "First" button beside it. There was no `onPrev` prop at all, so the accessible name described
// behaviour the component could not perform.
describe("Pagination previous-page control", () => {
  it("calls onPrev when one is given", () => {
    const onFirst = vi.fn();
    const onPrev = vi.fn();
    render(<Pagination hasPrev onFirst={onFirst} onPrev={onPrev} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onFirst).not.toHaveBeenCalled();
  });

  it("still routes to onFirst when onPrev is omitted, so cursor pagination is unchanged", () => {
    const onFirst = vi.fn();
    render(<Pagination hasPrev onFirst={onFirst} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onFirst).toHaveBeenCalledTimes(1);
  });

  it("keeps First and Previous as separate controls", () => {
    const onFirst = vi.fn();
    const onPrev = vi.fn();
    render(<Pagination hasPrev onFirst={onFirst} onPrev={onPrev} />);

    fireEvent.click(screen.getByRole("button", { name: "First page" }));
    expect(onFirst).toHaveBeenCalledTimes(1);
    expect(onPrev).not.toHaveBeenCalled();
  });
});

describe("Pagination loading and announcements", () => {
  it("marks the bar busy, shows a status spinner and disables the controls while loading", () => {
    render(
      <Pagination hasPrev hasNext loading onFirst={vi.fn()} onNext={vi.fn()} itemsOnPage={50} />,
    );
    expect(screen.getByRole("navigation", { name: "Pagination" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });

  it("is not busy, and has no spinner, when idle", () => {
    render(<Pagination hasNext onNext={vi.fn()} itemsOnPage={50} />);
    expect(screen.getByRole("navigation")).not.toHaveAttribute("aria-busy");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("announces the range politely when it changes", () => {
    render(<Pagination itemsOnPage={50} total={1842} />);
    const label = screen.getByText("Showing 50 of 1,842");
    expect(label).toHaveAttribute("aria-live", "polite");
    expect(label).toHaveAttribute("aria-atomic", "true");
  });

  it("has no axe violations while loading", async () => {
    const { container } = render(
      <Pagination hasPrev hasNext loading itemsOnPage={50} pageSize={50} />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Pagination narrow containers", () => {
  // The bar responds to its own width (a size container), so in a split pane the "Prev"
  // control folds away and "First" drops to its icon — and both keep their accessible names.
  it("collapses by container width while keeping every control named", () => {
    const { container } = render(
      <Pagination hasPrev hasNext onFirst={vi.fn()} onNext={vi.fn()} itemsOnPage={5} />,
    );
    expect(container.querySelector('[data-slot="pagination"]')).toHaveClass("@container", "w-full");
    expect(screen.getByRole("button", { name: "First page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toHaveClass("@md:inline-flex");
    expect(screen.getByText("First")).toHaveClass("@xs:inline");
  });
});
