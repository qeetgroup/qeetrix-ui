import { QeetLogoOnDark, type QeetLogoVariantProps } from "./qeet-logo-on-dark.js";
import { QeetLogoOnLight } from "./qeet-logo-on-light.js";

function joinClass(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ") || undefined;
}

export interface QeetLogoProps extends QeetLogoVariantProps {
  /**
   * Which mark to render:
   *  - "auto" (default): the light-surface mark in light theme, the dark-surface
   *    mark in dark theme. Relies on the `.dark` class strategy + the Qeetrix
   *    Tailwind `dark:` variant (import `@qeetrix/ui/styles.css`).
   *  - "on-light": force the dark artwork (for light backgrounds).
   *  - "on-dark": force the light artwork (for dark backgrounds).
   */
  variant?: "auto" | "on-light" | "on-dark";
}

/**
 * The Qeet mark. Theme-adaptive by default; pass `variant` to force one.
 *
 * `QeetLogoMark` is exported as an alias — the current artwork is the square
 * "Q" mark. A separate wordmark / horizontal lockup is not yet available.
 */
export function QeetLogo({ variant = "auto", className, ...props }: QeetLogoProps) {
  if (variant === "on-light") return <QeetLogoOnLight className={className} {...props} />;
  if (variant === "on-dark") return <QeetLogoOnDark className={className} {...props} />;

  return (
    <>
      <QeetLogoOnLight className={joinClass("dark:hidden", className)} {...props} />
      <QeetLogoOnDark className={joinClass("hidden", "dark:block", className)} {...props} />
    </>
  );
}

export const QeetLogoMark = QeetLogo;
