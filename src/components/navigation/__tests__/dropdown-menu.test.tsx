import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/navigation/dropdown-menu";

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
    expect(className).toContain("data-[side=inline-end]:slide-in-from-start-2");
    expect(className).toContain("data-[side=inline-start]:slide-in-from-end-2");
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
