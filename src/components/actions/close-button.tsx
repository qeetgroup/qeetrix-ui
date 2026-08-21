import { XIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/actions/button";

type CloseButtonProps = Omit<ComponentProps<typeof Button>, "children" | "size"> & {
  "aria-label"?: string;
  size?: "icon-sm" | "icon";
};

/**
 * Standalone dismiss/close button. Use inside Dialogs, Sheets, Notifications,
 * and Alerts. Renders an accessible icon-only button with a default label of
 * "Close".
 */
function CloseButton({
  "aria-label": ariaLabel = "Close",
  size = "icon-sm",
  variant = "ghost",
  ...rest
}: CloseButtonProps) {
  return (
    <Button variant={variant} size={size} aria-label={ariaLabel} data-slot="close-button" {...rest}>
      <XIcon aria-hidden />
    </Button>
  );
}

export type { CloseButtonProps };
export { CloseButton };
