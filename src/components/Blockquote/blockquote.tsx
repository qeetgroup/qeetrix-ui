import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The quote is content, so it is set in Qeet Text at full text colour with a relaxed measure;
 * the inline-start rule (the strong decorative border, visible in both themes) marks it as a
 * quotation. Upright on purpose: the Qeet faces ship no italic, and a browser-synthesised
 * oblique is the one thing that would make a quote look cheap.
 */
const blockquoteVariants = cva("border-s-2 border-border-strong ps-4 font-sans text-foreground", {
  variants: {
    size: {
      sm: "text-sm/relaxed",
      md: "text-base/relaxed",
      lg: "text-lg/relaxed",
    },
  },
  defaultVariants: { size: "md" },
});

interface BlockquoteProps
  extends React.BlockquoteHTMLAttributes<HTMLQuoteElement>,
    VariantProps<typeof blockquoteVariants> {
  /**
   * Who said it. Rendered as a `<figcaption>` beneath the quote, outside the `<blockquote>`
   * — HTML requires the attribution not to be part of the quotation, and a screen reader would
   * otherwise read the name as part of what was said.
   */
  attribution?: React.ReactNode;
  /** Leading decorative icon (e.g. a quote mark). Hidden from assistive technology. */
  icon?: React.ReactNode;
}

/**
 * Standalone pull-quote / testimonial — distinct from `Prose`-styled blockquotes.
 *
 * Without `attribution` it is a single `<blockquote>`. With one, it is
 * `<figure><blockquote/><figcaption/></figure>`: `className` and `style` style the figure (the
 * visual box, so the rule spans the attribution as before), and every other prop — `cite`,
 * `id`, `aria-*` — stays on the `<blockquote>`.
 */
function Blockquote({
  className,
  style,
  size,
  attribution,
  icon,
  children,
  ...props
}: BlockquoteProps) {
  const iconNode = icon ? (
    <span
      data-slot="blockquote-icon"
      aria-hidden="true"
      className="mb-2 block text-muted-foreground [&_svg:not([class*='size-'])]:size-5"
    >
      {icon}
    </span>
  ) : null;
  const body = <div className="text-pretty [&>p]:m-0 [&>p+p]:mt-3">{children}</div>;

  if (!attribution) {
    return (
      <blockquote
        data-slot="blockquote"
        className={cn(blockquoteVariants({ size }), className)}
        style={style}
        {...props}
      >
        {iconNode}
        {body}
      </blockquote>
    );
  }

  return (
    <figure
      data-slot="blockquote-figure"
      className={cn(blockquoteVariants({ size }), className)}
      style={style}
    >
      {iconNode}
      <blockquote data-slot="blockquote" {...props}>
        {body}
      </blockquote>
      <figcaption
        data-slot="blockquote-attribution"
        className="mt-3 font-ui text-label text-muted-foreground"
      >
        {attribution}
      </figcaption>
    </figure>
  );
}

export type { BlockquoteProps };
export { Blockquote, blockquoteVariants };
