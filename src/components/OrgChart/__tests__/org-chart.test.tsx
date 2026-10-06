import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { OrgChart, type OrgNode } from "@/components/OrgChart/org-chart";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const DATA: OrgNode = {
  id: "ceo",
  label: "CEO",
  children: [
    { id: "cto", label: "CTO" },
    { id: "cfo", label: "CFO" },
  ],
};

describe("OrgChart", () => {
  it("renders the hierarchy", () => {
    render(<OrgChart data={DATA} />);
    expect(screen.getByText("CEO")).toBeInTheDocument();
    expect(screen.getByText("CTO")).toBeInTheDocument();
    expect(screen.getByText("CFO")).toBeInTheDocument();
  });

  it("collapses a branch", () => {
    render(<OrgChart data={DATA} />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse" }));
    expect(screen.queryByText("CTO")).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<OrgChart data={DATA} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("OrgChart for large hierarchies", () => {
  const ORG: OrgNode = {
    id: "ceo",
    label: "Priya",
    sublabel: "CEO",
    children: [
      {
        id: "cto",
        label: "Arjun",
        children: [
          { id: "a", label: "Sara" },
          { id: "b", label: "Kabir", children: [{ id: "c", label: "Dev" }] },
        ],
      },
      { id: "cfo", label: "Meera" },
    ],
  };

  it("describes each toggle by the node it belongs to", () => {
    render(<OrgChart data={ORG} />);
    const toggle = screen.getAllByRole("button", { name: "Collapse" })[0];
    expect(toggle).toHaveAccessibleDescription(/Priya/);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("opens a level at a time and counts what a collapsed branch holds", () => {
    render(<OrgChart data={ORG} initialOpenDepth={1} />);
    expect(screen.getByText("Arjun")).toBeInTheDocument();
    expect(screen.queryByText("Sara")).not.toBeInTheDocument();
    // Arjun's branch holds Sara, Kabir and Dev.
    const toggle = screen.getByRole("button", { name: "Expand" });
    expect(toggle).toHaveTextContent("3");
    fireEvent.click(toggle);
    expect(screen.getByText("Sara")).toBeInTheDocument();
  });

  it("emphasises the highlighted node", () => {
    const { container } = render(<OrgChart data={ORG} highlightedId="cto" />);
    const highlighted = container.querySelector('[data-slot="org-chart-node"][data-highlighted]');
    expect(highlighted).toHaveTextContent("Arjun");
    expect(highlighted).toHaveClass("border-border-brand", "bg-brand-subtle");
  });

  it("trims the sibling rail with logical insets, so it mirrors under rtl", () => {
    const { container } = render(<OrgChart data={ORG} />);
    const child = container.querySelector("ul ul > li") as HTMLElement;
    expect(child.className).toContain("first:after:inset-s-1/2");
    expect(child.className).toContain("last:after:inset-e-1/2");
    expect(child.className).not.toContain("after:left-0");
  });

  it("keeps a wide chart's start reachable by the scrollbar", () => {
    const { container } = render(<OrgChart data={ORG} />);
    expect(container.querySelector('[data-slot="org-chart"] > ul')).toHaveClass(
      "w-max",
      "min-w-full",
    );
  });

  it("has no axe violations with collapsed branches", async () => {
    const { container } = render(<OrgChart data={ORG} initialOpenDepth={1} highlightedId="cto" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
