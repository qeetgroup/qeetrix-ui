import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer/drawer";

const a11y = (c: Element) =>
  axe(c, {
    rules: { "color-contrast": { enabled: false }, "aria-command-name": { enabled: false } },
  });

function DrawerExample({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger>Open drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Share</DrawerTitle>
          <DrawerDescription>Share this item with others.</DrawerDescription>
        </DrawerHeader>
        <p>Drawer body</p>
      </DrawerContent>
    </Drawer>
  );
}

describe("Drawer", () => {
  it("renders the trigger button", () => {
    render(<DrawerExample />);
    expect(screen.getByRole("button", { name: "Open drawer" })).toBeInTheDocument();
  });

  it("renders drawer content when open=true", () => {
    render(<DrawerExample open />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
    expect(screen.getByText("Drawer body")).toBeInTheDocument();
  });

  it("does not show content when closed", () => {
    render(<DrawerExample open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens on trigger click (uncontrolled)", () => {
    render(<DrawerExample />);
    fireEvent.click(screen.getByRole("button", { name: "Open drawer" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    render(<DrawerExample open />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });

  it("caps its height in dynamic viewport units so mobile browser chrome is accounted for", () => {
    render(<DrawerExample open />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-h-[85dvh]");
    expect(dialog.className).not.toContain("max-h-[85vh]");
    expect(dialog.className).toContain("overflow-y-auto");
  });

  // ── Gesture ──────────────────────────────────────────────────────────────────────────────
  // The grab handle used to promise a swipe that did not exist. Drawer is now Base UI's
  // Drawer, which dismisses on a downward swipe; jsdom cannot perform the gesture, so these
  // assert that the gesture machinery is wired and that it is never the only way out.

  it("is a swipe-to-dismiss drawer that swipes down by default", () => {
    render(<DrawerExample open />);
    expect(screen.getByRole("dialog")).toHaveAttribute("data-swipe-direction", "down");
  });

  it("tracks the swipe offset and drops its transition while being dragged", () => {
    render(<DrawerExample open />);
    const className = screen.getByRole("dialog").className;
    // Snap points rest the drawer at an offset; the swipe adds to it (integration pass).
    expect(className).toContain(
      "translate-y-[calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px))]",
    );
    expect(className).toContain("data-swiping:duration-0");
  });

  it("keeps the grab handle decorative, with a named close button and Escape as equivalents", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<DrawerExample open onOpenChange={onOpenChange} />);
    expect(document.querySelector('[data-slot="drawer-handle"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("sits on the named drawer layer and paints the shared scrim", () => {
    render(<DrawerExample open />);
    const viewport = document.querySelector('[data-slot="drawer-viewport"]');
    expect(viewport?.className).toContain("z-(--qx-z-drawer)");
    // The sheet-overlay slot is what base.css's forced-colors backdrop rule targets.
    const backdrop = document.querySelector('[data-slot="sheet-overlay"]');
    expect(backdrop?.className).toContain("z-(--qx-z-drawer-backdrop)");
    expect(backdrop?.className).toContain("bg-(--qx-component-dialog-scrim)");
  });

  it("clears the home indicator on phones", () => {
    render(<DrawerExample open />);
    expect(screen.getByRole("dialog").className).toContain("pb-[env(safe-area-inset-bottom)]");
  });
});
