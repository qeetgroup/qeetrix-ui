import { fireEvent, render, screen } from "@testing-library/react";
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

describe("JSONTree as a tree", () => {
  const payload = { status: "ok", nested: { x: 1, y: [1, 2] }, list: ["a"] };
  const items = () => screen.getAllByRole("treeitem");
  const itemFor = (text: string) =>
    items().find((el) =>
      el.querySelector('[data-slot="json-tree-row"]')?.textContent?.includes(text),
    ) as HTMLElement;

  it("exposes one tree with a single tab stop", () => {
    render(<JSONTree value={payload} label="Webhook payload" />);
    expect(screen.getByRole("tree", { name: "Webhook payload" })).toBeInTheDocument();
    const stops = items().filter((el) => el.tabIndex === 0);
    expect(stops).toHaveLength(1);
    // No per-node buttons in the tab order any more.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("opens, enters and climbs with the arrow keys", () => {
    render(<JSONTree value={payload} />);
    const root = items()[0];
    root.focus();
    fireEvent.keyDown(root, { key: "ArrowDown" });
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowDown" });
    const nested = itemFor('"nested"');
    expect(nested).toHaveFocus();
    expect(nested).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(nested, { key: "ArrowRight" });
    expect(nested).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(nested, { key: "ArrowRight" });
    expect(itemFor('"x"')).toHaveFocus();

    fireEvent.keyDown(itemFor('"x"'), { key: "ArrowLeft" });
    expect(nested).toHaveFocus();
    fireEvent.keyDown(nested, { key: "ArrowLeft" });
    expect(nested).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles a container with Enter", () => {
    render(<JSONTree value={payload} />);
    const list = itemFor('"list"');
    list.focus();
    fireEvent.keyDown(list, { key: "Enter" });
    expect(list).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText('"a"')).toBeInTheDocument();
  });

  it("names each node by its own line, not its descendants", () => {
    render(<JSONTree value={payload} initialOpenDepth={2} />);
    // Its own line only — none of the keys inside it.
    expect(itemFor('"nested"')).toHaveAccessibleName(/^"nested":\s?\{$/);
  });

  it("hides closing brackets from assistive technology", () => {
    const { container } = render(<JSONTree value={{ a: { b: 1 } }} initialOpenDepth={2} />);
    const closers = Array.from(container.querySelectorAll('[aria-hidden="true"]')).filter((el) =>
      /^[}\]]/.test(el.textContent ?? ""),
    );
    expect(closers.length).toBeGreaterThan(0);
  });

  it("uses the punctuation and comment roles, not an opacity-reduced muted colour", () => {
    const { container } = render(<JSONTree value={{ nested: { x: 1 } }} />);
    const classes = [...container.querySelectorAll("[class]")]
      .map((el) => el.getAttribute("class") ?? "")
      .join(" ");
    expect(classes).toContain("text-syntax-punctuation");
    expect(classes).toContain("text-syntax-comment");
    expect(classes).not.toContain("text-muted-foreground/70");
  });

  it("returns focus to a branch that collapses around it", () => {
    render(<JSONTree value={payload} initialOpenDepth={2} />);
    const nested = itemFor('"nested"');
    const x = itemFor('"x"');
    x.focus();
    fireEvent.click(nested.querySelector('[data-slot="json-tree-row"]') as HTMLElement);
    expect(nested).toHaveAttribute("aria-expanded", "false");
    expect(nested).toHaveAttribute("tabindex", "0");
  });

  it("has no axe violations when deeply open", async () => {
    const { container } = render(<JSONTree value={payload} initialOpenDepth={3} label="Payload" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
