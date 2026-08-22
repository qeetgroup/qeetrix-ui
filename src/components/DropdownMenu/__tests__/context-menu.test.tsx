import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/DropdownMenu/context-menu";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

function ContextMenuExample({ onOpenChange }: { onOpenChange?: (v: boolean) => void }) {
  return (
    <ContextMenu onOpenChange={onOpenChange}>
      <ContextMenuTrigger className="block h-24 w-48">Right-click me</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Back</ContextMenuItem>
        <ContextMenuItem>Reload</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled>Save as…</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

describe("ContextMenu", () => {
  it("renders the trigger region", () => {
    render(<ContextMenuExample />);
    expect(screen.getByText("Right-click me")).toBeInTheDocument();
  });

  it("does not render menu content until invoked", () => {
    render(<ContextMenuExample />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens on right-click (contextmenu) with menuitem roles", () => {
    render(<ContextMenuExample />);
    fireEvent.contextMenu(screen.getByText("Right-click me"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    const items = screen.getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["Back", "Reload", "Save as…"]);
    expect(screen.getByRole("menuitem", { name: "Save as…" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("requests close on Escape", () => {
    const onOpenChange = vi.fn();
    render(<ContextMenuExample onOpenChange={onOpenChange} />);
    fireEvent.contextMenu(screen.getByText("Right-click me"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("has no axe violations when closed", async () => {
    const { container } = render(<ContextMenuExample />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations when open", async () => {
    render(<ContextMenuExample />);
    fireEvent.contextMenu(screen.getByText("Right-click me"));
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});
