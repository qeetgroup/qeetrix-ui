/**
 * The Qeet brand logos, as an application uses them: straight from `@qeetrix/icons`.
 */

import { QeetLogo, QeetWordmarkLogo } from "@qeetrix/icons";
import { cn } from "@qeetrix/ui";
import type { ComponentProps } from "react";

export { QeetLogo, QeetWordmarkLogo };

type LogoProps = Omit<ComponentProps<typeof QeetLogo>, "variant">;
type WordmarkProps = Omit<ComponentProps<typeof QeetWordmarkLogo>, "variant">;

/**
 * Theme-following logo: both files are rendered and CSS shows the one that matches the page.
 * The pattern for a `.dark`-class theme (Qeetrix UI's), and exactly what the Brand page teaches.
 */
export function ThemedQeetLogo({ className, ...props }: LogoProps) {
  return (
    <>
      <QeetLogo {...props} className={cn("inline-block dark:hidden", className)} />
      <QeetLogo {...props} variant="dark" className={cn("hidden dark:inline-block", className)} />
    </>
  );
}

/** `plain` picks the untiled letters (`plain` / `plain-dark`) instead of the tile (`default` / `dark`). */
export function ThemedQeetWordmark({
  plain = false,
  className,
  ...props
}: WordmarkProps & { plain?: boolean }) {
  return (
    <>
      <QeetWordmarkLogo
        {...props}
        variant={plain ? "plain" : "default"}
        className={cn("inline-block dark:hidden", className)}
      />
      <QeetWordmarkLogo
        {...props}
        variant={plain ? "plain-dark" : "dark"}
        className={cn("hidden dark:inline-block", className)}
      />
    </>
  );
}
