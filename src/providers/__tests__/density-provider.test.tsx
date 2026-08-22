import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { IconButton } from "@/components/Button/icon-button";
import { MaskInput } from "@/components/MaskInput/mask-input";
import {
  DEFAULT_DENSITY_MODE,
  DENSITY_ATTRIBUTE,
  DENSITY_METRICS,
  DENSITY_MODES,
} from "@/contracts/density";
import { DensityProvider, useDensity } from "@/providers/density-provider";

function CurrentDensity({ label }: { label: string }) {
  return <output aria-label={label}>{useDensity()}</output>;
}

describe("DensityProvider", () => {
  afterEach(() => {
    document.documentElement.removeAttribute(DENSITY_ATTRIBUTE);
  });

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

  // docs/standards/density.md states that a compact subtree inside a comfortable document is a
  // supported arrangement. Nothing asserted it: the attribute is what CSS inherits, and the
  // context is what a component branching in JavaScript reads, so both have to nest.
  it("nests a compact subtree inside a comfortable document", () => {
    render(
      <DensityProvider density="comfortable" scope="document">
        <CurrentDensity label="outer" />
        <DensityProvider density="compact" data-testid="inner-scope">
          <CurrentDensity label="inner" />
        </DensityProvider>
      </DensityProvider>,
    );

    expect(document.documentElement).toHaveAttribute(DENSITY_ATTRIBUTE, "comfortable");
    expect(screen.getByTestId("inner-scope")).toHaveAttribute(DENSITY_ATTRIBUTE, "compact");
    expect(screen.getByLabelText("outer")).toHaveTextContent("comfortable");
    expect(screen.getByLabelText("inner")).toHaveTextContent("compact");
  });

  // The restore path the existing test does not reach: when nothing set the attribute, unmounting
  // has to remove it rather than leave the document pinned to the provider's mode.
  it("removes the document attribute it added when there was none before", () => {
    expect(document.documentElement.hasAttribute(DENSITY_ATTRIBUTE)).toBe(false);

    const { unmount } = render(
      <DensityProvider density="compact" scope="document">
        <span>Content</span>
      </DensityProvider>,
    );
    expect(document.documentElement).toHaveAttribute(DENSITY_ATTRIBUTE, "compact");

    unmount();
    expect(document.documentElement.hasAttribute(DENSITY_ATTRIBUTE)).toBe(false);
  });

  it("exposes only the contract vocabulary", () => {
    for (const mode of DENSITY_MODES) {
      const { container, unmount } = render(
        <DensityProvider density={mode}>
          <span>Content</span>
        </DensityProvider>,
      );
      expect(container.firstElementChild).toHaveAttribute(DENSITY_ATTRIBUTE, mode);
      unmount();
    }
    expect(DENSITY_MODES).toContain(DEFAULT_DENSITY_MODE);
  });

  /**
   * The two families whose density support arrives through composition rather than through their
   * own source (DENSITY-001): `IconButton` renders `Button size="icon"`, `MaskInput` renders
   * `Input`, and in both cases the height comes from a variable that resolves to
   * `--qx-density-control-height`. `component-manifest.json` claims `supported` for them on that
   * basis, so the claim needs something asserting the variable actually reaches the DOM.
   *
   * jsdom resolves no custom properties, so this asserts the class the component ships rather
   * than a computed height — the byte that would be missing if someone pinned a literal size.
   */
  it("passes a density-resolved height through a composing wrapper", () => {
    render(
      <DensityProvider density="compact">
        <IconButton icon={() => <svg aria-hidden />} aria-label="Refresh" />
        <MaskInput mask="000-000" aria-label="Code" />
      </DensityProvider>,
    );

    const button = screen.getByRole("button", { name: "Refresh" });
    expect(button.className).toContain("size-[var(--qx-component-button-height)]");

    const input = screen.getByLabelText("Code");
    expect(input.className).toContain("h-[var(--qx-component-input-height)]");
  });

  /**
   * The counter-example, and the reason the wrapper test above is not vacuous: Button's
   * density-resolved height is on its `default` and `icon` sizes only. A wrapper that pins any
   * other size opts out, which is why `CloseButton` is recorded `unsupported` rather than
   * inheriting `Button`'s value.
   */
  it("does not claim density for a wrapper that pins a literal size", () => {
    render(
      <DensityProvider density="compact">
        <IconButton icon={() => <svg aria-hidden />} aria-label="Pinned" size="icon-sm" />
      </DensityProvider>,
    );
    const pinned = screen.getByRole("button", { name: "Pinned" });
    expect(pinned.className).toContain("size-7");
    expect(pinned.className).not.toContain("--qx-component-button-height");
  });

  /**
   * The provider only sets an attribute; whether that attribute changes anything is a property of
   * the generated stylesheet, and jsdom applies none of it (no layout, no Tailwind). So this
   * asserts the bytes instead: every contract metric is declared under every mode, and no two
   * modes declare the same value — which is the thing that would silently make a "density-aware"
   * component render identically in both.
   */
  it("generates a distinct value for every metric in every mode", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf8");
    const declared = (selector: string) => {
      const block = new RegExp(`${selector}\\s*\\{([^}]*)\\}`).exec(css);
      expect(block, `${selector} is not in the generated stylesheet`).not.toBeNull();
      return (block as RegExpExecArray)[1];
    };

    for (const mode of DENSITY_MODES) {
      const block = declared(`\\[data-qx-density="${mode}"\\]`);
      for (const metric of DENSITY_METRICS) {
        expect(block, `${mode} is missing --qx-density-${metric}`).toContain(
          `--qx-density-${metric}:`,
        );
      }
    }

    const metricValue = (mode: string, metric: string) =>
      new RegExp(`\\[data-qx-density="${mode}"\\]\\s*\\{[^}]*--qx-density-${metric}:\\s*([^;]+);`)
        .exec(css)?.[1]
        .trim();

    for (const metric of DENSITY_METRICS) {
      const values = DENSITY_MODES.map((mode) => metricValue(mode, metric));
      expect(new Set(values).size, `--qx-density-${metric} is the same in every mode`).toBe(
        DENSITY_MODES.length,
      );
    }
  });
});
