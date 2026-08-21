import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { TableOfContents } from "@/components/navigation/table-of-contents";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const ITEMS = [
  { id: "intro", label: "Introduction" },
  { id: "usage", label: "Usage" },
];

describe("TableOfContents", () => {
  it("renders a navigation landmark with links", () => {
    render(<TableOfContents items={ITEMS} />);
    expect(screen.getByRole("navigation", { name: "Table of contents" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Usage" })).toHaveAttribute("href", "#usage");
  });

  it("marks the active item with aria-current", () => {
    render(<TableOfContents items={ITEMS} activeId="usage" />);
    expect(screen.getByRole("link", { name: "Usage" })).toHaveAttribute("aria-current", "location");
  });

  it("has no axe violations", async () => {
    const { container } = render(<TableOfContents items={ITEMS} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
