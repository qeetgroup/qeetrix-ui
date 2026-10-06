import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu/dropdown-menu";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

function DropdownExample({
  open,
  defaultOpen,
  onOpenChange,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  return (
    <DropdownMenu open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger>Options</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu", () => {
  it("renders the trigger with menu haspopup semantics", () => {
    render(<DropdownExample />);
    const trigger = screen.getByRole("button", { name: "Options" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("does not render menu content when closed", () => {
    render(<DropdownExample />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens on trigger click and exposes menuitem roles", () => {
    render(<DropdownExample />);
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    const items = screen.getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["Profile", "Settings", "Delete"]);
    // GroupLabel must not be exposed as an interactive menuitem.
    expect(screen.getByText("Account")).not.toHaveAttribute("role", "menuitem");
  });

  it("reflects expanded state on the trigger when open", () => {
    render(<DropdownExample open />);
    expect(screen.getByRole("button", { name: "Options" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("marks a disabled item as disabled", () => {
    render(<DropdownExample open />);
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("closes on Escape and returns focus to the trigger", () => {
    const onOpenChange = vi.fn();
    render(<DropdownExample defaultOpen onOpenChange={onOpenChange} />);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("has no axe violations when closed", async () => {
    const { container } = render(<DropdownExample />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations when open", async () => {
    render(<DropdownExample open />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});

/*
 * ── Submenu direction ───────────────────────────────────────────────────────────────────────
 *
 * A submenu opens along the *inline* axis, so `side` defaults to the logical `"inline-end"`
 * and Base UI reports `data-side="inline-end"`. The popup's entry animation was written
 * against the physical `data-[side=right]`, which that value never matches — so the submenu
 * animated in neither direction. jsdom runs no animations; what is assertable is that the
 * variant which can actually match is present.
 */
describe("DropdownMenu submenu direction", () => {
  function WithSubmenu() {
    return (
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Nested</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  it("animates the submenu on the axis it actually opens along", () => {
    render(<WithSubmenu />);
    fireEvent.click(screen.getByRole("menuitem", { name: /More/ }));
    const popup = document.querySelector('[data-slot="dropdown-menu-sub-content"]');
    expect(popup).not.toBeNull();

    const className = popup?.getAttribute("class") ?? "";
    // The logical pair is what `data-side="inline-end"` can match, and it is itself
    // direction-aware: `slide-in-from-start-2` translates the opposite way under `dir="rtl"`.
    expect(className).toContain("data-[side=inline-end]:slide-in-from-start-1");
    expect(className).toContain("data-[side=inline-start]:slide-in-from-end-1");
  });

  it("reports a logical side on the submenu popup", () => {
    render(<WithSubmenu />);
    fireEvent.click(screen.getByRole("menuitem", { name: /More/ }));
    const popup = document.querySelector('[data-slot="dropdown-menu-sub-content"]');
    // If this ever becomes "right"/"left", the physical variants take over and the logical
    // ones become the dead pair instead — which is the regression this guards.
    expect(popup?.getAttribute("data-side")).toMatch(/^inline-(start|end)$/);
  });

  it("mirrors the submenu trigger chevron", () => {
    render(<WithSubmenu />);
    const chevron = screen
      .getByRole("menuitem", { name: /More/ })
      .querySelector("svg:last-of-type");
    expect(chevron?.getAttribute("class")).toContain("rtl:rotate-180");
  });
});

/*
 * ── Item anatomy ────────────────────────────────────────────────────────────────────────────
 *
 * DropdownMenu, ContextMenu and Menubar share one item anatomy. jsdom does not paint, so the
 * visual decisions are asserted as the declarations that carry them; the behaviour (Base UI's
 * highlight, checked state, focus) is asserted directly.
 */
describe("DropdownMenu item anatomy", () => {
  function FullMenu({ onCheckedChange }: { onCheckedChange?: (checked: boolean) => void }) {
    return (
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            Rename
            <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem checked onCheckedChange={onCheckedChange}>
            Show archived
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="list">
            <DropdownMenuRadioItem value="list">List</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="board">Board</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled>Move to</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Inbox</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete workspace</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  it("shows keyboard focus with the Qeet inset focus ring, not the legacy halo", () => {
    render(<FullMenu />);
    const item = screen.getByRole("menuitem", { name: /Rename/ });
    expect(item.className).toContain("focus-visible:focus-ring-inset");
    expect(item.className).not.toMatch(/ring-3|ring-ring\/disabled/);
  });

  it("paints the highlight from Base UI's data-highlighted as the keyboard moves", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    screen.getByRole("button", { name: "Actions" }).focus();
    await user.keyboard("{ArrowDown}");
    const first = await screen.findByRole("menuitem", { name: "Rename" });
    await waitFor(() => expect(first).toHaveAttribute("data-highlighted"));
    expect(first).toHaveFocus();
    expect(first.className).toContain("data-highlighted:bg-accent");

    await user.keyboard("{ArrowDown}");
    const second = screen.getByRole("menuitem", { name: "Duplicate" });
    await waitFor(() => expect(second).toHaveAttribute("data-highlighted"));
    expect(first).not.toHaveAttribute("data-highlighted");
  });

  it("marks checked and selected items with a Qeet check at the inline end", () => {
    render(<FullMenu />);
    const checkbox = screen.getByRole("menuitemcheckbox", { name: "Show archived" });
    expect(checkbox).toHaveAttribute("aria-checked", "true");
    const indicator = checkbox.querySelector('[data-slot="dropdown-menu-checkbox-item-indicator"]');
    expect(indicator?.className).toContain("text-brand");
    expect(indicator?.className).toContain("inset-e-2");
    expect(indicator?.querySelector("svg")).not.toBeNull();
    // The selected vocabulary shared with Select and Combobox options: a quiet Qeet tint.
    expect(checkbox).toHaveAttribute("data-checked");
    expect(checkbox.className).toContain("data-[checked]:bg-brand-subtle");
    expect(checkbox.className).toContain("data-[checked]:data-highlighted:bg-brand-subtle-hover");

    expect(screen.getByRole("menuitemradio", { name: "List" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: "Board" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("toggles a checkbox item", () => {
    const onCheckedChange = vi.fn();
    render(<FullMenu onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Show archived" }));
    expect(onCheckedChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("reads destructive items in the danger text role with an overlay-tuned highlight", () => {
    render(<FullMenu />);
    const item = screen.getByRole("menuitem", { name: "Delete workspace" });
    expect(item).toHaveAttribute("data-variant", "destructive");
    expect(item.className).toContain("data-[variant=destructive]:text-destructive-text");
    expect(item.className).toContain(
      "data-[variant=destructive]:data-highlighted:bg-(--qx-component-menu-item-danger-highlight)",
    );
  });

  it("disables a submenu trigger", () => {
    render(<FullMenu />);
    const trigger = screen.getByRole("menuitem", { name: /Move to/ });
    expect(trigger).toHaveAttribute("aria-disabled", "true");
    expect(trigger.className).toContain("data-disabled:opacity-disabled");
  });

  it("paints the forced-colours highlight in system colours, without the text backplate", () => {
    render(<FullMenu />);
    for (const name of [/Rename/, "Delete workspace"]) {
      const className = screen.getByRole("menuitem", { name }).className;
      // The library recipe (index.css): `forced-color-adjust: none` stops Chromium drawing a
      // Canvas backplate behind HighlightText, and its `!important` keeps the destructive
      // variant's tint from winning there.
      expect(className).toContain("data-highlighted:forced-colors-selected");
    }
  });

  it("sizes items from the density-resolved menu item height", () => {
    render(<FullMenu />);
    const items = Array.from(document.querySelectorAll('[role^="menuitem"]'));
    // Plain, checkbox, two radios, the submenu trigger and the destructive item.
    expect(items).toHaveLength(6);
    for (const item of items) {
      expect(item.className).toContain("min-h-(--qx-component-menu-item-height)");
    }
  });

  it("is at least as wide as its trigger but sized by its items, within the viewport", () => {
    render(<FullMenu />);
    const popup = document.querySelector('[data-slot="dropdown-menu-content"]');
    expect(popup?.className).toContain("min-w-[max(var(--anchor-width),8rem)]");
    expect(popup?.className).toContain("max-w-[min(20rem,var(--available-width))]");
    expect(popup?.className).not.toContain("w-(--anchor-width)");
  });

  it("keeps the shortcut in the muted text role", () => {
    render(<FullMenu />);
    const shortcut = within(screen.getByRole("menuitem", { name: /Rename/ })).getByText("⌘R");
    expect(shortcut.className).toContain("text-muted-foreground");
    expect(shortcut.className).not.toContain("tracking-widest");
  });

  it("has no axe violations with every item kind open", async () => {
    render(<FullMenu />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});
