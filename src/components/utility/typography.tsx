import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-4xl font-bold tracking-tight text-balance",
      h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight",
      p: "leading-7 [&:not(:first-child)]:mt-6",
      blockquote: "mt-6 border-s-2 ps-6 italic text-muted-foreground",
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
      inlineCode:
        "relative rounded bg-muted px-[var(--qx-component-typography-code-padding-inline)] py-[var(--qx-component-typography-code-padding-block)] font-mono text-sm font-semibold",
      list: "my-6 ms-6 list-disc [&>li]:mt-2",
    },
  },
  defaultVariants: { variant: "p" },
});

type TypographyVariant = NonNullable<VariantProps<typeof typographyVariants>["variant"]>;

const defaultElement: Record<TypographyVariant, React.ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  p: "p",
  blockquote: "blockquote",
  lead: "p",
  large: "div",
  small: "small",
  muted: "p",
  inlineCode: "code",
  list: "ul",
};

interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  /** Override the rendered element (defaults to a sensible tag per variant). */
  as?: React.ElementType;
}

/**
 * Consistent text styling for discrete pieces of copy — headings, lead/body
 * paragraphs, blockquotes, inline code, lists, and muted/small captions. For
 * rendered long-form HTML/markdown use {@link Prose} instead.
 */
function Typography({ variant = "p", as, className, ...props }: TypographyProps) {
  const Comp = as ?? defaultElement[variant ?? "p"];
  return (
    <Comp
      data-slot="typography"
      className={cn(typographyVariants({ variant }), className)}
      {...props}
    />
  );
}

/**
 * Self-contained typographic styles for a block of rendered HTML/markdown
 * (e.g. MDX, a rich-text editor's output). No `@tailwindcss/typography`
 * dependency — the descendant utilities are scanned from the compiled output.
 */
const proseClassName = cn(
  "max-w-none text-foreground",
  "[&>:first-child]:mt-0",
  "[&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight",
  "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight",
  "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold",
  "[&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold",
  "[&_p]:leading-7 [&_p:not(:first-child)]:mt-4",
  "[&_ul]:my-4 [&_ul]:ms-6 [&_ul]:list-disc [&_ul>li]:mt-1",
  "[&_ol]:my-4 [&_ol]:ms-6 [&_ol]:list-decimal [&_ol>li]:mt-1",
  "[&_blockquote]:mt-4 [&_blockquote]:border-s-2 [&_blockquote]:ps-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm",
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre>code]:bg-transparent [&_pre>code]:p-0",
  "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
  "[&_hr]:my-8 [&_hr]:border-border",
  "[&_img]:rounded-lg [&_strong]:font-semibold",
);

function Prose({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="prose" className={cn(proseClassName, className)} {...props} />;
}

export type { TypographyProps, TypographyVariant };
export { Prose, proseClassName, Typography, typographyVariants };
