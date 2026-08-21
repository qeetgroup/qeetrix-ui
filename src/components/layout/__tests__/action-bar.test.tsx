import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ActionBar, ActionBarItem } from "@/components/layout/action-bar";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("ActionBar", () => {
  it("renders with role='toolbar'", () => {
    render(
      <ActionBar open>
        <ActionBarItem>Delete</ActionBarItem>
      </ActionBar>,
    );
    expect(screen.getByRole("toolbar", { name: "Selection actions" })).toBeInTheDocument();
  });

  it("is aria-hidden when open=false", () => {
    const { container } = render(
      <ActionBar open={false}>
        <ActionBarItem>Delete</ActionBarItem>
      </ActionBar>,
    );
    const toolbar = container.querySelector('[data-slot="action-bar"]');
    expect(toolbar).toHaveAttribute("aria-hidden", "true");
  });

  it("makes closed actions inert", () => {
    const { container } = render(
      <ActionBar open={false}>
        <ActionBarItem>Delete</ActionBarItem>
      </ActionBar>,
    );

    expect(container.querySelector('[data-slot="action-bar"]')).toHaveAttribute("inert");
  });

  it("shows selection count text", () => {
    const onClearSelection = vi.fn();
    render(
      <ActionBar open selectionCount={3} onClearSelection={onClearSelection}>
        <ActionBarItem>Export</ActionBarItem>
      </ActionBar>,
    );
    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });

  it("clicking clear fires onClearSelection", () => {
    const onClearSelection = vi.fn();
    render(
      <ActionBar open selectionCount={3} onClearSelection={onClearSelection}>
        <ActionBarItem>Export</ActionBarItem>
      </ActionBar>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClearSelection).toHaveBeenCalled();
  });

  it("axe: no violations (open state)", async () => {
    const { container } = render(
      <ActionBar open selectionCount={2} onClearSelection={() => {}}>
        <ActionBarItem>Export</ActionBarItem>
        <ActionBarItem variant="destructive">Delete</ActionBarItem>
      </ActionBar>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
