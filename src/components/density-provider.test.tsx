import { render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DensityProvider, useDensity } from "@/components/density-provider";

describe("DensityProvider", () => {
  it("defaults to comfortable without a provider", () => {
    const { result } = renderHook(() => useDensity());
    expect(result.current).toBe("comfortable");
  });

  it("scopes compact density to a subtree", () => {
    function DensityValue() {
      return <span>{useDensity()}</span>;
    }

    render(
      <DensityProvider density="compact" data-testid="scope">
        <DensityValue />
      </DensityProvider>,
    );

    expect(screen.getByTestId("scope")).toHaveAttribute("data-qx-density", "compact");
    expect(screen.getByText("compact")).toBeInTheDocument();
  });

  it("sets, updates, and restores document density", () => {
    document.documentElement.setAttribute("data-qx-density", "comfortable");

    const { rerender, unmount } = render(
      <DensityProvider density="compact" scope="document">
        <span>Content</span>
      </DensityProvider>,
    );
    expect(document.documentElement).toHaveAttribute("data-qx-density", "compact");

    rerender(
      <DensityProvider density="comfortable" scope="document">
        <span>Content</span>
      </DensityProvider>,
    );
    expect(document.documentElement).toHaveAttribute("data-qx-density", "comfortable");

    unmount();
    expect(document.documentElement).toHaveAttribute("data-qx-density", "comfortable");
  });

  it("does not add a wrapper in document scope", () => {
    const { container } = render(
      <DensityProvider scope="document">
        <main>Content</main>
      </DensityProvider>,
    );
    expect(container.firstElementChild?.tagName).toBe("MAIN");
  });
});
