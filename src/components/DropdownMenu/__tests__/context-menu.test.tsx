import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
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

describe("ContextMenu item anatomy", () => {
  function CheckableMenu() {
    return (
      <ContextMenu>
        <ContextMenuTrigger className="block h-24 w-48">Right-click me</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuCheckboxItem checked inset>
            Word wrap
          </ContextMenuCheckboxItem>
          <ContextMenuRadioGroup value="utf8">
            <ContextMenuRadioItem value="utf8">UTF-8</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  it("puts the checked indicator at the inline end, like DropdownMenu and Select", () => {
    render(<CheckableMenu />);
    fireEvent.contextMenu(screen.getByText("Right-click me"));
    const checkbox = screen.getByRole("menuitemcheckbox", { name: "Word wrap" });
    expect(checkbox).toHaveAttribute("aria-checked", "true");
    const indicator = checkbox.querySelector('[data-slot="context-menu-checkbox-item-indicator"]');
    expect(indicator?.className).toContain("inset-e-2");
    expect(indicator?.className).toContain("text-brand");
    const radio = screen.getByRole("menuitemradio", { name: "UTF-8" });
    expect(radio.querySelector('[data-slot="context-menu-radio-item-indicator"]')).not.toBeNull();
  });

  it("accepts `inset` on checkable items", () => {
    render(<CheckableMenu />);
    fireEvent.contextMenu(screen.getByText("Right-click me"));
    expect(screen.getByRole("menuitemcheckbox", { name: "Word wrap" })).toHaveAttribute(
      "data-inset",
    );
  });

  it("uses the shared surface, focus ring and danger role", () => {
    render(<CheckableMenu />);
    fireEvent.contextMenu(screen.getByText("Right-click me"));
    const popup = document.querySelector('[data-slot="context-menu-content"]');
    expect(popup?.className).toContain("border-(--qx-component-menu-border)");
    expect(popup?.className).not.toMatch(/(^|\s)ring-1(\s|$)/);
    const item = screen.getByRole("menuitem", { name: "Delete" });
    expect(item.className).toContain("focus-visible:focus-ring-inset");
    expect(item.className).toContain("data-[variant=destructive]:text-destructive-text");
  });
});
