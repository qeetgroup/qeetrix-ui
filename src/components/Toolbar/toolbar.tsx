"use client";

import { Toolbar as ToolbarPrimitive } from "@base-ui/react/toolbar";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { buttonVariants } from "@/components/Button/button";
import { cn } from "@/lib/utils";

/*
 * Toolbar items are Buttons in everything but their Base UI part: they take the Button family's
 * variants, sizes and interaction language (see button.tsx), so a toolbar and a dialog footer
 * press, focus and disable identically. A pressed item — a ToolbarButton rendering a Toggle, or
 * one carrying `aria-pressed` — takes the Qeet selected vocabulary, as Toggle does.
 */

const toolbarVariants = cva(
  [
    "flex min-w-0 max-w-full flex-wrap items-center gap-1",
    "data-[orientation=vertical]:w-fit data-[orientation=vertical]:flex-col data-[orientation=vertical]:flex-nowrap data-[orientation=vertical]:items-stretch",
  ],
  {
    variants: {
      variant: {
        // A bordered strip: an editor's formatting bar, a panel's action row. Items sit 4px in,
        // with corners concentric to the strip's.
        default:
          "rounded-(--qx-corner-surface) border border-border bg-surface p-1 [&_[data-slot=toolbar-button]]:rounded-md [&_[data-slot=toolbar-link]]:rounded-md",
        // No chrome: a table header, a card header, a page's action row — the surface it sits
        // on is the frame.
        ghost: "",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type ToolbarProps = ToolbarPrimitive.Root.Props & VariantProps<typeof toolbarVariants>;

/** Items that take part in the toolbar's roving focus, in DOM order. */
function toolbarItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[tabindex]")).filter(
    (el) => el.closest('[role="toolbar"]') === root && !el.matches(":disabled"),
  );
}

/**
 * Action bar for tables, editors, and detail views — buttons, links, separators.
 *
 * One tab stop; the arrow keys along the toolbar's axis move between items (mirrored under RTL,
 * by Base UI's composite) and wrap, and Home / End jump to the first and last item. Disabled
 * items stay focusable, as the APG asks of a toolbar, so a keyboard user can still discover
 * what is there.
 *
 * Wraps rather than overflowing in a narrow panel; `ToolbarSpacer` pushes what follows it to
 * the inline end — the "filters at the start, actions at the end" table header.
 */
function Toolbar({ className, variant = "default", onKeyDown, ...props }: ToolbarProps) {
  const handleKeyDown: NonNullable<ToolbarProps["onKeyDown"]> = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || (event.key !== "Home" && event.key !== "End")) return;
    const target = event.target as HTMLElement;
    // A text field inside the toolbar owns Home / End for its caret.
    if (target.matches("input, textarea, [contenteditable='true']")) return;
    const items = toolbarItems(event.currentTarget);
    const next = event.key === "Home" ? items[0] : items[items.length - 1];
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  return (
    <ToolbarPrimitive.Root
      data-slot="toolbar"
      data-variant={variant}
      className={cn(toolbarVariants({ variant }), className)}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

type ToolbarButtonProps = ToolbarPrimitive.Button.Props & VariantProps<typeof buttonVariants>;

/**
 * A toolbar action. Ghost by default — the toolbar is the chrome — with Button's `variant` and
 * `size` available for the one emphasised action (`variant="default"`) or an icon-only item
 * (`size="icon"`, with an `aria-label`).
 */
function ToolbarButton({
  className,
  variant = "ghost",
  size = "default",
  ...props
}: ToolbarButtonProps) {
  return (
    <ToolbarPrimitive.Button
      data-slot="toolbar-button"
      data-variant={variant}
      data-size={size}
      className={cn(
        buttonVariants({ variant, size }),
        "data-pressed:bg-brand-subtle data-pressed:text-foreground data-pressed:inset-ring data-pressed:inset-ring-border-brand data-pressed:hover:bg-brand-subtle-hover",
        "aria-pressed:bg-brand-subtle aria-pressed:text-foreground aria-pressed:inset-ring aria-pressed:inset-ring-border-brand aria-pressed:hover:bg-brand-subtle-hover",
        // As Toggle: under forced colours "pressed" takes the system selection (see toggle.tsx).
        "data-pressed:forced-colors-selected aria-pressed:forced-colors-selected",
        className,
      )}
      {...props}
    />
  );
}

type ToolbarLinkProps = ToolbarPrimitive.Link.Props &
  Pick<VariantProps<typeof buttonVariants>, "size">;

/** A navigation item inside a toolbar: Button's `link` treatment at the toolbar's control height. */
function ToolbarLink({ className, size = "default", ...props }: ToolbarLinkProps) {
  return (
    <ToolbarPrimitive.Link
      data-slot="toolbar-link"
      className={cn(buttonVariants({ variant: "link", size }), className)}
      {...props}
    />
  );
}

function ToolbarGroup({ className, ...props }: ToolbarPrimitive.Group.Props) {
  return (
    <ToolbarPrimitive.Group
      data-slot="toolbar-group"
      className={cn(
        "flex items-center gap-1 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A divider between groups. Base UI gives it the orientation *perpendicular* to the toolbar's:
 * a horizontal toolbar gets a vertical rule. It stretches to the row's height, inset 6px, so it
 * tracks density instead of holding a fixed 20px.
 */
function ToolbarSeparator({ className, ...props }: ToolbarPrimitive.Separator.Props) {
  return (
    <ToolbarPrimitive.Separator
      data-slot="toolbar-separator"
      className={cn(
        "shrink-0 self-stretch bg-border",
        "data-[orientation=vertical]:mx-0.5 data-[orientation=vertical]:my-1.5 data-[orientation=vertical]:w-px",
        "data-[orientation=horizontal]:mx-1.5 data-[orientation=horizontal]:my-0.5 data-[orientation=horizontal]:h-px",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Flexible space: everything after it moves to the toolbar's inline end. Presentational — it is
 * not a toolbar item and takes no focus.
 */
function ToolbarSpacer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      data-slot="toolbar-spacer"
      className={cn("min-w-0 flex-1", className)}
      {...props}
    />
  );
}

export type { ToolbarButtonProps, ToolbarLinkProps, ToolbarProps };
export { Toolbar, ToolbarButton, ToolbarGroup, ToolbarLink, ToolbarSeparator, ToolbarSpacer };
