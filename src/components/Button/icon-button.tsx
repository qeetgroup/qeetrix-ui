import type { ComponentProps, ComponentType } from "react";

import { Button } from "@/components/Button/button";

type IconButtonProps = Omit<ComponentProps<typeof Button>, "children" | "aria-label" | "size"> & {
  /**
   * A Lucide or Qeet icon component. Sized by the button: 12px at `icon-xs`, 16px otherwise —
   * unless the icon brings its own `size-*` class.
   */
  icon: ComponentType<{ className?: string }>;
  /** Accessible label — required. TypeScript enforces a non-optional string. */
  "aria-label": string;
  size?: "icon-xs" | "icon-sm" | "icon" | "icon-lg";
};

/**
 * Icon-only button that enforces an accessible label at the TypeScript level.
 * Accepts any Lucide or Qeet icon component via the `icon` prop.
 *
 * `loading` swaps the icon for the spinner in the same square, so an icon toolbar never
 * reflows while one of its actions is busy.
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
      <IconEl aria-hidden />
    </Button>
  );
}

export type { IconButtonProps };
export { IconButton };
