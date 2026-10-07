"use client";

import { StarIcon } from "@qeetrix/icons/icons/star";
import * as React from "react";
import { FieldHiddenInput, useFieldControl } from "@/components/Input/field";
import { useControllableState } from "@/hooks/use-controllable-state";
import { inlineAxisSign, logicalDirectionForKey } from "@/lib/direction";
import { ratingMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useLocale, useResolvedDirection } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

interface RatingProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  /** Current rating. Supports halves (e.g. `3.5`) when `allowHalf`. */
  value?: number;
  /** Initial rating when uncontrolled. Defaults to `0`. */
  defaultValue?: number;
  /** Provide to make the rating interactive. Omit (or set `readOnly`) for display only. */
  onChange?: (value: number) => void;
  /** Number of icons. Defaults to `5`. */
  max?: number;
  /** Allow half-icon precision on click and keyboard. */
  allowHalf?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  /** Swap the star for any `@qeetrix/icons` icon (e.g. `HeartIcon`). */
  icon?: React.ComponentType<{ className?: string }>;
  /** Submits the numeric rating under this name. Omit and nothing is serialised. */
  name?: string;
  /** Associate the submitted value with a form it is not nested inside, by form `id`. */
  form?: string;
  /**
   * Show the number beside the icons — "4.5" — so the value reads as text, not only as a
   * proportion of filled shapes. Follows the hover preview while pointing. Presentational: the
   * accessible name already states the value.
   */
  showValue?: boolean;
}

const sizeClasses = {
  sm: "size-3.5",
  default: "size-5",
  lg: "size-7",
} as const;

/**
 * Inline padding per icon while interactive, so each icon's pitch is at least the 24px WCAG 2.2
 * AA target size: 14 + 2×5, 20 + 2×2; the 28px icon already clears it.
 */
const hitClasses = {
  sm: "px-1.25",
  default: "px-0.5",
  lg: "",
} as const;

const valueClasses = {
  sm: "text-xs",
  default: "text-sm",
  lg: "text-base",
} as const;

/**
 * "4.5", and "4.0" rather than "4" when halves are possible, so a column of ratings lines up.
 * The locale comes from the nearest `DirectionProvider`; without one it is English, so the
 * server and the client agree.
 */
