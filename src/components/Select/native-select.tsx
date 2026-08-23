import { ChevronDownIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative inline-flex w-full">
      <select
        data-slot="native-select"
        className={cn(
          // sizing + layout
          "h-(--qx-control-height) w-full min-w-0 appearance-none",
          // shape + border
          "rounded-lg border border-input",
          // background
          "bg-transparent dark:bg-input/30",
          // spacing — extra right padding reserves room for the chevron
          "px-3 pe-8 py-1",
          // typography
          "text-sm text-foreground",
          // transition
          "transition-colors",
          // no native outline; we handle focus ourselves
          "outline-none",
          // interaction
          "cursor-pointer",
          // focus ring — matches ring-offset convention for selects
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // disabled
          "disabled:cursor-not-allowed disabled:opacity-disabled",
          className,
        )}
        {...props}
      >
        {children}
      </select>

      {/* Decorative chevron — hidden from AT */}
      <ChevronDownIcon
        aria-hidden={true}
        className="pointer-events-none absolute inset-e-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { NativeSelect };
