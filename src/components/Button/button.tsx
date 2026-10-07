import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * The Qeet interaction language. Every control in the Button family — Button, ButtonGroup,
 * CloseButton, IconButton, Toggle, ToggleTip, SegmentedControl — and the families that compose
 * it (Toolbar, ActionBar, Clipboard) speak it, so a hover or a press means the same thing
 * everywhere:
 *
 *   rest      the variant's own surface — Qeet orange only on the primary action
 *   hover     one step along that surface's ladder (surface-interactive → -hover → -active)
 *   press     the next step, and a resting hairline shadow settles flat. No transform: a
 *             translate nudge overwrote a consumer's own `-translate-*-1/2` centring
 *   focus     the foundation ring, `focus-visible:focus-ring` — an outline, so it survives
 *             forced colours, never a box-shadow halo
 *   expanded  a trigger whose popup is open holds its hover tone (`data-popup-open`, which every
 *             Base UI popup trigger writes) — not `aria-expanded`, so a disclosure toggle (a
 *             Collapsible trigger writes `data-panel-open`) does not read as pressed
 *   disabled  `opacity-disabled` and no pointer events, from native `disabled` or aria-disabled
 *   loading   full colour (busy is not disabled), a spinner in the leading slot, aria-busy,
 *             activation blocked, focus kept
 *   selected  bg-brand-subtle plus a border-brand hairline (Toggle, SegmentedControl, Toolbar):
 *             the tint is the Qeet signal, the ≥3:1 hairline is the one that does not depend
 *             on telling two light colours apart
 */
