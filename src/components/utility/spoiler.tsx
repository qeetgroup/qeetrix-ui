"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface SpoilerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lines shown before truncating. */
  maxLines?: number;
  showLabel?: string;
  hideLabel?: string;
  defaultExpanded?: boolean;
}

/** Truncates content to `maxLines` with an inline show-more/less toggle (Disclosure). */
function Spoiler({
  maxLines = 3,
  showLabel = "Show more",
  hideLabel = "Show less",
  defaultExpanded = false,
  className,
  children,
  ...props
}: SpoilerProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const contentId = React.useId();

  return (
    <div data-slot="spoiler" className={cn("flex flex-col items-start", className)} {...props}>
      <div
        id={contentId}
        data-slot="spoiler-content"
        className={cn(
          "relative",
          !expanded && "overflow-hidden mask-[linear-gradient(to_bottom,black_55%,transparent)]",
        )}
        style={
          !expanded
            ? ({
                display: "-webkit-box",
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: "vertical",
              } as React.CSSProperties)
            : undefined
        }
      >
        {children}
      </div>
      <button
        type="button"
        data-slot="spoiler-toggle"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((e) => !e)}
        className="mt-1 rounded text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {expanded ? hideLabel : showLabel}
      </button>
    </div>
  );
}

export type { SpoilerProps };
export { Spoiler };
