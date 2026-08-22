import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Pagination } from "@/components/navigation/pagination";

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
