import * as React from "react";

import { cn } from "@/lib/utils";

interface HighlightProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The full text to render. */
  children: string;
  /** Substring(s) to emphasise. */
  query: string | string[];
  caseSensitive?: boolean;
  /** Class applied to each `<mark>`. */
  markClassName?: string;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wraps matched substrings of `children` in `<mark>` — for search-result emphasis. */
function Highlight({
  children,
  query,
  caseSensitive = false,
  markClassName,
  className,
  ...props
}: HighlightProps) {
  const terms = (Array.isArray(query) ? query : [query]).filter(Boolean).map(escapeRegExp);

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
        const occurrence = seen.get(part) ?? 0;
        seen.set(part, occurrence + 1);
        const key = `${part}#${occurrence}`;
        return i % 2 === 1 ? (
          <mark
            key={key}
            className={cn(
              "rounded-(--qx-component-highlight-corner) bg-primary/20 px-0.5 font-medium text-foreground dark:bg-primary/25",
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
