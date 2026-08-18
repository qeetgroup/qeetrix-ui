import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Key-value detail view for entity/settings pages. Render `DescriptionTerm` +
 * `DescriptionDetails` pairs as direct children; they lay out as a responsive
 * two-column grid (stacked on mobile, term/value columns from `sm`).
 */
function DescriptionList({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl
      data-slot="description-list"
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[minmax(8rem,12rem)_1fr]",
        className,
      )}
      {...props}
    />
  );
}

function DescriptionTerm({ className, ...props }: React.ComponentProps<"dt">) {
  return (
    <dt
      data-slot="description-term"
      className={cn("font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

function DescriptionDetails({ className, ...props }: React.ComponentProps<"dd">) {
  return (
    <dd data-slot="description-details" className={cn("text-foreground", className)} {...props} />
  );
}

export { DescriptionDetails, DescriptionList, DescriptionTerm };
