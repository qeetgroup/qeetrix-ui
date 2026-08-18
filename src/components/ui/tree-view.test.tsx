import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { type TreeNode, TreeView } from "@/components/ui/tree-view";

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
