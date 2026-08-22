import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { EmptyState } from "@/components/EmptyState/empty-state";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("EmptyState", () => {
  it("renders title, description and action", () => {
    render(
      <EmptyState
        title="No results"
        description="Try adjusting your filters."
        action={<button type="button">Reset</button>}
      />,
    );
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Try adjusting your filters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<EmptyState title="No results" description="Nothing here yet." />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
