import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

const a11y = (c: Element) =>
  axe(c, {
    rules: { "color-contrast": { enabled: false }, "aria-command-name": { enabled: false } },
  });

function AlertExample({ open }: { open?: boolean }) {
  return (
    <AlertDialog open={open}>
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
});
