import type { IconProps } from "@qeetrix/icons";
import { type ComponentType, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

type IconComponent = ComponentType<IconProps<"outline">>;

/**
 * Whether `svg` draws `icon`'s artwork. `@qeetrix/icons` adds no per-icon class (Lucide's
 * `lucide-check` used to name a glyph), so a test compares the drawing itself: the element's inner
 * markup against the icon rendered on its own, in its default outline drawing.
 */
export function drawsIcon(svg: Element | null | undefined, icon: IconComponent): boolean {
  if (!svg) return false;
  const reference = document.createElement("div");
  reference.innerHTML = renderToStaticMarkup(createElement(icon));
  return svg.innerHTML === reference.firstElementChild?.innerHTML;
}

/** The first `<svg>` inside `root` that draws `icon`, or `null`. */
export function findIcon(
  root: ParentNode | null | undefined,
  icon: IconComponent,
): SVGElement | null {
  if (!root) return null;
  return [...root.querySelectorAll("svg")].find((svg) => drawsIcon(svg, icon)) ?? null;
}
