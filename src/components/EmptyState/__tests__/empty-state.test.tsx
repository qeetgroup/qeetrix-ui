import { InboxIcon } from "@qeetrix/icons/icons/inbox";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { EmptyState } from "@/components/EmptyState/empty-state";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

const iconTile = (c: HTMLElement) => c.querySelector('[data-slot="empty-state-icon"]');

describe("EmptyState", () => {
  it("renders title, description and action", () => {
    render(
      <EmptyState
        title="No results"
        description="Try adjusting your filters."
        action={<button type="button">Reset</button>}
      />,
    );
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Try adjusting your filters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("keeps the default neutral, with no glyph unless one is given", () => {
    const { container, rerender } = render(<EmptyState title="Empty" />);
    expect(iconTile(container)).toBeNull();
    rerender(<EmptyState icon={InboxIcon} title="Empty" />);
    expect(iconTile(container)).toHaveClass("bg-surface-sunken", "text-muted-foreground");
    expect(iconTile(container)).toHaveAttribute("aria-hidden", "true");
  });

  it.each([
    ["first-use", "bg-brand-subtle", false],
    ["no-results", "bg-surface-sunken", true],
    ["no-permission", "bg-surface-sunken", true],
    ["error", "bg-destructive-subtle", true],
  ] as const)("%s sets the tile tone and its default glyph", (variant, tone, hasDefault) => {
    const { container } = render(<EmptyState variant={variant} title="t" />);
    expect(container.querySelector('[data-slot="empty-state"]')).toHaveAttribute(
      "data-variant",
      variant,
    );
    const tile = iconTile(container);
    if (hasDefault) {
      expect(tile).toHaveClass(tone);
      expect(tile?.querySelector("svg")).not.toBeNull();
    } else {
      expect(tile).toBeNull();
    }
  });

  it("uses the brand tint only for first use, and only on the tile", () => {
    const { container } = render(<EmptyState variant="first-use" icon={InboxIcon} title="t" />);
    expect(iconTile(container)).toHaveClass("bg-brand-subtle", "text-brand");
    expect(screen.getByText("t")).toHaveClass("text-foreground");
  });

  it("hides a default glyph with icon={null}", () => {
    const { container } = render(<EmptyState variant="error" icon={null} title="Failed" />);
    expect(iconTile(container)).toBeNull();
  });

  it("has a compact size for tables and panels", () => {
    const { container } = render(<EmptyState size="sm" title="Nothing" />);
    const root = container.querySelector('[data-slot="empty-state"]');
    expect(root).toHaveAttribute("data-size", "sm");
    expect(root).toHaveClass("py-6");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <>
        <EmptyState title="No results" description="Nothing here yet." />
        <EmptyState variant="first-use" icon={InboxIcon} title="Start" />
        <EmptyState variant="no-permission" title="No access" />
        <EmptyState variant="error" size="sm" title="Failed" />
      </>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
