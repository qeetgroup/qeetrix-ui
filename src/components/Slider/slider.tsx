import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

/**
 * The slider's props: Base UI's root props, plus per-thumb naming for range sliders.
 *
 * A range slider renders one thumb per value, and every thumb is its own `role="slider"` — so
 * "Price" announced twice is two indistinguishable controls. `getAriaLabel` names each thumb
 * ("Minimum price", "Maximum price"); `getAriaValueText` turns the number into words ("₹2,000").
 */
type SliderProps = SliderPrimitive.Root.Props & {
  /** Accessible name for the thumb at `index`. Takes precedence over `aria-label` per thumb. */
  getAriaLabel?: (index: number) => string;
  /** Human-readable value for the thumb at `index`, announced instead of the bare number. */
  getAriaValueText?: (formattedValue: string, value: number, index: number) => string;
};

/**
 * Qeet slider. A quiet graphite rail, an Ember range, and a thumb drawn as a surface disc inside
 * a 2px `border-brand` ring — the ring clears 3:1 on every surface in both themes, where a solid
 * Ember disc does not (2.6–3.0:1 on light surfaces), and the surface centre separates the thumb
 * from the Ember range it sits on. The thumb scales slightly while dragged; the motion collapses
 * under reduced motion like every CSS transition.
 *
 * The thumb is 16px with a 32px pointer target; the control is as tall as the thumb, so the
 * thumb never overlaps the content around it. Orientation, keyboard (arrows, Page Up/Down,
 * Home/End, Shift for large steps) and RTL mirroring are Base UI's.
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  getAriaLabel,
  getAriaValueText,
  ...props
}: SliderProps) {
  // One thumb per value. The fallback used to be `[min, max]`, which meant a single-value slider
  // — the common case — rendered TWO thumbs: a duplicate slider in the accessibility tree, a
  // phantom tab stop, and a second dot on the track. A slider with no array value has one thumb.
  const thumbCount = Array.isArray(value)
    ? value.length
    : Array.isArray(defaultValue)
      ? defaultValue.length
      : 1;

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      {...props}
    >
      <SliderPrimitive.Control
        data-slot="slider-control"
        className="relative flex w-full touch-none items-center select-none data-disabled:cursor-not-allowed data-disabled:opacity-disabled data-horizontal:min-h-4 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:min-w-4 data-vertical:flex-col"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-border-strong select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1 forced-colors:bg-[GrayText]"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="rounded-full bg-primary select-none data-horizontal:h-full data-vertical:w-full forced-colors:bg-[Highlight]"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: thumbCount }, (_, i) => i).map((index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={`slider-thumb-${index}`}
            index={thumbCount > 1 ? index : undefined}
            // Base UI labels the thumb's hidden range <input> from the thumb's
            // own aria-* (the Root's don't propagate), so forward them here —
            // otherwise the input trips axe's "label" rule.
            aria-label={getAriaLabel ? getAriaLabel(index) : ariaLabel}
            aria-labelledby={getAriaLabel ? undefined : ariaLabelledby}
            getAriaValueText={getAriaValueText}
            className={cn(
              "relative block size-4 shrink-0 rounded-full border-2 border-border-brand bg-surface shadow-rest select-none after:absolute after:-inset-2 after:rounded-full",
              "transition-[scale,box-shadow] duration-fast ease-standard",
              "not-data-disabled:hover:shadow-hover data-dragging:scale-110 data-dragging:shadow-hover",
              "has-focus-visible:focus-ring",
              "data-disabled:pointer-events-none",
              "forced-colors:border-[CanvasText] forced-colors:bg-[Canvas]",
            )}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export type { SliderProps };
export { Slider };
