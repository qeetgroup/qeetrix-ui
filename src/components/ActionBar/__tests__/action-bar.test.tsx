import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  ActionBar,
  ActionBarItem,
  ActionBarSelection,
  ActionBarSeparator,
} from "@/components/ActionBar/action-bar";

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

describe("ActionBar keyboard", () => {
  it("is a real toolbar: one tab stop, arrows move between actions and wrap", async () => {
    const user = userEvent.setup();
    render(
      <ActionBar open selectionCount={2} onClearSelection={() => {}}>
        <ActionBarItem>Export</ActionBarItem>
        <ActionBarItem variant="destructive">Delete</ActionBarItem>
      </ActionBar>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Clear selection" })).toHaveFocus();
    const stops = screen.getAllByRole("button").filter((b) => b.tabIndex === 0);
    expect(stops).toHaveLength(1);
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Export" })).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("button", { name: "Clear selection" })).toHaveFocus();
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it("forwards Button behaviour through the toolbar part", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ActionBar open>
        <ActionBarItem onClick={onClick}>Export</ActionBarItem>
        <ActionBarItem loading>Archive</ActionBarItem>
      </ActionBar>,
    );
    await user.click(screen.getByRole("button", { name: "Export" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    const archive = screen.getByRole("button", { name: "Archive" });
    expect(archive).toHaveAttribute("aria-busy", "true");
    expect(archive).toHaveAttribute("data-slot", "action-bar-item");
  });
});

describe("ActionBar parts", () => {
  it("offers an icon-only item size", () => {
    render(
      <ActionBar open>
        <ActionBarItem size="icon-sm" aria-label="More actions">
          <svg aria-hidden />
        </ActionBarItem>
      </ActionBar>,
    );
    expect(screen.getByRole("button", { name: "More actions" })).toHaveAttribute(
      "data-size",
      "icon-sm",
    );
  });

  it("renders its parts outside an ActionBar without throwing", () => {
    const onClear = vi.fn();
    render(
      <div role="toolbar" aria-label="Custom">
        <ActionBarSelection count={4} onClear={onClear} />
        <ActionBarSeparator />
        <ActionBarItem>Export</ActionBarItem>
      </div>,
    );
    expect(screen.getByText("4 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClear).toHaveBeenCalled();
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("floats on the overlay surface and scrolls instead of running off a narrow screen", () => {
    const { container } = render(
      <ActionBar open>
        <ActionBarItem>Export</ActionBarItem>
      </ActionBar>,
    );
    const bar = container.querySelector('[data-slot="action-bar"]');
    expect(bar).toHaveClass("bg-surface-overlay", "shadow-popover", "overflow-x-auto");
    expect(bar).toHaveAttribute("data-open");
  });
});
