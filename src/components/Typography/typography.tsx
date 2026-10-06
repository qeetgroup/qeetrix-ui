import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Qeet type, applied by role rather than by step:
 *
 *   Qeet Display  (font-heading)  h1–h4 — titles and section headings
 *   Qeet Text     (font-sans)     p, lead, large, muted, blockquote, list — reading copy
 *   Qeet UI       (font-ui)       small — interface labels
 *   Fira Code     (font-mono)     inlineCode — sized in em, so it matches the text around it
 *
 * The scale is an application scale, not a marketing one. h1 is a page title (24px, 32px from
 * `sm`), h2 a section (20 → 24px), h3 a group (18 → 20px), h4 a block heading (16px). There is
 * no display or hero variant on purpose; those belong to marketing surfaces, not to Typography.
 *
 * Each family is set explicitly so the roles hold under `@qeetrix/ui/core.css`, which omits the
 * host-global heading rule. Where a semantic type role exists (`text-title`, `text-heading`,
 * `text-body`, `text-label`, `text-code`) it is used by name; the steps in between (24px, 18px,
 * 16px) have no role and come from the ramp with a role's line height.
 *
 * No variant carries outer margins. Typography is for discrete copy inside application layouts,
 * where the parent's gap owns spacing — automatic `mt-6` on every paragraph was a documentation
 * pattern that fought card and panel layouts. Long-form flow with rhythm is `Prose`.
 */
const heading = "scroll-m-20 font-heading font-semibold text-balance wrap-break-word";

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: cn(
        heading,
        "tracking-(--qx-typography-title-letter-spacing) text-2xl/(--qx-typography-title-line-height)",
        "sm:text-title",
      ),
      h2: cn(
        heading,
        "tracking-(--qx-typography-heading-letter-spacing) text-xl/(--qx-typography-heading-line-height)",
        "sm:text-2xl/(--qx-typography-heading-line-height)",
      ),
      h3: cn(
        heading,
        "tracking-(--qx-typography-heading-letter-spacing) text-lg/(--qx-typography-heading-line-height)",
        "sm:text-heading",
      ),
      h4: cn(heading, "tracking-(--qx-typography-heading-letter-spacing) text-base/snug"),
      p: "font-sans text-body text-pretty wrap-break-word",
      blockquote:
        "border-s-2 border-border-strong ps-4 font-sans text-body text-muted-foreground text-pretty wrap-break-word",
      lead: "font-sans text-base/relaxed text-(--qx-color-text-secondary) text-pretty wrap-break-word",
      large: "font-sans text-lg/snug font-semibold wrap-break-word",
      small: "font-ui text-label font-medium",
      muted: "font-sans text-body text-muted-foreground text-pretty wrap-break-word",
      inlineCode: cn(
        "rounded-(--qx-component-typography-code-corner) bg-(--qx-component-typography-code-background)",
        "px-(--qx-component-typography-code-padding-inline) py-(--qx-component-typography-code-padding-block)",
        "font-mono text-(length:--qx-component-typography-code-font-size) font-normal box-decoration-clone wrap-anywhere",
      ),
      list: "ms-6 list-disc font-sans text-body marker:text-muted-foreground [&>li+li]:mt-1.5",
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
  /**
   * Clip overflowing text with an ellipsis. `true` keeps it to one line; a number clamps it to
   * that many lines. The clipped text is still in the DOM, so assistive technology reads all of
   * it — pair a visual truncation with a way to see the full value (a tooltip, a detail view)
   * when it matters.
   */
  truncate?: boolean | number;
}

/**
 * Consistent text styling for discrete pieces of copy — headings, lead/body
 * paragraphs, blockquotes, inline code, lists, and muted/small captions. For
 * rendered long-form HTML/markdown use {@link Prose} instead.
 *
 * The variant chooses the element (`h2` renders an `<h2>`); `as` changes the element without
 * changing the look — keep the heading *level* right for the document outline and pick the
 * variant for its size, e.g. `<Typography variant="h3" as="h2">`.
 */
function Typography({ variant = "p", as, truncate, className, style, ...props }: TypographyProps) {
  const Comp = as ?? defaultElement[variant ?? "p"];
  const lines = truncate === true ? 1 : typeof truncate === "number" ? truncate : 0;
  // Ellipsis needs a box with a width: the inline variants become inline-block when clipped.
  const inlineVariant = variant === "small" || variant === "inlineCode";
  return (
    <Comp
      data-slot="typography"
      data-variant={variant ?? "p"}
      className={cn(
        typographyVariants({ variant }),
        // `text-nowrap` too: the variants balance or pretty-wrap their text, and the `text-wrap`
        // shorthand resets the wrap mode `truncate` relies on, so a heading never truncated.
        // tailwind-merge drops the variant's text-balance / text-pretty in its favour.
        lines === 1 && "truncate text-nowrap",
        lines > 1 && "line-clamp-(--qx-line-clamp)",
        lines === 1 && inlineVariant && "inline-block max-w-full align-bottom",
        className,
      )}
      style={lines > 1 ? ({ "--qx-line-clamp": lines, ...style } as React.CSSProperties) : style}
      {...props}
    />
  );
}

