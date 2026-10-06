import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Highlight } from "@/components/Highlight/highlight";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

const marks = (c: Element) => Array.from(c.querySelectorAll("mark")).map((m) => m.textContent);

describe("Highlight", () => {
  it("wraps the matched term in a <mark>", () => {
    const { container } = render(<Highlight query="ipsum">Lorem ipsum dolor</Highlight>);
    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark).toHaveTextContent("ipsum");
    expect(mark).toHaveAttribute("data-slot", "highlight-mark");
  });

  it("is case-insensitive by default", () => {
    const { container } = render(<Highlight query="lorem">Lorem ipsum</Highlight>);
    expect(container.querySelector("mark")).toHaveTextContent("Lorem");
  });

  it("respects caseSensitive", () => {
    const { container } = render(
      <Highlight query="lorem" caseSensitive>
        Lorem lorem
      </Highlight>,
    );
    expect(marks(container)).toEqual(["lorem"]);
  });

  it("matches the longest term first, so overlapping terms mark the whole word", () => {
    const { container } = render(
      <Highlight query={["pay", "payroll"]}>Run payroll, then pay vendors</Highlight>,
    );
    expect(marks(container)).toEqual(["payroll", "pay"]);
  });

  it("ignores empty and whitespace-only terms instead of marking every space", () => {
    const { container } = render(<Highlight query={[" ", ""]}>Qeet Pay ledger</Highlight>);
    expect(container.querySelector("mark")).toBeNull();
    expect(container).toHaveTextContent("Qeet Pay ledger");
  });

  it("escapes regular-expression syntax in the query", () => {
    const { container } = render(<Highlight query="a.b">a.b axb</Highlight>);
    expect(marks(container)).toEqual(["a.b"]);
  });

  it("paints the mark from its component tokens, without shifting the text", () => {
    const { container } = render(<Highlight query="ledger">Settlement ledger</Highlight>);
    const mark = container.querySelector("mark");
    expect(mark).toHaveClass(
      "bg-(--qx-component-highlight-background)",
      "text-(--qx-component-highlight-foreground)",
      // Equal and opposite inline padding/margin: marking text adds no width.
      "px-(--qx-component-highlight-padding-inline)",
      "-mx-(--qx-component-highlight-padding-inline)",
      "forced-colors:bg-[Mark]",
    );
    expect(mark?.className).not.toMatch(/bg-primary|dark:/);
  });

  it("has no axe violations", async () => {
    const { container } = render(<Highlight query="x">text x here</Highlight>);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
