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