/**
 * Self-contained typographic styles for a block of rendered HTML/markdown
 * (e.g. MDX, a rich-text editor's output). No `@tailwindcss/typography`
 * dependency — the descendant utilities are scanned from the compiled output.
 *
 * Prose inherits its font size from where it is placed (a 14px console panel, a 16px help
 * article) and scales everything else from it; it owns the reading rhythm — relaxed line
 * height, paragraph and heading spacing — that Typography deliberately does not.
 */
const proseClassName = cn(
  "max-w-none font-sans text-foreground wrap-break-word",
  "[&>:first-child]:mt-0",
  "[&_:is(h1,h2,h3,h4)]:font-heading [&_:is(h1,h2,h3,h4)]:font-semibold [&_:is(h1,h2,h3,h4)]:text-balance [&_:is(h1,h2,h3,h4)]:tracking-(--qx-typography-heading-letter-spacing) [&_:is(h1,h2,h3,h4)]:scroll-m-20",
  "[&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:text-2xl/(--qx-typography-title-line-height)",
  "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl/(--qx-typography-heading-line-height)",
  "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg/(--qx-typography-heading-line-height)",
  "[&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-base/snug",
  "[&_p]:leading-relaxed [&_p]:text-pretty [&_p:not(:first-child)]:mt-4",
  "[&_ul]:my-4 [&_ul]:ms-6 [&_ul]:list-disc [&_ol]:my-4 [&_ol]:ms-6 [&_ol]:list-decimal",
  "[&_li]:leading-relaxed [&_li+li]:mt-1 [&_li]:marker:text-muted-foreground",
  "[&_blockquote]:mt-4 [&_blockquote]:border-s-2 [&_blockquote]:border-border-strong [&_blockquote]:ps-4 [&_blockquote]:text-muted-foreground",
  "[&_code]:rounded-(--qx-component-typography-code-corner) [&_code]:bg-(--qx-component-typography-code-background) [&_code]:px-(--qx-component-typography-code-padding-inline) [&_code]:py-(--qx-component-typography-code-padding-block) [&_code]:font-mono [&_code]:text-(length:--qx-component-typography-code-font-size) [&_code]:box-decoration-clone [&_code]:wrap-anywhere",
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-(--qx-component-typography-code-background) [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-code",
  "[&_pre>code]:bg-transparent [&_pre>code]:p-0 [&_pre>code]:text-[1em] [&_pre>code]:wrap-normal",
  "[&_a]:rounded-sm [&_a]:font-medium [&_a]:text-link [&_a:hover]:text-link-hover [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-[0.25em] [&_a:focus-visible]:focus-ring",
  "[&_hr]:my-8 [&_hr]:border-border",
  "[&_img]:rounded-lg [&_strong]:font-semibold",
);

/**
 * Two reading sizes:
 *
 *   - `md` (default) — articles, help pages, release notes: relaxed line height, spacious
 *     headings. Exactly `proseClassName`.
 *   - `sm` — compact prose for editing surfaces and dense console panels (a rich-text editor,
 *     a comment, a policy preview): a fixed 24px line and a heading ladder one step down
 *     (20 · 18 · 16 · 14px) with tighter spacing, so content does not dwarf the controls
 *     around it.
 *
 * Each string is already merged, so it can be used on its own — `className={proseVariants({
 * size: "sm" })}` — without a consumer restating overrides.
 */
const proseVariants = cva("", {
  variants: {
    size: {
      md: proseClassName,
      sm: cn(
        proseClassName,
        "[&_p]:leading-6 [&_li]:leading-6",
        "[&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-xl/(--qx-typography-heading-line-height)",
        "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg/(--qx-typography-heading-line-height)",
        "[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-base/snug",
        "[&_h4]:mt-4 [&_h4]:mb-1.5 [&_h4]:text-sm/snug",
        "[&_ul]:my-3 [&_ol]:my-3 [&_blockquote]:mt-3 [&_pre]:my-3 [&_pre]:p-3 [&_hr]:my-6",
      ),
    },
  },
  defaultVariants: { size: "md" },
});

interface ProseProps extends React.ComponentProps<"div">, VariantProps<typeof proseVariants> {}

function Prose({ className, size, ...props }: ProseProps) {
  return (
    <div
      data-slot="prose"
      data-size={size ?? "md"}
      className={cn(proseVariants({ size }), className)}
      {...props}
    />
  );
}

export type { ProseProps, TypographyProps, TypographyVariant };
export { Prose, proseClassName, proseVariants, Typography, typographyVariants };
