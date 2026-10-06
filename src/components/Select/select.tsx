"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import * as React from "react";

import { fieldText, fieldTrigger } from "@/internal/field-styles";
import { cn } from "@/lib/utils";

/**
 * Recursively derives a `value -> label` map from `<SelectItem>` descendants.
 *
 * Base UI's `<Select.Value>` resolves the selected label from the root's `items`
 * map; with no map it renders the raw `value`. The option labels live in the
 * items' `<Select.ItemText>`, which are only mounted (in a portal) while the
 * popup is open — hence the closed trigger showing the id. Reading the JSX
 * children (always present) lets the label resolve whether the popup is open or
 * closed, with no call-site changes. See qeetgroup/qeetrix#30.
 */
function collectSelectItems(children: React.ReactNode): Record<string, React.ReactNode> {
  const items: Record<string, React.ReactNode> = {};

  const walk = (node: React.ReactNode): void => {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) {
        return;
      }
      const childProps = child.props as { value?: unknown; children?: React.ReactNode };
      if (child.type === SelectItem || child.type === SelectPrimitive.Item) {
        // A SelectItem's own children are its label. Only primitive values can key
        // Base UI's record-shaped `items`; object values need an explicit `items`
        // or `itemToStringLabel`, which the consumer supplies (and which wins below).
        const { value } = childProps;
        if (typeof value === "string" || typeof value === "number") {
          items[String(value)] = childProps.children;
        }
        return; // items never nest inside items
      }
      // Recurse through wrappers: SelectContent, SelectGroup, fragments, arrays, …
      walk(childProps.children);
    });
  };

  walk(children);
  return items;
}

/**
 * Wraps Base UI's `Select.Root`, auto-deriving the `items` label map from the
 * declared `<SelectItem>`s so the closed trigger shows the option's label rather
 * than its raw value. An explicit `items` prop (or a function child on
 * `<SelectValue>`) is respected and takes precedence over the derived map.
 */
function Select<Value, Multiple extends boolean | undefined = false>({
  children,
  items,
  ...props
}: SelectPrimitive.Root.Props<Value, Multiple>) {
  const resolvedItems = items ?? collectSelectItems(children);
  return (
    <SelectPrimitive.Root items={resolvedItems} {...props}>
      {children}
    </SelectPrimitive.Root>
  );
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1", className)}
      {...props}
    />
  );
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn(
        "block min-w-0 flex-1 truncate text-start [&_svg]:me-1.5 [&_svg]:inline-block [&_svg]:align-[-0.125em]",
        className,
      )}
      {...props}
    />
  );
}

/** The select trigger's props. `size` follows the control scale shared with Input. */
type SelectTriggerProps = SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default";
};

/**
 * The closed select. It is drawn with Input's own field recipe (`fieldTrigger` from
 * `field-styles`: fill, ≥3:1 boundary, hover, focus, invalid, warning/success from the enclosing
 * `Field`, dashed read-only, disabled), so a form mixing text fields, selects and comboboxes
 * reads as one set of controls. While the popup is open the boundary holds its hover edge and
 * the chevron turns, so "open" never rests on the popup alone.
 *
 * `sm` is one step under the density-resolved control height rather than a fixed 28px, so it
 * follows compact and comfortable density too. A long value truncates; the trigger never
 * outgrows its container.
 */
function SelectTrigger({ className, size = "default", children, ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        fieldTrigger,
        fieldText,
        "flex w-fit max-w-full items-center justify-between gap-1.5 py-1 ps-2.5 pe-2 whitespace-nowrap select-none",
        "data-readonly:cursor-default",
        "data-[size=default]:h-(--qx-component-input-height) data-[size=sm]:h-[calc(var(--qx-component-input-height)-0.25rem)] data-[size=sm]:rounded-md data-[size=sm]:ps-2 data-[size=sm]:pe-1.5",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon
            aria-hidden
            className="pointer-events-none size-4 text-muted-foreground transition-transform duration-fast ease-standard data-popup-open:rotate-180"
          />
        }
      />
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-(--qx-z-popover)"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "relative isolate z-(--qx-z-popover) max-h-(--available-height) w-(--anchor-width) min-w-36 max-w-(--available-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto overscroll-contain rounded-(--qx-corner-overlay) border border-border bg-popover bg-clip-padding text-popover-foreground shadow-popover",
            // The menus' enter/exit: same distance, scale and curves.
            "duration-fast ease-enter data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-1 data-[side=inline-end]:slide-in-from-start-1 data-[side=inline-start]:slide-in-from-end-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-97 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-97 data-closed:ease-exit",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List data-slot="select-list" className="p-1">
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * One option. The Qeet selected vocabulary, shared with `Combobox` and `Listbox`:
 *
 * - **highlighted** (pointer or keyboard) — the neutral interactive fill, as in menus;
 * - **selected** — the quiet `brand-subtle` tint with the label kept in `text-foreground`, plus a
 *   `text-brand` check at the inline end, so selection never rests on the tint;
 * - **selected + highlighted** — the tint deepens one step;
 * - **keyboard focus** — an inset ring, because the fill alone is a ~1.1:1 change.
 *
 * Rows are one step under the density-resolved control height (and 44px on coarse pointers), and
 * long labels wrap rather than clip, so nothing is lost in a narrow popup.
 *
 * `data-[selected]:` is deliberate, not a non-canonical spelling: shadcn's `data-selected`
 * custom variant matches only `[data-selected="true"]`, and Base UI writes a bare
 * `data-selected=""`, so the short form never applies.
 */
function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-[calc(var(--qx-control-height)-0.25rem)] w-full cursor-default items-center gap-2 rounded-md py-1 ps-2 pe-8 text-sm text-foreground outline-none select-none pointer-coarse:min-h-11",
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        "data-[selected]:bg-brand-subtle data-[selected]:text-foreground data-[selected]:data-highlighted:bg-brand-subtle-hover",
        "focus-visible:focus-ring-inset",
        "data-disabled:pointer-events-none data-disabled:opacity-disabled",
        "data-highlighted:forced-colors-selected",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex min-w-0 flex-1 items-center gap-2 wrap-break-word">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span
            data-slot="select-item-indicator"
            className="pointer-events-none absolute inset-e-2 flex size-4 items-center justify-center text-brand forced-colors:text-inherit"
          />
        }
      >
        <CheckIcon aria-hidden strokeWidth={2.5} className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon aria-hidden />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon aria-hidden />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export type { SelectTriggerProps };
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
