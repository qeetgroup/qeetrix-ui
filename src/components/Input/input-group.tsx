"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";
import { fieldAction, fieldGroupInput, fieldGroupSurface } from "@/internal/field-styles";
import { cn } from "@/lib/utils";

/**
 * InputGroup composes a text input with leading/trailing addons — a search icon, a currency
 * symbol or unit, a fixed prefix (`https://`), or an action button. Place `InputGroupAddon`
 * (with `align="start" | "end"`) around an `InputGroupInput`; the group owns the border, the
 * writing surface and every state (hover, focus, invalid, read-only, disabled), read from the
 * input inside it.
 *
 * Addons come in two shapes. `variant="inline"` (default) sits on the field surface — icons,
 * symbols and units read as part of the value. `variant="segment"` is a divided, tinted cell —
 * fixed text the user cannot change (`https://`, `.qeet.in`). Put actions in an addon as
 * `InputGroupButton`s; the addon tightens its padding around them so the button sits flush.
 *
 * The group no longer clips its children, so a focused action button keeps its full focus
 * indicator; segment addons round their own outer corners instead.
 */
function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        fieldGroupSurface,
        "relative flex h-(--qx-component-input-height) items-stretch",
        className,
      )}
      {...props}
    />
  );
}

interface InputGroupAddonProps extends React.ComponentProps<"div"> {
  /** Which side of the input the addon sits on, in logical (RTL-aware) terms. */
  align?: "start" | "end";
  /**
   * `inline` sits on the field surface (icons, symbols, units); `segment` is a divided, tinted
   * cell for fixed text. Defaults to `inline`.
   */
  variant?: "inline" | "segment";
}

function InputGroupAddon({
  className,
  align = "start",
  variant = "inline",
  ...props
}: InputGroupAddonProps) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      data-variant={variant}
      className={cn(
        "flex shrink-0 items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // inline: padding only on the outer side; the input supplies the inner gap.
        "data-[variant=inline]:data-[align=start]:ps-2.5 data-[variant=inline]:data-[align=end]:pe-2.5",
        // segment: a tinted cell with a decorative divider, rounded on its outer corners.
        "data-[variant=segment]:bg-surface-subtle data-[variant=segment]:px-2.5 data-[variant=segment]:border-border data-[variant=segment]:data-[align=start]:rounded-s-[inherit] data-[variant=segment]:data-[align=start]:border-e data-[variant=segment]:data-[align=end]:rounded-e-[inherit] data-[variant=segment]:data-[align=end]:border-s",
        // around action buttons the addon tightens so the button sits flush with the field edge.
        "has-[>[data-slot=input-group-button]]:gap-0.5 data-[align=end]:has-[>[data-slot=input-group-button]]:pe-1 data-[align=start]:has-[>[data-slot=input-group-button]]:ps-1",
        className,
      )}
      {...props}
    />
  );
}

/**
 * An icon action inside an `InputGroupAddon` — clear, copy, reveal, search. Always give it an
 * accessible name (`aria-label`). Defaults to `type="button"` so it never submits a form.
 */
function InputGroupButton({
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type={type}
      data-slot="input-group-button"
      className={cn(fieldAction, className)}
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
        fieldGroupInput,
        "h-full w-full rounded-[inherit] px-2.5 py-1",
        // next to an inline addon the input gives up part of its padding, so an icon and the
        // text it introduces sit 8px apart rather than 20px.
        "[[data-slot=input-group-addon][data-variant=inline]+&]:ps-2 has-[+[data-slot=input-group-addon][data-variant=inline]]:pe-2",
        className,
      )}
      {...props}
    />
  );
}

export type { InputGroupAddonProps };
export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput };
