"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * InputGroup composes a text input with leading/trailing addons — currency
 * symbols, units, fixed prefixes (https://), or icon buttons. Place
 * `InputGroupAddon` (with `align="start" | "end"`) around an
 * `InputGroupInput`; the group owns the border + focus ring.
 */
function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "flex h-[var(--qx-density-control-height,2rem)] w-full items-stretch overflow-hidden rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-[input:disabled]:opacity-disabled dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupAddon({
  className,
  align = "start",
  ...props
}: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        "flex items-center border-input bg-muted/40 px-2.5 text-sm text-muted-foreground select-none data-[align=end]:border-s data-[align=start]:border-e [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input-group-input"
      className={cn(
        "h-full w-full min-w-0 flex-1 bg-transparent px-2.5 py-1 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { InputGroup, InputGroupAddon, InputGroupInput };
