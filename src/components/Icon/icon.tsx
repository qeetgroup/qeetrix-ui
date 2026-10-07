import type { IconShape, IconVariant } from "@qeetrix/icons";
import type * as React from "react";

import { ICON_SIZE, ICON_STROKE } from "@/lib/token-values";
import { cn } from "@/lib/utils";

export { ICON_SIZE, ICON_STROKE };

/** Any component on the icon contract: an `@qeetrix/icons` icon, or a Qeet brand icon. */
type IconComponent<V extends IconVariant = IconVariant> = React.ComponentType<{
  size?: number | string;
  strokeWidth?: number;
  shape?: IconShape;
  variant?: V;
  className?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
  role?: string;
}>;

interface IconProps<V extends IconVariant = IconVariant> {
  /** An `@qeetrix/icons` icon (or any component accepting `size`/`strokeWidth`), e.g. `SearchIcon`. */
  icon: IconComponent<V>;
  /** A size token key, or explicit px. Defaults to `"md"` (20px). */
  size?: keyof typeof ICON_SIZE | number;
  /** A stroke token key, or explicit width. Defaults to `"regular"` (2). */
  stroke?: keyof typeof ICON_STROKE | number;
  /** `"round"` (the icon's default) or `"sharp"`. Passed to the icon only when given. */
  shape?: IconShape;
  /**
   * `"outline"` (the icon's default) or `"filled"`, typed to the drawings the icon has, so
   * `variant="filled"` on an outline-only icon is a type error. Passed only when given.
   */
  variant?: V;
  /** Give the icon an accessible name; without it the icon is decorative (`aria-hidden`). */
  title?: string;
  className?: string;
}

/**
 * Icon standardises `@qeetrix/icons` (and brand) icons onto the Qeetrix size/stroke scale
 * (Gap 9). Decorative by default (`aria-hidden`); pass `title` for an accessible
 * name. The scale is generated from `tokens/primitive/icon.json`.
 */
function Icon<V extends IconVariant = IconVariant>({
  icon: Cmp,
  size = "md",
  stroke = "regular",
  shape,
  variant,
  title,
  className,
}: IconProps<V>) {
  const px = typeof size === "number" ? size : ICON_SIZE[size];
  const sw = typeof stroke === "number" ? stroke : ICON_STROKE[stroke];
  const labelled = title != null && title !== "";
  return (
    <Cmp
      size={px}
      strokeWidth={sw}
      {...(shape !== undefined && { shape })}
      {...(variant !== undefined && { variant })}
      className={cn("shrink-0", className)}
      aria-hidden={!labelled}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
    />
  );
}

export type { IconProps };
export { Icon };
