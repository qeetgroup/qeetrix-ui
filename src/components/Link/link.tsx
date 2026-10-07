"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ArrowUpRightIcon } from "@qeetrix/icons/icons/arrow-up-right";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { linkMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/**
 * Qeet links are text, not fills: `text-link` is the brand's 4.5:1 text role (never
 * `text-primary`, which is a 3:1 fill colour), and hover moves toward the primary text colour.
 *
 * Two layouts:
 *
 *   - **standalone** (default) — a link that stands on its own: "View all", a card action, a
 *     list of resources. `inline-flex`, so a leading or trailing icon aligns; underline on
 *     hover, because the context already says it is a link.
 *   - **`inline`** — a link inside running text. Real inline layout, so a long label wraps
 *     with the sentence instead of overflowing a narrow panel; inherits the surrounding size;
 *     underlined at rest. The underline is not optional styling: the link colour is only
 *     1.9:1 against body text in dark mode, so colour alone would fail WCAG 1.4.1.
 *
 * Visited links are deliberately not styled. Qeet surfaces are applications, where a link is
 * navigation and `:visited` carries no information; there is no visited text role in the
 * semantic layer to style it with.
 */
const linkVariants = cva(
  [
    "rounded-sm font-medium decoration-1 underline-offset-(--qx-component-link-underline-offset)",
    "transition-[color,text-decoration-color] duration-fast ease-standard",
    "focus-visible:focus-ring",
    "aria-disabled:pointer-events-none aria-disabled:opacity-disabled aria-disabled:no-underline",
    "forced-colors:aria-disabled:text-[GrayText]",
  ],
  {
    variants: {
      variant: {
        default: "text-link hover:text-link-hover active:text-link-hover",
        muted: "text-muted-foreground hover:text-foreground active:text-foreground",
        destructive:
          "text-destructive-text hover:text-(--qx-component-link-destructive-foreground-hover) active:text-(--qx-component-link-destructive-foreground-hover)",
      },
      underline: {
        hover: "no-underline hover:underline",
        always: "underline",
        none: "no-underline",
      },
      size: {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
      },
      inline: {
        false:
          "inline-flex items-center gap-1 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1em]",
        true: "inline wrap-break-word [&_svg]:inline-block [&_svg]:align-[-0.125em] [&_svg:not([class*='size-'])]:size-[0.875em]",
      },
    },
    defaultVariants: {
      variant: "default",
      underline: "hover",
      size: "md",
      inline: false,
    },
  },
);

type LinkProps = useRender.ComponentProps<"a"> &
  VariantProps<typeof linkVariants> & {
    /**
     * The link sits inside running text. Lays out inline so it wraps with the sentence,
     * inherits the surrounding font size unless `size` is given, and underlines at rest unless
     * `underline` is given.
     */
    inline?: boolean;
    /**
     * The link leaves the application. Opens in a new tab with `rel="noopener noreferrer"`
     * (a `target` or `rel` you pass still wins / is merged), shows a trailing ↗ glyph, and
     * tells assistive technology that a new tab will open.
     */
    external?: boolean;
    /**
     * Visually hidden suffix announced for an `external` link that opens a new tab. Override it
     * to translate. Defaults to `"(opens in a new tab)"`.
     */
    externalLabel?: string;
    /**
     * Links cannot be disabled natively. This removes the destination and the tab stop, keeps
     * the text discoverable to a screen reader as a link that is unavailable
     * (`role="link"` + `aria-disabled`), and dims it. Prefer removing a link the user can never
     * follow; use this when its absence would be more confusing than its presence.
     */
    disabled?: boolean;
  };

function definedProps<T extends Record<string, unknown>>(props: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

/**
 * A navigational text link. Renders an `<a>`; pass `render` to compose a router link while
 * keeping Qeet link styling and behaviour:
 *
 * ```tsx
 * <Link render={<RouterLink to="/settings" />}>Settings</Link>
 * <Link inline href="/docs/scim">SCIM provisioning guide</Link>
 * <Link external href="https://status.qeet.in">Status page</Link>
 * ```
 */
function Link({
  className,
  variant,
  underline,
  size,
  inline = false,
  external = false,
  externalLabel,
  disabled = false,
  render,
  ref,
  children,
  href,
  target,
  rel,
  onClick,
  ...props
}: LinkProps) {
  const messages = useMessages("link", linkMessages);
  const resolvedTarget = target ?? (external ? "_blank" : undefined);
  const opensNewTab = resolvedTarget === "_blank";
  const resolvedRel = opensNewTab
    ? Array.from(new Set([...(rel?.split(/\s+/) ?? []), "noopener", "noreferrer"]))
        .filter(Boolean)
        .join(" ")
    : rel;

  const content = (
    <>
      {children}
      {external && (
        <>
          {/* Word joiner: the glyph never wraps onto a line of its own. Hidden, so it stays
              out of the accessible name. */}
          {inline ? <span aria-hidden="true">{"⁠"}</span> : null}
          <ArrowUpRightIcon
            aria-hidden="true"
            data-slot="link-external-icon"
            className="opacity-80 rtl:-scale-x-100"
          />
        </>
      )}
      {opensNewTab && !disabled && (
        <span className="sr-only"> {externalLabel ?? messages.opensInNewTab}</span>
      )}
    </>
  );

  return useRender({
    defaultTagName: "a",
    render,
    ref,
    state: { slot: "link", external, disabled },
    props: mergeProps<"a">(
      {
        className: cn(
          linkVariants({
            variant,
            // Inline links inherit the size of the sentence they are in, and are underlined
            // at rest; an explicit prop still wins in both cases.
            size: inline && size === undefined ? null : size,
            underline: underline ?? (inline ? "always" : "hover"),
            inline,
          }),
          className,
        ),
        children: content,
        ...(disabled
          ? {
              role: "link",
              "aria-disabled": true,
              tabIndex: -1,
              onClick: (event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault(),
            }
          : // Only what was actually given: an `href: undefined` here would overwrite the href
            // a `render`ed router link computes for itself.
            definedProps({ href, target: resolvedTarget, rel: resolvedRel, onClick })),
      },
      props,
    ),
  });
}

export type { LinkProps };
export { Link, linkVariants };
