"use client";

import { StarIcon } from "lucide-react";
import * as React from "react";
import { useControllableState } from "@/hooks/use-controllable-state";
import { cn } from "@/lib/utils";

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
  /** Swap the star for any lucide-style icon (e.g. `HeartIcon`). */
  icon?: React.ComponentType<{ className?: string }>;
}

const sizeClasses = {
  sm: "size-3.5",
  default: "size-5",
  lg: "size-7",
} as const;

/**
 * Star (or custom icon) rating. Interactive when `onChange` is supplied:
 * click an icon to set the value, or focus and use arrow keys. Renders as a
 * read-only `img` otherwise. Half values are supported via `allowHalf`.
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
  className,
  "aria-label": ariaLabel,
  ...props
}: RatingProps) {
  const [value, setValue] = useControllableState<number>({
    value: valueProp,
    defaultValue,
    onChange,
  });
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
  function valueFromPointer(e: React.MouseEvent<HTMLElement>): number | null {
    const starEl = (e.target as HTMLElement).closest<HTMLElement>("[data-rating-index]");
    if (!starEl) return null;
    const index = Number(starEl.dataset.ratingIndex);
    if (!allowHalf) return index + 1;
    const { left, width } = starEl.getBoundingClientRect();
    return e.clientX - left < width / 2 ? index + 0.5 : index + 1;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!interactive) return;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        commit(value + step);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        commit(value - step);
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
  const stars = starKeys.map((starKey, i) => {
    const fill = Math.max(0, Math.min(1, display - i));
    return (
      <span
        key={starKey}
        data-rating-index={i}
        className={cn("relative inline-flex", interactive && "cursor-pointer")}
      >
        <Icon className={cn(iconSize, "text-muted-foreground/40")} />
        <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
          <Icon className={cn(iconSize, "fill-amber-400 text-amber-400")} />
        </span>
      </span>
    );
  });

  const label = ariaLabel ?? `Rating: ${value} of ${max}`;

  if (interactive) {
    return (
      <div
        data-slot="rating"
        role="slider"
        aria-label={label}
        aria-valuenow={value}
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
          "inline-flex items-center gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          disabled && "opacity-disabled",
          className,
        )}
        {...props}
      >
        {stars}
      </div>
    );
  }

  return (
    <div
      data-slot="rating"
      role="img"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 outline-none",
        disabled && "opacity-disabled",
        className,
      )}
      {...props}
    >
      {stars}
    </div>
  );
}

export type { RatingProps };
export { Rating };
