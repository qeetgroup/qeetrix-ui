import type * as React from "react";

import { cn } from "@/lib/utils";

/** A keyboard-shortcut hint glyph. Group multiple with `KbdGroup` (e.g. ⌘ + K). */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded-[var(--qx-component-kbd-corner)] border border-border bg-muted px-1.5 font-sans text-micro font-medium text-muted-foreground select-none",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
