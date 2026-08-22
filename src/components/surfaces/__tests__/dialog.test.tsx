import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/surfaces/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/surfaces/popover";
import { Z_INDEX } from "@/lib/token-values";

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
    expect(Z_INDEX.popover).toBeGreaterThan(Z_INDEX.modal);
    expect(Z_INDEX.modal).toBeGreaterThan(Z_INDEX.modalBackdrop);
    expect(Z_INDEX.drawer).toBeGreaterThan(Z_INDEX.drawerBackdrop);
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
});