const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center rounded-(--qx-component-button-corner) border border-transparent bg-clip-padding font-ui text-sm font-medium whitespace-nowrap select-none",
    "transition-[color,background-color,border-color,box-shadow,opacity] duration-fast ease-standard",
    "focus-visible:focus-ring active:shadow-none",
    // Native `disabled`, or `aria-disabled` (focusableWhenDisabled, an anchor, a toolbar item).
    // A loading button is disabled for activation but keeps its colour: busy is not unavailable.
    "disabled:pointer-events-none disabled:not-data-loading:opacity-disabled aria-disabled:pointer-events-none aria-disabled:not-data-loading:opacity-disabled data-loading:pointer-events-none",
    "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        // Primary: the one Qeet-orange action on a surface — Qeet Ember with a white label. Flat, a
        // resting hairline shadow, no lift on hover — the colour is already the loudest thing on the
        // screen. Disabled drops to the neutral interactive fill rather than a faded orange: half an
        // ember over near-black reads as brown, and an unavailable action carries no brand emphasis.
        default:
          "disabled:not-data-loading:bg-surface-interactive disabled:not-data-loading:text-(--qx-color-text-disabled) disabled:not-data-loading:opacity-100 disabled:not-data-loading:shadow-none aria-disabled:not-data-loading:bg-surface-interactive aria-disabled:not-data-loading:text-(--qx-color-text-disabled) aria-disabled:not-data-loading:opacity-100 aria-disabled:not-data-loading:shadow-none bg-(--qx-component-button-primary-background) text-(--qx-component-button-primary-foreground) shadow-xs hover:bg-(--qx-component-button-primary-background-hover) active:bg-(--qx-component-button-primary-background-active) data-popup-open:bg-(--qx-component-button-primary-background-hover)",
        // Outline: the workhorse beside a primary — dialog footers, forms, table toolbars. Its
        // fill is a component token because it genuinely differs by theme (a clean surface sheet
        // on light; a quiet translucent wash on dark), so it sits on any surface without a patch.
        outline:
          "border-(--qx-component-button-outline-border) bg-(--qx-component-button-outline-background) shadow-xs hover:bg-surface-interactive-hover hover:text-foreground active:bg-surface-interactive-active data-popup-open:bg-surface-interactive-hover data-popup-open:text-foreground",
        // Secondary: a neutral filled action. Walks the surface-interactive ladder. The resting
        // hairline shadow keeps its edge on a sunken panel, whose fill it matches in light.
        secondary:
          "bg-surface-interactive text-secondary-foreground shadow-xs hover:bg-surface-interactive-hover active:bg-surface-interactive-active data-popup-open:bg-surface-interactive-hover",
        // Ghost: chrome-less, for toolbars, table rows and dense headers.
        ghost:
          "hover:bg-surface-interactive-hover hover:text-foreground active:bg-surface-interactive-active data-popup-open:bg-surface-interactive-hover data-popup-open:text-foreground",
        // Destructive: quiet at rest (danger text on the designed error surface), and it commits
        // to solid danger on intent. The old /20 and /30 hover tints dropped the label below
        // 4.5:1 in both themes.
        destructive:
          "bg-destructive-subtle text-destructive-text hover:bg-destructive hover:text-destructive-foreground active:bg-destructive active:text-destructive-foreground data-popup-open:bg-destructive data-popup-open:text-destructive-foreground",
        link: "text-link underline-offset-4 hover:text-link-hover hover:underline",
      },
      size: {
        default:
          "h-(--qx-component-button-height) gap-1.5 px-2.5 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
        xs: "h-6 gap-1 rounded-(--qx-component-button-corner-xs) px-2 text-xs in-data-[slot=button-group]:rounded-(--qx-component-button-corner) has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-(--qx-component-button-corner-sm) px-2.5 text-[length:var(--qx-component-button-font-size-sm)] in-data-[slot=button-group]:rounded-(--qx-component-button-corner) has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5",
        // Icon-only sizes: while loading, the spinner takes the icon's place in the same box.
        icon: "size-(--qx-component-button-height) data-loading:[&>svg:not([data-slot=button-spinner])]:hidden",
        "icon-xs":
          "size-6 rounded-(--qx-component-button-corner-xs) in-data-[slot=button-group]:rounded-(--qx-component-button-corner) data-loading:[&>svg:not([data-slot=button-spinner])]:hidden [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-(--qx-component-button-corner-sm) in-data-[slot=button-group]:rounded-(--qx-component-button-corner) data-loading:[&>svg:not([data-slot=button-spinner])]:hidden",
        "icon-lg": "size-9 data-loading:[&>svg:not([data-slot=button-spinner])]:hidden",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonLoadingProps {
  /**
   * Work is in flight. The button keeps its label (and its colour), shows a spinner in the
   * leading slot, reports `aria-busy`, and ignores activation — including a form's implicit
   * submit — while **keeping focus**: it is made `aria-disabled` rather than natively disabled,
   * so a keyboard user who pressed it is not dropped onto `<body>`.
   *
   * The spinner replaces a leading icon (`data-icon="inline-start"` or an `aria-hidden` first
   * child) and an icon-only button's icon, so those keep their exact width. A text-only button
   * gains the spinner's slot — it keeps its visible label, which outranks width — unless a
   * `loadingLabel` is given, in which case the width is held.
   */
  loading?: boolean;
  /**
   * Text shown in place of the label while `loading`, e.g. "Saving…". It becomes the accessible
   * name for the duration. The button reserves the wider of its resting content and
   * "spinner + loading label", so a loading label no longer than the original keeps the width
   * exactly — text-only buttons included. Ignored by the icon-only sizes.
   */
  loadingLabel?: React.ReactNode;
}

/** The button's own props plus its `variant` / `size` surface. */
type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & ButtonLoadingProps;

/**
 * The family's busy indicator: a faint track and a turning arc in `currentColor`, so it takes
 * the label colour of every variant. Self-contained rather than the Spinner family's
 * `role="status"` element — a live region nested in a button would be folded into its name.
 */
function ButtonSpinner({ leading = false }: { leading?: boolean }) {
  return (
    <svg
      data-slot="button-spinner"
      // In the leading slot it takes the leading icon's tighter inline-start padding.
      data-icon={leading ? "inline-start" : undefined}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="animate-spin motion-reduce:animate-none"
    >
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <path
        d="M8 1.75a6.25 6.25 0 0 1 6.25 6.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A decorative first child — the leading icon the spinner stands in for. */
function isLeadingVisual(node: React.ReactNode): boolean {
  if (!React.isValidElement(node)) return false;
  const props = node.props as Record<string, unknown>;
  const hidden = props["aria-hidden"];
  return props["data-icon"] === "inline-start" || hidden === true || hidden === "true";
}

function loadingContent(
  children: React.ReactNode,
  loadingLabel: React.ReactNode,
  iconOnly: boolean,
) {
  if (iconOnly || loadingLabel === undefined || loadingLabel === null) {
    // The spinner takes the leading slot. It stands in for a leading icon, so that button keeps
    // its width; an icon-only button's icon is hidden by its size class instead.
    const items = React.Children.toArray(children);
    const rest =
      !iconOnly && items.length > 1 && isLeadingVisual(items[0]) ? items.slice(1) : items;
    return [<ButtonSpinner key="spinner" leading />, ...rest];
  }
  // The resting content and "spinner + loading label" share one grid cell, so the button is as
  // wide as the wider of the two and the busy pair centres where the label was. The resting
  // content stays laid out (and keeps its own icon padding) but is invisible and out of the
  // accessibility tree; the loading label is the name while it shows.
  return (
    <span
      data-slot="button-loading-label"
      className="inline-grid place-items-center gap-[inherit] *:col-start-1 *:row-start-1"
    >
      <span aria-hidden="true" className="invisible inline-flex items-center gap-[inherit]">
        {children}
      </span>
      <span className="inline-flex items-center gap-[inherit]">
        <ButtonSpinner />
        {loadingLabel}
      </span>
    </span>
  );
}

/**
 * The Qeet action control: one primary action per view, with secondary, outline, ghost,
 * destructive and link variants, icon-only sizes, and a `loading` state that keeps focus.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  loadingLabel,
  disabled,
  focusableWhenDisabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-size={size}
      data-variant={variant}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      // Busy, not gone: keep focus where the user left it. An explicit `false` still wins.
      focusableWhenDisabled={focusableWhenDisabled ?? (loading || undefined)}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? loadingContent(children, loadingLabel, String(size).startsWith("icon")) : children}
    </ButtonPrimitive>
  );
}

export type { ButtonProps };
export { Button, buttonVariants };