function formatRatingValue(value: number, allowHalf: boolean, locale: string | undefined) {
  return new Intl.NumberFormat(locale ?? "en", {
    minimumFractionDigits: allowHalf ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Star (or custom icon) rating. Interactive when `onChange` is supplied:
 * click an icon to set the value, or focus and use arrow keys. Renders as a
 * read-only `img` otherwise. Half values are supported via `allowHalf`.
 *
 * Mirrors under `dir="rtl"` on both input paths: the arrow key that points at the next star is
 * the one that raises the value, and the half-star split is measured from each star's
 * inline-start edge — the edge the partial fill grows from — so the two agree about which way
 * is "more".
 *
 * Forms: implements the composite-field contract (see `field.tsx`). Inside a `Field` the
 * slider takes the label, description and error association — the numeric value moves to
 * `aria-valuetext` ("3 of 5") so naming it after the field does not lose it. `name` submits
 * the number. There is no `required`: `aria-required` is not permitted on `slider`, and a
 * hidden value cannot be constraint-validated, so an empty rating is the consumer's check.
 */
function Rating({
  value: valueProp,
  defaultValue = 0,
  onChange,
  max = 5,
  allowHalf = false,
  readOnly,
  disabled,
  size = "default",
  icon: Icon = StarIcon,
  name,
  form,
  showValue = false,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  id,
  ...props
}: RatingProps) {
  const messages = useMessages("rating", ratingMessages);
  const [value, setValue] = useControllableState<number>({
    value: valueProp,
    defaultValue,
    onChange,
  });
  const rootRef = React.useRef<HTMLDivElement>(null);
  const direction = useResolvedDirection(rootRef);
  const locale = useLocale();
  // Interactive when the consumer can receive changes, or when the component owns the value.
  // Before uncontrolled support existed this was `!!onChange`, which would have left a
  // `defaultValue`-only Rating inert.
  const interactive = !readOnly && !disabled && (onChange !== undefined || valueProp === undefined);
  const [hover, setHover] = React.useState<number | null>(null);
  const display = hover ?? value;
  const step = allowHalf ? 0.5 : 1;
  const iconSize = sizeClasses[size];
  const uid = React.useId();
  // Stable per-position keys — the icons are positional and content-identical,
  // so we cannot key on the array index directly.
  const starKeys = React.useMemo(
    () => Array.from({ length: max }, (_, i) => `${uid}-${i}`),
    [uid, max],
  );

  function commit(next: number) {
    setValue(Math.max(0, Math.min(max, next)));
  }

  // Resolve a rating value from a pointer event on the container by locating the
  // star under the cursor via its data-rating-index. Keeping this on the
  // container (the role="slider" widget) avoids nesting interactive controls.
  //
  // The half-star split is measured from the star's *inline-start* edge, which is its right
  // edge under `dir="rtl"`. Measuring from `left` unconditionally split every mirrored star
  // the wrong way round: a click on the inline-start half — the half the partial fill
  // occupies, since `inset-0` plus an explicit width anchors to the right in an RTL
  // containing block — returned `index + 1` instead of `index + 0.5`. This is the same
  // mirroring the arrow keys do above, so a click one star further toward the inline end and
  // the key that raises the value now move in the same direction.
  //
  // Asserted in `src/__tests__/browser/rating-pointer.test.tsx`, not in jsdom: jsdom reports
  // an all-zero `getBoundingClientRect`, so both branches return the same value there and the
  // mirrored arithmetic is indistinguishable from the unmirrored.
  function valueFromPointer(e: React.MouseEvent<HTMLElement>): number | null {
    const starEl = (e.target as HTMLElement).closest<HTMLElement>("[data-rating-index]");
    if (!starEl) return null;
    const index = Number(starEl.dataset.ratingIndex);
    if (!allowHalf) return index + 1;
    const rect = starEl.getBoundingClientRect();
    const inlineStartEdge = direction === "rtl" ? rect.right : rect.left;
    const fromInlineStart = inlineAxisSign(direction) * (e.clientX - inlineStartEdge);
    return fromInlineStart < rect.width / 2 ? index + 0.5 : index + 1;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!interactive) return;
    switch (e.key) {
      // The block axis does not mirror, so Up/Down are fixed. The inline axis does:
      // in RTL the higher rating is to the *left*, and `logicalDirectionForKey` is the
      // single place that decides which physical key that is.
      case "ArrowUp":
        e.preventDefault();
        commit(value + step);
        break;
      case "ArrowDown":
        e.preventDefault();
        commit(value - step);
        break;
      case "ArrowLeft":
      case "ArrowRight":
        e.preventDefault();
        commit(
          logicalDirectionForKey(e.key, direction) === "inline-end" ? value + step : value - step,
        );
        break;
      case "Home":
        e.preventDefault();
        commit(0);
        break;
      case "End":
        e.preventDefault();
        commit(max);
        break;
    }
  }

  // Stars are inert; the interactive container (role="slider") owns pointer +
  // keyboard interaction. data-rating-index lets the container map a click/hover
  // back to a star without nesting interactive controls.
  //
  // The value never rests on hue. An empty icon is an *outline* in the control-boundary colour
  // (≥3:1 on every surface; it was the muted text at 40%, ~1.6:1); a filled one is a *solid*
  // shape whose edge is the rating fill deepened toward the text colour (≥3.4:1 — the gold fill
  // alone is ~1.7:1 on a light surface). Filled-versus-outline is a shape difference, so the
  // value survives greyscale, colour-vision deficiency and forced colours.
  const stars = starKeys.map((starKey, i) => {
    const fill = Math.max(0, Math.min(1, display - i));
    return (
      <span
        key={starKey}
        data-rating-index={i}
        data-fill={fill === 1 ? "full" : fill === 0 ? "empty" : "partial"}
        className={cn("relative inline-flex", interactive && ["cursor-pointer", hitClasses[size]])}
      >
        <Icon className={cn(iconSize, "text-input")} />
        {/* The fill grows from the inline-start edge and carries the same hit padding as its
            star, so a half fill is exactly half of the icon, in either direction. */}
        <span
          className="absolute inset-y-0 inset-s-0 flex items-center overflow-hidden"
          style={{ width: `${fill * 100}%` }}
        >
          <span className={cn("flex shrink-0", interactive && hitClasses[size])}>
            <Icon
              className={cn(
                iconSize,
                "fill-rating-filled text-(--qx-component-rating-filled-edge) forced-colors:text-[Highlight]",
              )}
            />
          </span>
        </span>
      </span>
    );
  });

  const valueLabel = showValue ? (
    <span
      aria-hidden
      data-slot="rating-value"
      className={cn("ms-1.5 font-medium tabular-nums text-muted-foreground", valueClasses[size])}
    >
      {formatRatingValue(display, allowHalf, locale)}
    </span>
  ) : null;

  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });
  // A Field label wins over the built-in fallback; the value it displaces is carried by
  // aria-valuetext, which a slider exposes alongside its name rather than instead of it.
  const valueText = messages.valueText(value, max);
  const selfLabel = ariaLabel ?? messages.label(valueText);
  const hidden = <FieldHiddenInput name={name} value={value} form={form} disabled={disabled} />;

  if (interactive) {
    return (
      <div
        ref={rootRef}
        data-slot="rating"
        data-direction={direction}
        role="slider"
        id={field.id}
        aria-label={field["aria-labelledby"] ? undefined : selfLabel}
        aria-labelledby={field["aria-labelledby"]}
        aria-describedby={field["aria-describedby"]}
        aria-errormessage={field["aria-errormessage"]}
        aria-invalid={field["aria-invalid"]}
        aria-valuenow={value}
        aria-valuetext={valueText}
        aria-valuemin={0}
        aria-valuemax={max}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          const next = valueFromPointer(e);
          if (next != null) commit(next);
        }}
        onMouseMove={(e) => {
          const next = valueFromPointer(e);
          if (next != null) setHover(next);
        }}
        onMouseLeave={() => setHover(null)}
        className={cn(
          // The per-icon hit padding is the spacing here, so there is no gap.
          "inline-flex items-center rounded-md focus-visible:focus-ring aria-invalid:focus-visible:outline-destructive",
          className,
        )}
        {...props}
      >
        {hidden}
        {stars}
        {valueLabel}
      </div>
    );
  }

  // Display-only: role="img" has no aria-valuetext, so it keeps its self-contained name —
  // borrowing the Field label here would drop the value from the announcement entirely. The
  // description and error still reach it, and a read-only value still submits, as a native
  // `readOnly` input's does.
  return (
    <div
      data-slot="rating"
      role="img"
      id={field.id}
      aria-label={selfLabel}
      aria-describedby={field["aria-describedby"]}
      aria-invalid={field["aria-invalid"]}
      className={cn("inline-flex items-center gap-0.5", disabled && "opacity-disabled", className)}
      {...props}
    >
      {hidden}
      {stars}
      {valueLabel}
    </div>
  );
}

export type { RatingProps };
export { Rating };
