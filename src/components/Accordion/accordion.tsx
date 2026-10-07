"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDownIcon } from "@qeetrix/icons/icons/chevron-down";

import { cn } from "@/lib/utils";

/**
 * The panel motion Accordion and Collapsible share: height animates from Base UI's measured
 * `--*-panel-height`, and collapses to near-zero under `prefers-reduced-motion` through the base
 * layer (Base UI still receives `transitionend`, so unmounting is unaffected). collapsible.tsx
 * restates it rather than importing it: every module in a family is a public subpath, so a
 * shared constant would become API (scripts/build/subpath-shims.mjs fails closed on that).
 *
 * The panel does not use `overflow: hidden`. That clips a descendant's focus ring wherever the
 * descendant is flush with the panel edge — the common case for a full-width field or a button
 * at the start of the content. Instead the panel is a block formatting context (so a child's
 * margin cannot collapse out of the measured height) and is painted through a clip-path that
 * stops at its bottom edge, which is all the height animation needs, but reaches a focus ring's
 * width past its other three edges.
 */
const panelMotion =
  "flow-root [clip-path:inset(calc(-1*var(--qx-component-accordion-focus-bleed))_calc(-1*var(--qx-component-accordion-focus-bleed))_0)] transition-[height] duration-(--qx-component-accordion-duration) ease-standard data-ending-style:h-0 data-starting-style:h-0";

/**
 * A stack of sections whose headers show and hide their panels.
 */
function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root data-slot="accordion" className={cn("w-full", className)} {...props} />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        "border-b border-(--qx-component-accordion-divider) last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header data-slot="accordion-header" className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          // `items-start` so a label that wraps keeps its indicator on the first line, where the
          // eye looks for it; the indicator's 2px top margin centres it on that line.
          "group/accordion-trigger flex flex-1 items-start justify-between gap-4 rounded-sm py-(--qx-component-accordion-trigger-padding-block) text-start text-sm font-medium text-foreground outline-none",
          "focus-visible:focus-ring",
          "disabled:pointer-events-none disabled:opacity-disabled data-disabled:pointer-events-none data-disabled:opacity-disabled",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          aria-hidden
          data-slot="accordion-indicator"
          className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-[rotate,color] duration-(--qx-component-accordion-duration) ease-standard group-hover/accordion-trigger:text-foreground group-data-panel-open/accordion-trigger:rotate-180 group-data-panel-open/accordion-trigger:text-foreground"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className={cn(
        // Primary text, not muted: a panel holds content — policies, settings, forms — and
        // muted body copy (or muted labels inherited by a form inside it) costs readability.
        "h-(--accordion-panel-height) text-sm text-foreground",
        panelMotion,
        className,
      )}
      {...props}
    >
      <div data-slot="accordion-content-body" className="pt-0 pb-4">
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
