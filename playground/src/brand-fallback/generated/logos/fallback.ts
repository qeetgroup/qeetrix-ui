import { type ComponentPropsWithoutRef, createElement, type ReactElement } from "react";

/**
 * Stand-ins for the Qeet brand logos, used only when the qeetrix-icons repository is not checked
 * out next to qeetrix-ui (see playground/vite.config.ts). Same props as the real components; they
 * render a labelled box instead of the artwork. Install an `@qeetrix/icons` release that ships
 * the Qeet logos to see the real ones.
 */
export type BrandLogoProps = Omit<ComponentPropsWithoutRef<"img">, "src" | "height" | "width"> & {
  variant?: string;
  height?: number | string;
  width?: number | string;
};

/** `ratios` maps each variant to its width / height; `default` is used for any other variant. */
export function standIn(
  label: string,
  ratios: { readonly default: number; readonly [variant: string]: number },
) {
  return function StandIn({
    variant = "default",
    height = 24,
    className,
    style,
  }: BrandLogoProps): ReactElement {
    const h = typeof height === "number" ? `${height}px` : height;
    return createElement(
      "span",
      {
        className,
        role: "img",
        "aria-label": `${label} (stand-in)`,
        style: {
          display: "inline-grid",
          placeItems: "center",
          height: h,
          aspectRatio: String(ratios[variant] ?? ratios.default),
          border: "1px dashed currentColor",
          font: "600 10px system-ui",
          opacity: 0.6,
          background: variant.endsWith("dark") ? "#fff1" : "#0001",
          ...style,
        },
      },
      label,
    );
  };
}
