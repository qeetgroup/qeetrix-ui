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
