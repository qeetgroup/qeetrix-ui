"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

import { cn } from "@/lib/utils";

/**
 * A single section that shows and hides its content. Unstyled on purpose: compose the trigger
 * you need, such as a ghost `Button`.
 */
function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

/**
 * Unstyled on purpose — compose the trigger you need, e.g. `render={<Button variant="ghost" />}`,
 * and it inherits that component's focus ring and states. Base UI supplies `aria-expanded`,
 * `aria-controls` and `data-panel-open` for an indicator to rotate on.
 */
function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />;
}

/**
 * The disclosed region. Opens and closes with the same height motion as an accordion panel
 * (the duration is `--qx-component-accordion-duration`, so the two stay in step), which
 * collapses to near-zero under `prefers-reduced-motion`. Like the accordion panel it clips with a
 * clip-path that reaches a focus ring's width past its edges rather than with `overflow: hidden`,
 * so a control flush with the edge keeps its whole ring. Opt out with `className="transition-none"`.
 */
function CollapsibleContent({ className, ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(
        "h-(--collapsible-panel-height) flow-root [clip-path:inset(calc(-1*var(--qx-component-accordion-focus-bleed))_calc(-1*var(--qx-component-accordion-focus-bleed))_0)] transition-[height] duration-(--qx-component-accordion-duration) ease-standard data-ending-style:h-0 data-starting-style:h-0",
        className,
      )}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
