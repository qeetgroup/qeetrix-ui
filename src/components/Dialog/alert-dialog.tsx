"use client";

import { Dialog as AlertDialogPrimitive } from "@base-ui/react/dialog";
import type * as React from "react";
import { Button } from "@/components/Button/button";
import { cn } from "@/lib/utils";

/**
 * An alert dialog interrupts to ask for a decision, so it is dismissed by a decision.
 *
 * Pointer dismissal is off by default: a stray click on the backdrop must not count as "Cancel"
 * on a destructive confirmation. Escape still closes it, as the APG alertdialog pattern
 * requires. Pass `disablePointerDismissal={false}` to opt back in.
 */
function AlertDialog({
  disablePointerDismissal = true,
  ...props
}: AlertDialogPrimitive.Root.Props) {
  return (
    <AlertDialogPrimitive.Root
      data-slot="alert-dialog"
      disablePointerDismissal={disablePointerDismissal}
      {...props}
    />
  );
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({ className, ...props }: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      // Rendered when nested too, and lifted to the drawer layer then, so a confirmation opened
      // from a Sheet paints above it and dims it. See DialogOverlay.
      forceRender
      className={cn(
        "fixed inset-0 z-(--qx-z-modal-backdrop) bg-(--qx-component-dialog-scrim) transition-opacity duration-normal ease-standard has-[~[data-nested]]:z-(--qx-z-drawer) data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-fast",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogContent({ className, children, ...props }: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        // Base UI's Dialog popup renders role="dialog". The APG alert-dialog pattern needs
        // role="alertdialog" so assistive technology announces it as requiring a response before
        // the user can continue — which is the whole difference between this and Dialog.
        role="alertdialog"
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-(--qx-z-modal) flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto overscroll-contain rounded-(--qx-component-dialog-corner) border border-(--qx-component-dialog-border) bg-(--qx-component-dialog-background) bg-clip-padding p-6 text-sm text-(--qx-component-dialog-foreground) shadow-(--qx-component-dialog-elevation) transition-[opacity,scale] duration-normal ease-enter data-nested:z-(--qx-z-drawer) data-starting-style:scale-97 data-starting-style:opacity-0 data-ending-style:scale-97 data-ending-style:opacity-0 data-ending-style:duration-fast data-ending-style:ease-exit",
          className,
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-1.5 text-start", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      // Write Cancel first: it is then the first tab stop and the element Base UI focuses on
      // open — the least destructive choice, per the APG — while this row order still puts the
      // committing action on the inline-end side, and on top when the buttons stack.
      className={cn("mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "font-heading text-heading font-semibold tracking-(--qx-typography-heading-letter-spacing) text-pretty text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-pretty text-muted-foreground", className)}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-action"
      render={<Button variant={variant} className={className} {...props} />}
    />
  );
}

function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      render={<Button variant="outline" className={className} {...props} />}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
};
