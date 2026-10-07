import { type LogoProps, QeetLogo as QeetMark } from "@qeetrix/icons";

/**
 * Props for one fixed rendering of the Qeet mark. The artwork comes from `@qeetrix/icons`, the
 * single source for Qeet's logos, which renders the published file unmodified as an `<img>`; the
 * native `<img>` props pass through.
 */
export interface QeetLogoVariantProps
  extends Omit<LogoProps, "variant" | "width" | "height" | "title" | "alt"> {
  /** Width and height in px or any CSS length (the mark is square). Defaults to 32. */
  size?: number | string;
  /** Accessible label. Defaults to "Qeet". Pass `null` to mark decorative. */
  title?: string | null;
}

/** The `@qeetrix/icons` props for a mark of `size`, named by `title` unless it is `null`. */
export function markProps({ size = 32, title = "Qeet", ...props }: QeetLogoVariantProps) {
  return { ...props, width: size, height: size, "aria-label": title ?? undefined };
}

/** Qeet mark — light artwork, for use on DARK surfaces. */
export function QeetLogoOnDark(props: QeetLogoVariantProps) {
  return <QeetMark variant="dark" {...markProps(props)} />;
}
