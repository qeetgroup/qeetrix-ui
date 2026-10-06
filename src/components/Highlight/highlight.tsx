import * as React from "react";

import { cn } from "@/lib/utils";

interface HighlightProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The full text to render. */
  children: string;
  /** Substring(s) to emphasise. Empty and whitespace-only terms are ignored. */
  query: string | string[];
  caseSensitive?: boolean;
  /** Class applied to each `<mark>`. */
  markClassName?: string;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wraps matched substrings of `children` in `<mark>` — for search-result emphasis.
 *
 * The mark is Qeet's emphasis tint rather than highlighter yellow, translucent so it stays
 * visible on a hovered or selected (brand-subtle) row, with the matched text lifted to primary
 * text and medium weight so the match never depends on colour alone. It adds no width: the
 * tint's padding is cancelled by an equal negative margin, so results do not shift sideways as
 * a query is typed. In forced-colours mode it uses the system `Mark` colours.
 *
 * Terms are matched longest first, so `["pay", "payroll"]` marks all of "payroll" rather than
 * stopping at "pay".
 */
function Highlight({
  children,
  query,
  caseSensitive = false,
  markClassName,
  className,
  ...props
}: HighlightProps) {
  const terms = (Array.isArray(query) ? query : [query])
    .filter((term) => term.trim() !== "")
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);

  if (terms.length === 0) {
    return (
      <span data-slot="highlight" className={className} {...props}>
        {children}
      </span>
    );
  }

  // Capturing group → split alternates [text, match, text, match, …]; odd indices are matches.
  const re = new RegExp(`(${terms.join("|")})`, caseSensitive ? "g" : "gi");
  const parts = children.split(re);
  // Content-derived, occurrence-disambiguated keys (segments can repeat) so we
  // never key on the raw array index.
  const seen = new Map<string, number>();

  return (
    <span data-slot="highlight" className={className} {...props}>
      {parts.map((part, i) => {
        const isMatch = i % 2 === 1;
        const id = `${isMatch ? "m" : "t"}:${part}`;
        const occurrence = seen.get(id) ?? 0;
        seen.set(id, occurrence + 1);
        const key = `${id}#${occurrence}`;
        return isMatch ? (
          <mark
            key={key}
            data-slot="highlight-mark"
            className={cn(
              "rounded-(--qx-component-highlight-corner) bg-(--qx-component-highlight-background) font-medium text-(--qx-component-highlight-foreground)",
              "-mx-(--qx-component-highlight-padding-inline) px-(--qx-component-highlight-padding-inline) box-decoration-clone",
              "forced-colors:bg-[Mark] forced-colors:text-[MarkText]",
              markClassName,
            )}
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={key}>{part}</React.Fragment>
        );
      })}
    </span>
  );
}

export type { HighlightProps };
export { Highlight };
