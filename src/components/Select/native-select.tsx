import { ChevronDownIcon } from "@qeetrix/icons/icons/chevron-down";
import type * as React from "react";

import { fieldText, fieldTrigger } from "@/internal/field-styles";
import { cn } from "@/lib/utils";

/**
 * The platform `<select>`, drawn to match `SelectTrigger` — the same field recipe
 * (`fieldTrigger`), the same chevron at the same inset — so the native and the custom select can
 * sit in one form.
 *
 * Reach for it when the platform list is the better list: mobile hosted flows (the OS picker),
 * browser autofill (`autoComplete="country"`), and forms that must work before hydration.
 *
 * Sizing: the select fills its container by default. Give it a width (`className="w-56"`) and
 * the wrapper shrinks to it, so the chevron stays at the select's own inline end.
 *
 * Text is 16px below the `md` breakpoint so iOS does not zoom the page when the select is
 * focused, and the placeholder option (`value=""`) is drawn in the placeholder colour.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div
      data-slot="native-select-wrapper"
      className="relative inline-flex w-full has-[select:not(.w-full)]:w-fit has-[select:not(.w-full)]:max-w-full"
    >
      <select
        data-slot="native-select"
        className={cn(
          // The field recipe for non-text controls: a <select> always matches `:read-only`, so
          // `fieldTrigger` (not `fieldSurface`) keeps its hover and avoids permanent dashes.
          fieldTrigger,
          fieldText,
          // sizing + layout — `w-full` is the default the wrapper keys off (see above)
          "peer h-(--qx-component-input-height) w-full cursor-pointer appearance-none truncate",
          // spacing — the inline-end padding reserves the chevron's lane, as in SelectTrigger
          "py-1 ps-2.5 pe-8",
          // the placeholder option (`value=""`) reads as a placeholder, as SelectValue's does
          "has-[option[value='']:checked]:text-(--qx-component-input-placeholder)",
          // the dropdown list itself, where the browser lets it be styled
          "[&_option]:bg-popover [&_option]:text-popover-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </select>

      {/* Decorative chevron — hidden from AT; dims with the select. */}
      <ChevronDownIcon
        aria-hidden={true}
        data-slot="native-select-icon"
        className="pointer-events-none absolute inset-e-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground peer-disabled:opacity-disabled"
      />
    </div>
  );
}

export { NativeSelect };
