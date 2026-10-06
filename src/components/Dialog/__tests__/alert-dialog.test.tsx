import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/Dialog/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/Dialog/dialog";

const a11y = (c: Element) =>
  axe(c, {
    rules: { "color-contrast": { enabled: false }, "aria-command-name": { enabled: false } },
  });

function AlertExample({
  open,
  onOpenChange,
  disablePointerDismissal,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disablePointerDismissal?: boolean;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      disablePointerDismissal={disablePointerDismissal}
    >
      <AlertDialogTrigger>Delete account</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("renders the trigger button", () => {
    render(<AlertExample />);
    expect(screen.getByRole("button", { name: "Delete account" })).toBeInTheDocument();
  });

  it("renders alert dialog content when open=true", () => {
    render(<AlertExample open />);
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(<AlertExample open={false} />);
    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
  });

  it("opens on trigger click (uncontrolled)", () => {
    render(<AlertExample />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    render(<AlertExample open />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });

  it("bounds its height to the viewport and scrolls its own content", () => {
    render(<AlertExample open />);
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.className).toContain("max-h-[calc(100dvh-2rem)]");
    expect(dialog.className).toContain("overflow-y-auto");
  });

  it("sits on the named modal layer rather than an ad-hoc z-index", () => {
    render(<AlertExample open />);
    expect(screen.getByRole("alertdialog").className).toContain("z-(--qx-z-modal)");
    const backdrop = document.querySelector('[data-slot="alert-dialog-overlay"]');
    expect(backdrop?.className).toContain("z-(--qx-z-modal-backdrop)");
  });

  // ── Intentional action ───────────────────────────────────────────────────────────────────
  // A stray click on the backdrop must not count as an answer. The Dialog case is the control:
  // it proves the same click does reach Base UI's outside-press handling in this environment.

  async function pressBackdrop(slot: string) {
    const user = userEvent.setup();
    const backdrop = document.querySelector(`[data-slot="${slot}"]`);
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as Element);
  }

  it("is not dismissed by a click on the backdrop", async () => {
    const onOpenChange = vi.fn();
    render(<AlertExample open onOpenChange={onOpenChange} />);
    await pressBackdrop("alert-dialog-overlay");
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("control: a plain Dialog is dismissed by the same click", async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Plain</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await pressBackdrop("dialog-overlay");
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("can opt back in to pointer dismissal", async () => {
    const onOpenChange = vi.fn();
    render(<AlertExample open onOpenChange={onOpenChange} disablePointerDismissal={false} />);
    await pressBackdrop("alert-dialog-overlay");
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("still closes on Escape, as the APG alertdialog pattern requires", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<AlertExample open onOpenChange={onOpenChange} />);
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("focuses the least destructive action first when Cancel is written first", async () => {
    const user = userEvent.setup();
    render(<AlertExample />);
    await user.click(screen.getByRole("button", { name: "Delete account" }));
    await screen.findByRole("alertdialog");
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
  });

  it("names and describes itself from its title and description", () => {
    render(<AlertExample open />);
    const dialog = screen.getByRole("alertdialog", { name: "Are you sure?" });
    expect(dialog).toHaveAccessibleDescription("This action cannot be undone.");
  });
});
