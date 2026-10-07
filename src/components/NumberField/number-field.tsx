"use client";

import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field";
import { MinusIcon } from "@qeetrix/icons/icons/minus";
import { PlusIcon } from "@qeetrix/icons/icons/plus";

import { useFieldControl } from "@/components/Input/field";
import { fieldGroupInput, fieldGroupSurface } from "@/internal/field-styles";
import type { MessagesFor } from "@/lib/messages";
import { numberFieldMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

/**
 * NumberField is a numeric input with stepper buttons, scrubbing, and locale
 * formatting (pass `format={{ style: "currency", currency: "USD" }}` etc.).
 * Forwards all Base UI NumberField.Root props (`value`, `onValueChange`,
 * `min`, `max`, `step`, `format`, `defaultValue`, `disabled`, `name`, …).
 *
 * Keyboard (Base UI): ArrowUp/ArrowDown step by `step`, Shift+Arrow by `largeStep`, Alt+Arrow by
 * `smallStep`, Home/End jump to `min`/`max` when they are set. The stepper buttons are not tab
 * stops — the keys above do the same job from the input — but they stay operable by pointer and
 * touch, disable themselves at the bounds, and are named for assistive technology.
 *
 * Locale: `locale` falls back to the nearest `DirectionProvider`, so a `de-DE` app types and reads
 * `1.234,5` without each field being told. Inside a `Field`, the input takes the Field's label,
 * description, error and invalid state.
 */
interface NumberFieldProps extends NumberFieldPrimitive.Root.Props {
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"numberField">;
}

const stepper =
  "flex w-(--qx-component-input-height) shrink-0 items-center justify-center border-border text-muted-foreground outline-none transition-colors duration-fast ease-standard hover:bg-surface-interactive-hover hover:text-foreground active:bg-surface-interactive-active disabled:pointer-events-none disabled:text-(--qx-color-text-disabled) data-disabled:pointer-events-none data-disabled:text-(--qx-color-text-disabled) data-readonly:pointer-events-none data-readonly:text-(--qx-color-text-disabled) [&_svg]:size-4";

function NumberField({
  className,
  id,
  locale,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-errormessage": ariaErrormessage,
  "aria-invalid": ariaInvalid,
  messages: messageOverrides,
  ...props
}: NumberFieldProps) {
  const messages = useMessages("numberField", numberFieldMessages, messageOverrides);
  const contextLocale = useLocale();
  // The Root's aria-* land on the wrapper, not the field, so they are resolved here (with the
  // enclosing Field's association) and forwarded to the input, the same way Slider does for its
  // thumb.
  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    "aria-errormessage": ariaErrormessage,
    "aria-invalid": ariaInvalid,
  });
  return (
    <NumberFieldPrimitive.Root
      data-slot="number-field"
      id={field.id}
      locale={locale ?? contextLocale}
      className={cn("inline-flex flex-col", className)}
      {...props}
    >
      <NumberFieldPrimitive.Group
        data-slot="number-field-group"
        className={cn(fieldGroupSurface, "flex h-(--qx-component-input-height) items-stretch")}
      >
        <NumberFieldPrimitive.Decrement
          aria-label={messages.decrease}
          data-slot="number-field-decrement"
          className={cn(
            stepper,
            "rounded-s-[max(0px,calc(var(--qx-component-input-corner)-1px))] border-e",
          )}
        >
          <MinusIcon aria-hidden />
        </NumberFieldPrimitive.Decrement>
        <NumberFieldPrimitive.Input
          data-slot="number-field-input"
          aria-roledescription={messages.roleDescription}
          // Direction from content, so a grouped value stays in number order in an RTL form.
          dir="auto"
          aria-label={ariaLabel}
          aria-labelledby={field["aria-labelledby"]}
          aria-describedby={field["aria-describedby"]}
          aria-errormessage={field["aria-errormessage"]}
          aria-invalid={field["aria-invalid"]}
          className={cn(fieldGroupInput, "h-full w-full px-2 text-center tabular-nums")}
        />
        <NumberFieldPrimitive.Increment
          aria-label={messages.increase}
          data-slot="number-field-increment"
          className={cn(
            stepper,
            "rounded-e-[max(0px,calc(var(--qx-component-input-corner)-1px))] border-s",
          )}
        >
          <PlusIcon aria-hidden />
        </NumberFieldPrimitive.Increment>
      </NumberFieldPrimitive.Group>
    </NumberFieldPrimitive.Root>
  );
}

export type { NumberFieldProps };
export { NumberField };
