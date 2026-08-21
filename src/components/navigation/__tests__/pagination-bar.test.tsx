import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Pagination } from "@/components/navigation/pagination";
import { PaginationBar } from "@/components/navigation/pagination-bar";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("PaginationBar", () => {
  it("is the deprecated alias of Pagination", () => {
    expect(PaginationBar).toBe(Pagination);
  });

  it("renders and has no a11y violations", async () => {
    const { container } = render(
      <PaginationBar hasPrev hasNext itemsOnPage={25} pageSize={25} total={120} />,
    );
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(await a11y(container)).toHaveNoViolations();
  });
});
