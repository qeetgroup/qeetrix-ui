import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { DataState } from "@/components/ui/data-state";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("DataState", () => {
  it("renders children when no state flags are set", () => {
    render(
      <DataState>
        <p>Loaded data</p>
      </DataState>,
    );
    expect(screen.getByText("Loaded data")).toBeInTheDocument();
  });

  it("renders skeleton rows and hides children when isLoading=true", () => {
    const { container } = render(
      <DataState isLoading skeletonRows={3}>
        <p>Data</p>
      </DataState>,
    );
    expect(screen.queryByText("Data")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(3);
  });

  it("renders error message when isError=true", () => {
    render(
      <DataState isError error={new Error("Not found")}>
        <p>Data</p>
      </DataState>,
    );
    expect(screen.getByText(/Not found/)).toBeInTheDocument();
    expect(screen.queryByText("Data")).not.toBeInTheDocument();
  });

  it("renders custom error fallback", () => {
    render(
      <DataState isError errorFallback={<p>Custom error</p>}>
        <p>Data</p>
      </DataState>,
    );
    expect(screen.getByText("Custom error")).toBeInTheDocument();
  });

  it("renders empty state with title when isEmpty=true", () => {
    render(
      <DataState isEmpty emptyTitle="No results" emptyDescription="Try a different filter">
        <p>Data</p>
      </DataState>,
    );
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.queryByText("Data")).not.toBeInTheDocument();
  });

  it("has no axe violations in data state", async () => {
    const { container } = render(
      <DataState>
        <p>Content</p>
      </DataState>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations in empty state", async () => {
    const { container } = render(
      <DataState isEmpty emptyTitle="Empty" emptyDescription="Nothing here">
        <p />
      </DataState>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
