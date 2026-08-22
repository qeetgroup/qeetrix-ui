"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import type * as React from "react";

import type { MessagesFor } from "@/lib/messages";
import { bannerMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

const bannerVariants = cva("flex w-full items-center gap-3 px-4 py-2.5 text-sm", {
  variants: {
    variant: {
      default: "bg-foreground text-background",
      info: "bg-info text-info-foreground",
      success: "bg-success text-success-foreground",
      warning: "bg-warning text-warning-foreground",
      // `destructive` is the library-wide name for this tone; `danger` predates it and
      // keeps working — see docs/standards/component-api.md § Variant vocabulary.
      destructive: "bg-destructive text-destructive-foreground",
      danger: "bg-destructive text-destructive-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface BannerProps extends React.ComponentProps<"section">, VariantProps<typeof bannerVariants> {
  /** When provided, renders a trailing dismiss button that calls this. */
  onDismiss?: () => void;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"banner">;
}

/**
 * App-wide announcement bar (maintenance notices, plan limits, new features).
 * Full-width, intent-coloured, optionally dismissible. Render links inside —
 * they're underlined automatically.
 */
function Banner({
  className,
  variant,
  onDismiss,
  messages: messageOverrides,
  children,
  ...props
}: BannerProps) {
  const messages = useMessages("banner", bannerMessages, messageOverrides);
  return (
    <section data-slot="banner" className={cn(bannerVariants({ variant }), className)} {...props}>
      <div className="flex flex-1 items-center justify-center gap-2 text-center [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={messages.dismiss}
          className="-me-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md opacity-80 transition-opacity hover:opacity-100"
        >
          <XIcon aria-hidden className="size-4" />
        </button>
      )}
    </section>
  );
}

export type { BannerProps };
export { Banner, bannerVariants };
