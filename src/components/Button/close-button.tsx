import { XIcon } from "@qeetrix/icons/icons/x";
import type { ComponentProps } from "react";

import { Button } from "@/components/Button/button";
import { overlayMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";

type CloseButtonProps = Omit<ComponentProps<typeof Button>, "children" | "size"> & {
  "aria-label"?: string;
  /** `icon-xs` suits toasts, chips and dense panels; `icon-sm` is the dialog/sheet default. */
  size?: "icon-xs" | "icon-sm" | "icon";
};

/**
 * Standalone dismiss/close button. Use inside Dialogs, Sheets, Notifications,
 * and Alerts. Renders an accessible icon-only button with a default label of
 * "Close".
 *
 * Quieter than the content it dismisses: the glyph rests at the muted text colour and comes up
 * to the foreground on hover, focus or press.
 */
function CloseButton({
  "aria-label": ariaLabel = overlayMessages.close,
  size = "icon-sm",
  variant = "ghost",
  className,
  ...rest
}: CloseButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={ariaLabel}
      data-slot="close-button"
      className={cn(
        "text-muted-foreground hover:text-foreground focus-visible:text-foreground active:text-foreground",
        className,
      )}
      {...rest}
    >
      <XIcon aria-hidden />
    </Button>
  );
}

export type { CloseButtonProps };
export { CloseButton };
