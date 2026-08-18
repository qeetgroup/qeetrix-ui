import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Vertical event/audit history. Compose `TimelineItem`s, each with a
 * `TimelineIndicator` (dot + connector) and a `TimelineContent`
 * (`TimelineTitle` / `TimelineTime` / `TimelineDescription`).
 */
function Timeline({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol data-slot="timeline" className={cn("flex flex-col", className)} {...props} />;
}

function TimelineItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="timeline-item"
      className={cn("group/timeline-item relative flex gap-3 pb-6 last:pb-0", className)}
      {...props}
    />
  );
}

/** The left rail: a dot plus the connector line down to the next item. */
function TimelineIndicator({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-indicator"
      className={cn("relative flex w-4 shrink-0 justify-center", className)}
      {...props}
    >
      {children ?? (
        <span className="z-10 mt-0.5 size-2.5 rounded-full bg-primary ring-4 ring-background" />
      )}
      <span
        aria-hidden
        className="absolute top-3 -bottom-6 w-px bg-border group-last/timeline-item:hidden"
      />
    </div>
  );
}

function TimelineContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-content"
      className={cn("-mt-0.5 flex flex-1 flex-col gap-0.5", className)}
      {...props}
    />
  );
}

function TimelineTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-title"
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

function TimelineTime({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-time"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function TimelineDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="timeline-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Timeline,
  TimelineContent,
  TimelineDescription,
  TimelineIndicator,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
};
