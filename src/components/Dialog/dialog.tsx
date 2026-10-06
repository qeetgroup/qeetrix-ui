"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/Button/button";
import type { MessagesFor } from "@/lib/messages";
import { overlayMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/** The dialog root's props, including the `open` / `defaultOpen` / `onOpenChange` triple. */
type DialogProps = DialogPrimitive.Root.Props;

function Dialog({ ...props }: DialogProps) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      // Base UI skips the backdrop of a nested dialog. It is rendered anyway so the parent
      // dialog or sheet is dimmed behind the child, and — through the `has-[~[data-nested]]`
      // lift below — so a dialog opened from inside a Sheet is not painted under it: the modal
      // layer (1400) sits below the drawer layer (1600). Same z, later in the DOM, wins.
      forceRender
      className={cn(
        "fixed inset-0 z-(--qx-z-modal-backdrop) bg-(--qx-component-dialog-scrim) transition-opacity duration-normal ease-standard has-[~[data-nested]]:z-(--qx-z-drawer) data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-fast",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Dialog surface. Widths step on the Tailwind container scale and always leave a 1rem gutter,
 * so a dialog never touches the edges of a phone. `full` is for dense working surfaces — a
 * data grid, a diff, a policy editor — that need the whole viewport but should stay a dialog.
 */
const dialogContentVariants = cva(
  "fixed top-1/2 left-1/2 z-(--qx-z-modal) flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto overscroll-contain rounded-(--qx-component-dialog-corner) border border-(--qx-component-dialog-border) bg-(--qx-component-dialog-background) bg-clip-padding p-6 text-sm text-(--qx-component-dialog-foreground) shadow-(--qx-component-dialog-elevation) transition-[opacity,scale] duration-normal ease-enter data-nested:z-(--qx-z-drawer) data-starting-style:scale-97 data-starting-style:opacity-0 data-ending-style:scale-97 data-ending-style:opacity-0 data-ending-style:duration-fast data-ending-style:ease-exit",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        default: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        full: "h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)]",
      },
    },
    defaultVariants: { size: "default" },
  },
);

type DialogContentProps = DialogPrimitive.Popup.Props &
  VariantProps<typeof dialogContentVariants> & {
    showCloseButton?: boolean;
    /**
     * Overrides for this component's built-in English strings. Each key falls back to the
     * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
     */
    messages?: MessagesFor<"overlay">;
  };

function DialogContent({
  className,
  children,
  size = "default",
  showCloseButton = true,
  messages: messageOverrides,
  ...props
}: DialogContentProps) {
  const messages = useMessages("overlay", overlayMessages, messageOverrides);
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-size={size}
        className={cn(
          dialogContentVariants({ size }),
          // Keep a long title clear of the close button rather than running underneath it.
          showCloseButton && "*:data-[slot=dialog-header]:pe-8",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button variant="ghost" size="icon-sm" className="absolute inset-e-5.5 top-5.5" />
            }
          >
            <XIcon aria-hidden />
            <span className="sr-only">{messages.close}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 text-start", className)}
      {...props}
    />
  );
}

/**
 * The scrolling region of a dialog. Wrap long content in it and the header and footer stay
 * pinned — the primary action never scrolls out of reach. Without it the whole dialog scrolls,
 * which is still bounded to the viewport.
 */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        // Bleeds to the dialog edges so the scrollbar sits at the border, and keeps 4px of
        // block padding so a focused field's ring at the top or bottom is not clipped.
        "-mx-6 -my-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-1",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-heading font-semibold tracking-(--qx-typography-heading-letter-spacing) text-pretty text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-pretty text-muted-foreground", className)}
      {...props}
    />
  );
}

export type { DialogContentProps, DialogProps };
export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
