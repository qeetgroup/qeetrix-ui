"use client";

import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field";
import { MinusIcon, PlusIcon } from "lucide-react";

import type { MessagesFor } from "@/lib/messages";
import { numberFieldMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/**
 * NumberField is a numeric input with stepper buttons, scrubbing, and locale
 * formatting (pass `format={{ style: "currency", currency: "USD" }}` etc.).
 * Forwards all Base UI NumberField.Root props (`value`, `onValueChange`,
 * `min`, `max`, `step`, `format`, `defaultValue`, `disabled`, `name`, …).
 */
interface NumberFieldProps extends NumberFieldPrimitive.Root.Props {
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"numberField">;
}

function NumberField({
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  messages: messageOverrides,
  ...props
}: NumberFieldProps) {
  const messages = useMessages("numberField", numberFieldMessages, messageOverrides);
  return (
    <NumberFieldPrimitive.Root
      data-slot="number-field"
      className={cn("inline-flex flex-col", className)}
      {...props}
    >
      <NumberFieldPrimitive.Group className="flex h-[var(--qx-control-height)] items-stretch rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 data-disabled:pointer-events-none data-disabled:opacity-disabled dark:bg-input/30">
        <NumberFieldPrimitive.Decrement
          aria-label={messages.decrease}
          className="flex w-8 items-center justify-center rounded-s-lg border-e border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-disabled"
        >
          <MinusIcon aria-hidden className="size-4" />
        </NumberFieldPrimitive.Decrement>
        <NumberFieldPrimitive.Input
          // The Root's aria-* land on the wrapper, not the field, so the input had no accessible
          // name at all — forward them, the same way Slider does for its thumb.
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          className="w-full min-w-0 bg-transparent px-2.5 text-center text-base tabular-nums outline-none md:text-sm"
        />
        <NumberFieldPrimitive.Increment
          aria-label={messages.increase}
          className="flex w-8 items-center justify-center rounded-e-lg border-s border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-disabled"
        >
          <PlusIcon aria-hidden className="size-4" />
        </NumberFieldPrimitive.Increment>
      </NumberFieldPrimitive.Group>
    </NumberFieldPrimitive.Root>
  );
}

export type { NumberFieldProps };
export { NumberField };
