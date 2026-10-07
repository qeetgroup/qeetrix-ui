import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/Drawer/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover/popover";
import tokens from "@/styles/tokens.json";

const a11y = (c: Element) =>
  axe(c, {
    rules: { "color-contrast": { enabled: false }, "aria-command-name": { enabled: false } },
  });

function DialogExample({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>Open dialog</DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>Are you sure you want to proceed?</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type="button">Cancel</button>
          <button type="button">Confirm</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The stacking ladder, from the generated token file (`--qx-z-*`). */
const Z = Object.fromEntries(
  Object.entries(tokens.light.z).map(([layer, value]) => [layer, Number(value)]),
);

describe("Dialog", () => {
  it("renders the trigger button", () => {
    render(<DialogExample />);
    expect(screen.getByRole("button", { name: "Open dialog" })).toBeInTheDocument();
  });

  it("renders dialog content when open=true", () => {
    render(<DialogExample open />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm action")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to proceed?")).toBeInTheDocument();
  });

  it("does not render dialog content when closed", () => {
    render(<DialogExample open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens on trigger click (uncontrolled)", () => {
    render(<DialogExample />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onOpenChange when Escape is pressed", () => {
    const onOpenChange = vi.fn();
    render(<DialogExample open onOpenChange={onOpenChange} />);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("has no axe violations when open", async () => {
    render(<DialogExample open />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });

  // ── Reflow and stacking ──────────────────────────────────────────────────────────────────
  // jsdom performs no layout, so these assert the declarations that make long content
  // reachable at 200% zoom or on a short viewport. Verifying the reflow itself needs a
  // browser; the regression these guard against is the declaration going missing.

  it("bounds its height to the viewport and scrolls its own content", () => {
    render(<DialogExample open />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-h-[calc(100dvh-2rem)]");
    expect(dialog.className).toContain("overflow-y-auto");
  });

  it("sits on the named modal layer rather than an ad-hoc z-index", () => {
    render(<DialogExample open />);
    expect(screen.getByRole("dialog").className).toContain("z-(--qx-z-modal)");
    const backdrop = document.querySelector('[data-slot="dialog-overlay"]');
    expect(backdrop?.className).toContain("z-(--qx-z-modal-backdrop)");
  });

  it("depends on a ladder that puts popovers above modals and modals above their backdrop", () => {
    // The mapping above is only correct while these hold: a Select, menu or Popover opened
    // from inside a dialog has to paint over it, and the backdrop has to stay behind its own
    // content. Asserted here because the classes alone cannot show it.
    expect(Z.popover).toBeGreaterThan(Z.modal);
    expect(Z.modal).toBeGreaterThan(Z["modal-backdrop"]);
    expect(Z.drawer).toBeGreaterThan(Z["drawer-backdrop"]);
  });

  it("dismisses only the popover opened inside it, then only itself", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Nested</DialogTitle>
          <Popover>
            <PopoverTrigger>Open popover</PopoverTrigger>
            <PopoverContent>Popover body</PopoverContent>
          </Popover>
        </DialogContent>
      </Dialog>,
    );

    const trigger = screen.getByRole("button", { name: "Open popover" });
    await user.click(trigger);
    expect(await screen.findByText("Popover body")).toBeInTheDocument();

    // First Escape closes the innermost surface and returns focus to its trigger, which is
    // inside the dialog — the dialog itself stays open.
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Popover body")).not.toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());

    // The second Escape reaches the dialog.
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  // ── Focus ────────────────────────────────────────────────────────────────────────────────

  it("moves focus into the dialog on open and returns it to the trigger on close", async () => {
    const user = userEvent.setup();
    render(<DialogExample />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });

    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  // ── Surface, sizing and long content ─────────────────────────────────────────────────────

  it("paints the scrim and surface from the dialog component tokens", () => {
    render(<DialogExample open />);
    const backdrop = document.querySelector('[data-slot="dialog-overlay"]');
    expect(backdrop?.className).toContain("bg-(--qx-component-dialog-scrim)");
    expect(backdrop?.className).not.toMatch(/bg-black/);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("bg-(--qx-component-dialog-background)");
    expect(dialog.className).toContain("shadow-(--qx-component-dialog-elevation)");
  });

  it("keeps a gutter on narrow screens and steps its width with `size`", () => {
    const { rerender } = render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Sized</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("w-[calc(100%-2rem)]");
    expect(dialog).toHaveAttribute("data-size", "default");
    expect(dialog.className).toContain("max-w-lg");

    rerender(
      <Dialog open>
        <DialogContent size="xl">
          <DialogTitle>Sized</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("data-size", "xl");
    expect(screen.getByRole("dialog").className).toContain("max-w-4xl");
    expect(screen.getByRole("dialog").className).not.toContain("max-w-lg");
  });

  it("scrolls long content in DialogBody so the header and footer stay pinned", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit log</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p>Long content</p>
          </DialogBody>
          <DialogFooter>
            <button type="button">Done</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    const body = document.querySelector('[data-slot="dialog-body"]');
    // A flex column whose body may shrink below its content height is what pins the rest.
    expect(screen.getByRole("dialog").className).toContain("flex-col");
    expect(body?.className).toContain("overflow-y-auto");
    expect(body?.className).toContain("min-h-0");
    expect(body?.className).toContain("flex-1");
  });

  it("keeps a long title clear of the close button only when the button is shown", () => {
    const { rerender } = render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              A very long title that would otherwise run under the close button
            </DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByRole("dialog").className).toContain("*:data-[slot=dialog-header]:pe-8");

    rerender(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog").className).not.toContain("pe-8");
  });

  // ── Nesting ──────────────────────────────────────────────────────────────────────────────
  // jsdom does not paint, so these assert the mechanism: Base UI marks the nested popup, the
  // popup lifts itself onto the drawer layer, and the nested backdrop is rendered (Base UI omits
  // it by default) so the parent is dimmed. The `has-[~[data-nested]]` lift on that backdrop is
  // a sibling selector only a browser evaluates.

  it("lifts a dialog opened from a Sheet above the sheet and dims the sheet", () => {
    render(
      <Sheet open>
        <SheetContent showCloseButton={false}>
          <SheetTitle>Invoice INV-2041</SheetTitle>
          <Dialog open>
            <DialogContent showCloseButton={false}>
              <DialogTitle>Void this invoice?</DialogTitle>
            </DialogContent>
          </Dialog>
        </SheetContent>
      </Sheet>,
    );
    const nested = screen.getByRole("dialog", { name: "Void this invoice?" });
    expect(nested).toHaveAttribute("data-nested");
    expect(nested.className).toContain("data-nested:z-(--qx-z-drawer)");
    expect(Z.drawer).toBeGreaterThan(Z.modal);

    const backdrop = document.querySelector('[data-slot="dialog-overlay"]');
    expect(backdrop).toBeInTheDocument();
    expect(backdrop?.className).toContain("has-[~[data-nested]]:z-(--qx-z-drawer)");
  });
});
