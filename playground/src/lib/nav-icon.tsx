import type { IconProps } from "@qeetrix/icons";
import type { ComponentType } from "react";

/**
 * A navigation item's icon: its filled drawing while the item is the current page, its outline
 * otherwise — the "you are here" mark. Not every icon has a filled drawing, and a typed
 * `variant="filled"` rejects those; at runtime an outline-only icon consumes `variant` and draws
 * its outline, so one component covers a mixed list without a per-item flag.
 */
export function NavIcon({
  icon,
  active,
}: {
  icon: ComponentType<IconProps<"outline">>;
  active: boolean;
}) {
  const Icon = icon as ComponentType<IconProps>;
  return <Icon aria-hidden variant={active ? "filled" : "outline"} />;
}
