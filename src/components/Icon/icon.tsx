import type * as React from "react";

import { ICON_SIZE, ICON_STROKE } from "@/lib/token-values";
import { cn } from "@/lib/utils";

export { ICON_SIZE, ICON_STROKE };

type IconComponent = React.ComponentType<{
  size?: number | string;
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
  role?: string;
}>;

interface IconProps {
  /** A lucide-react icon (or any component accepting `size`/`strokeWidth`), e.g. `Search`. */
  icon: IconComponent;
  /** A size token key, or explicit px. Defaults to `"md"` (20px). */
  size?: keyof typeof ICON_SIZE | number;
  /** A stroke token key, or explicit width. Defaults to `"regular"` (2). */
  stroke?: keyof typeof ICON_STROKE | number;
  /** Give the icon an accessible name; without it the icon is decorative (`aria-hidden`). */
  title?: string;
  className?: string;
}

/**
 * Icon standardises lucide (and brand) icons onto the Qeetrix size/stroke scale
 * (Gap 9). Decorative by default (`aria-hidden`); pass `title` for an accessible
 * name. The scale is generated from `tokens/primitive/icon.json`.
 */
function Icon({ icon: Cmp, size = "md", stroke = "regular", title, className }: IconProps) {
  const px = typeof size === "number" ? size : ICON_SIZE[size];
  const sw = typeof stroke === "number" ? stroke : ICON_STROKE[stroke];
  const labelled = title != null && title !== "";
  return (
    <Cmp
      size={px}
      strokeWidth={sw}
      className={cn("shrink-0", className)}
      aria-hidden={!labelled}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
    />
  );
}

export type { IconProps };
export { Icon };
