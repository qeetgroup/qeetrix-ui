"use client";

import { CircleAlertIcon } from "@qeetrix/icons/icons/circle-alert";
import { CircleCheckIcon } from "@qeetrix/icons/icons/circle-check";
import { InfoIcon } from "@qeetrix/icons/icons/info";
import { TriangleAlertIcon } from "@qeetrix/icons/icons/triangle-alert";
import { XIcon } from "@qeetrix/icons/icons/x";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import type { MessagesFor } from "@/lib/messages";
import { bannerMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/**
 * A full-width bar that sits above an application for days at a time, so it is calm: the subtle
 * status surface with a hairline under it, the status hue on the icon only, neutral text. The
 * solid saturated fills it replaces dominated every screen they appeared on — in dark mode the
 * status fills are the 400 steps, which made a full-width bar the brightest thing in the UI.
 */
const bannerVariants = cva(
  "flex w-full items-center gap-3 border-b px-4 py-2 text-sm text-foreground",
  {
    variants: {
      variant: {
        default: "border-border bg-muted",
        info: "border-(--qx-component-alert-border-info) bg-info-subtle",
        success: "border-(--qx-component-alert-border-success) bg-success-subtle",
        warning: "border-(--qx-component-alert-border-warning) bg-warning-subtle",
        // `destructive` is the library-wide name for this tone; `danger` predates it and
        // keeps working — see docs/standards/component-api.md § Variant vocabulary.
        destructive: "border-(--qx-component-alert-border-danger) bg-destructive-subtle",
        danger: "border-(--qx-component-alert-border-danger) bg-destructive-subtle",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BannerVariant = NonNullable<VariantProps<typeof bannerVariants>["variant"]>;

const DEFAULT_ICON: Partial<Record<BannerVariant, React.ElementType>> = {
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  destructive: CircleAlertIcon,
  danger: CircleAlertIcon,
};

const ICON_TONE: Record<BannerVariant, string> = {
  default: "text-muted-foreground",
  info: "text-info-text",
  success: "text-success-text",
  warning: "text-warning-text",
  destructive: "text-destructive-text",
  danger: "text-destructive-text",
};

interface BannerProps extends React.ComponentProps<"section">, VariantProps<typeof bannerVariants> {
  /** When provided, renders a trailing dismiss button that calls this. */
  onDismiss?: () => void;
  /**
   * Leading icon. Omit for the per-variant status icon (the neutral `default` banner has none);
   * pass `null` to render no icon.
   */
  icon?: React.ReactNode;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"banner">;
}

/**
 * App-wide announcement bar (maintenance notices, plan limits, new features).
 * Full-width, status-tinted, optionally dismissible. Render links inside —
 * they're underlined automatically. Give it an `aria-label` so the `<section>` is a named
 * region a screen-reader user can find.
 */
function Banner({
  className,
  variant,
  onDismiss,
  icon,
  messages: messageOverrides,
  children,
  ...props
}: BannerProps) {
  const messages = useMessages("banner", bannerMessages, messageOverrides);
  const resolved: BannerVariant = variant ?? "default";
  const DefaultIcon = DEFAULT_ICON[resolved];
  const renderedIcon = icon !== undefined ? icon : DefaultIcon ? <DefaultIcon aria-hidden /> : null;

  return (
    <section
      data-slot="banner"
      data-variant={resolved}
      className={cn(bannerVariants({ variant }), className)}
      {...props}
    >
      <div
        data-slot="banner-content"
        className="flex min-w-0 flex-1 items-center justify-center gap-2 text-center [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4"
      >
        {renderedIcon != null && renderedIcon !== false && (
          <span
            data-slot="banner-icon"
            aria-hidden
            className={cn("flex shrink-0 [&>svg]:size-4", ICON_TONE[resolved])}
          >
            {renderedIcon}
          </span>
        )}
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          data-slot="banner-dismiss"
          onClick={onDismiss}
          aria-label={messages.dismiss}
          className="-me-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast ease-standard hover:bg-foreground/5 hover:text-foreground focus-visible:focus-ring"
        >
          <XIcon aria-hidden className="size-4" />
        </button>
      )}
    </section>
  );
}

export type { BannerProps };
export { Banner, bannerVariants };
