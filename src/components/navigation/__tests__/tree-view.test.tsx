import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { type TreeNode, TreeView } from "@/components/navigation/tree-view";
import { DirectionProvider } from "@/providers/direction-provider";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

const data: TreeNode[] = [
  {
    id: "src",
    label: "src",
    defaultOpen: true,
    children: [
      { id: "index", label: "index.ts" },
      { id: "app", label: "app.tsx" },
    ],
  },
  { id: "readme", label: "README.md" },
];

describe("TreeView", () => {
  it("exposes the tree role", () => {
    render(<TreeView data={data} />);
    expect(screen.getByRole("tree")).toBeInTheDocument();
  });

  it("renders treeitems and a group for expanded branches", () => {
    render(<TreeView data={data} />);
    // src (branch, open) + index.ts + app.tsx + README.md
    expect(screen.getAllByRole("treeitem")).toHaveLength(4);
    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("marks branch nodes with aria-expanded reflecting their state", () => {
    render(<TreeView data={data} />);
    const branch = screen.getAllByRole("treeitem").find((el) => el.hasAttribute("aria-expanded"));
    expect(branch).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses a branch when its toggle is activated", () => {
    render(<TreeView data={data} />);
    expect(screen.getByText("index.ts")).toBeInTheDocument();
    fireEvent.click(screen.getByText("src"));
    expect(screen.queryByText("index.ts")).not.toBeInTheDocument();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    const branch = screen.getAllByRole("treeitem").find((el) => el.hasAttribute("aria-expanded"));
    expect(branch).toHaveAttribute("aria-expanded", "false");
  });

  it("expands a collapsed branch again", () => {
    render(<TreeView data={data} />);
    const toggle = screen.getByText("src");
    fireEvent.click(toggle); // collapse
    expect(screen.queryByText("app.tsx")).not.toBeInTheDocument();
    fireEvent.click(toggle); // expand
    expect(screen.getByText("app.tsx")).toBeInTheDocument();
  });

  it("uses one roving tab stop across visible treeitems", () => {
    render(<TreeView data={data} />);
    const items = screen.getAllByRole("treeitem");

    expect(items[0]).toHaveAttribute("tabindex", "0");
    expect(items.slice(1).every((item) => item.tabIndex === -1)).toBe(true);

    items[0].focus();
    fireEvent.keyDown(items[0], { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();

    fireEvent.keyDown(items[1], { key: "End" });
    expect(items[3]).toHaveFocus();

    fireEvent.keyDown(items[3], { key: "Home" });
    expect(items[0]).toHaveFocus();
  });

  it("implements branch and parent navigation with ArrowLeft and ArrowRight", () => {
    render(<TreeView data={data} />);
    let items = screen.getAllByRole("treeitem");

    items[0].focus();
    fireEvent.keyDown(items[0], { key: "ArrowLeft" });
    expect(items[0]).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("index.ts")).not.toBeInTheDocument();

    fireEvent.keyDown(items[0], { key: "ArrowRight" });
    expect(items[0]).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(items[0], { key: "ArrowRight" });
    items = screen.getAllByRole("treeitem");
    expect(items[1]).toHaveFocus();

    fireEvent.keyDown(items[1], { key: "ArrowLeft" });
    expect(items[0]).toHaveFocus();
  });

  it("has no axe violations", async () => {
    const { container } = render(<TreeView data={data} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/*
 * ── Direction ───────────────────────────────────────────────────────────────────────────────
 *
 * jsdom does no layout, so the *mirroring* of the indent and the chevron cannot be observed
 * here. What can be, and what these pin, is the key mapping (which is behaviour, not styling)
 * and the utility classes emitted for the glyph. Whether `rtl:rotate-180` actually turns the
 * chevron needs a browser — `TEST-001`.
 */
describe("TreeView direction", () => {
  const branch = () =>
    screen.getAllByRole("treeitem").find((el) => el.hasAttribute("aria-expanded")) as HTMLElement;

  it("reports the resolved direction on the tree", () => {
    const { container } = render(
      <DirectionProvider direction="rtl">
        <TreeView data={data} />
      </DirectionProvider>,
    );
    expect(container.querySelector('[role="tree"]')).toHaveAttribute("data-direction", "rtl");
  });

  it("mirrors expand/collapse: ArrowLeft expands and ArrowRight collapses in rtl", () => {
    // The APG puts expand/collapse on the inline axis, so both keys swap under `dir="rtl"`.
    // Before this, an Arabic user pressing ArrowLeft on an open node walked to its parent.
    render(
      <DirectionProvider direction="rtl">
        <TreeView data={data} />
      </DirectionProvider>,
    );
    const first = screen.getAllByRole("treeitem")[0];
    first.focus();

    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(branch()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("index.ts")).not.toBeInTheDocument();

    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(branch()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("index.ts")).toBeInTheDocument();
  });

  it("mirrors the descend/ascend half of the mapping too", () => {
    render(
      <DirectionProvider direction="rtl">
        <TreeView data={data} />
      </DirectionProvider>,
    );
    let items = screen.getAllByRole("treeitem");
    items[0].focus();

    // Already open: the inline-end key descends into the first child.
    fireEvent.keyDown(items[0], { key: "ArrowLeft" });
    items = screen.getAllByRole("treeitem");
    expect(items[1]).toHaveFocus();

    // …and the inline-start key climbs back to the parent.
    fireEvent.keyDown(items[1], { key: "ArrowRight" });
    expect(items[0]).toHaveFocus();
  });

  it("does not mirror the block axis", () => {
    render(
      <DirectionProvider direction="rtl">
        <TreeView data={data} />
      </DirectionProvider>,
    );
    const items = screen.getAllByRole("treeitem");
    items[0].focus();
    fireEvent.keyDown(items[0], { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(items[1], { key: "ArrowUp" });
    expect(items[0]).toHaveFocus();
  });

  it("resolves rtl from <html dir> when there is no provider", () => {
    document.documentElement.setAttribute("dir", "rtl");
    try {
      render(<TreeView data={data} />);
      const first = screen.getAllByRole("treeitem")[0];
      first.focus();
      fireEvent.keyDown(first, { key: "ArrowRight" });
      expect(branch()).toHaveAttribute("aria-expanded", "false");
    } finally {
      document.documentElement.removeAttribute("dir");
    }
  });

  it("keeps the ltr mapping when nothing declares a direction", () => {
    render(<TreeView data={data} />);
    const first = screen.getAllByRole("treeitem")[0];
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(branch()).toHaveAttribute("aria-expanded", "false");
  });

  it("rotates the chevron for state, and mirrors it only when closed", () => {
    // Closed, the glyph points along the inline axis and must mirror. Open, it points down
    // in both directions — so the RTL flip must not compose with the 90° turn and leave it
    // pointing up.
    const { container } = render(<TreeView data={data} />);
    const open = container.querySelector('[data-slot="tree-item-row"] svg') as SVGElement;
    expect(open.getAttribute("class")).toContain("rotate-90");
    expect(open.getAttribute("class")).not.toContain("rtl:rotate-180");

    fireEvent.click(screen.getByText("src"));
    const closed = container.querySelector('[data-slot="tree-item-row"] svg') as SVGElement;
    expect(closed.getAttribute("class")).toContain("rtl:rotate-180");
    expect(closed.getAttribute("class")).not.toContain("rotate-90");
  });

  it("indents with a logical property, so nesting mirrors without JavaScript", () => {
    const { container } = render(<TreeView data={data} />);
    const rows = [...container.querySelectorAll<HTMLElement>('[data-slot="tree-item-row"]')];
    expect(rows[0].style.paddingInlineStart).toBe("0.5rem");
    expect(rows[1].style.paddingInlineStart).toBe("1.5rem");
    // Physical padding would not mirror; assert it is absent rather than trusting the above.
    expect(rows[1].style.paddingLeft).toBe("");
  });
});
