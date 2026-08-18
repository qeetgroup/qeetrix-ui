import type { ComponentProps, ComponentType } from "react";

import { Button } from "@/components/ui/button";

type IconButtonProps = Omit<ComponentProps<typeof Button>, "children" | "aria-label" | "size"> & {
  /** A Lucide or Qeet icon component. Rendered at size-4 inside the button. */
  icon: ComponentType<{ className?: string }>;
  /** Accessible label — required. TypeScript enforces a non-optional string. */
  "aria-label": string;
  size?: "icon-sm" | "icon" | "icon-lg";
};

/**
 * Icon-only button that enforces an accessible label at the TypeScript level.
 * Accepts any Lucide or Qeet icon component via the `icon` prop.
 */
function IconButton({
  icon: IconEl,
  "aria-label": ariaLabel,
  size = "icon",
  variant = "ghost",
  ...rest
}: IconButtonProps) {
  return (
    <Button variant={variant} size={size} aria-label={ariaLabel} data-slot="icon-button" {...rest}>
      <IconEl aria-hidden className="size-4" />
    </Button>
  );
}

export type { IconButtonProps };
export { IconButton };
