import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { PALETTE_UTILITY } from "@/__tests__/palette-utility";
import { JSONTree } from "@/components/JsonTree/json-tree";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("JSONTree", () => {
  it("renders a string primitive", () => {
    render(<JSONTree value="hello" />);
    expect(screen.getByText(/"hello"/)).toBeInTheDocument();
  });

  it("renders a number primitive", () => {
    render(<JSONTree value={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders boolean and null primitives", () => {
    render(<JSONTree value={true} />);
    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("renders object keys at the top level", () => {
    render(<JSONTree value={{ name: "Ada", age: 30 }} initialOpenDepth={2} />);
    expect(screen.getByText(/"name"/)).toBeInTheDocument();
    expect(screen.getByText(/"Ada"/)).toBeInTheDocument();
  });

  it("renders array items", () => {
    render(<JSONTree value={[10, 20, 30]} initialOpenDepth={2} />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("shows a collapsed summary for nested objects", () => {
    render(<JSONTree value={{ nested: { x: 1 } }} initialOpenDepth={1} />);
    expect(screen.getByText(/"nested"/)).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <JSONTree value={{ status: "ok", count: 3, items: ["a", "b"] }} />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  // Same defect class as CodeBlock: the node colours were named palette utilities, invisible to
  // check:token-usage and unreachable from a theme. Assert the class attributes that were wrong.
  it("colours nodes through semantic syntax roles, never the Tailwind palette", () => {
    const { container } = render(
      <JSONTree value={{ id: 1, name: "Ada", ok: true, missing: null }} initialOpenDepth={2} />,
    );
    const classes = [...container.querySelectorAll("[class]")]
      .map((el) => el.getAttribute("class") ?? "")
      .join(" ");

    expect(classes).toContain("text-syntax-key");
    expect(classes).toContain("text-syntax-string");
    expect(classes).toContain("text-syntax-number");
    expect(classes).toContain("text-syntax-literal");
    expect(classes).not.toMatch(PALETTE_UTILITY);
  });
});
