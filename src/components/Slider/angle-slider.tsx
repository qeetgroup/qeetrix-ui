"use client";

import * as React from "react";

import { angleSliderMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

interface AngleSliderProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Diameter in px. */
  size?: number;
  /** Degrees per arrow-key step. */
  step?: number;
  disabled?: boolean;
  readOnly?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  /**
   * Human-readable value, announced instead of the bare number. Defaults to the angle with a
   * degree sign ("135°"), which every locale reads.
   */
  getAriaValueText?: (value: number) => string;
  className?: string;
}

const norm = (deg: number) => ((Math.round(deg) % 360) + 360) % 360;

/**
 * Circular slider for selecting a 0–360° angle (APG Slider).
 *
 * The dial reads like the linear `Slider`: a quiet rail ring, an Ember needle from the centre to
 * the thumb — so the angle is legible as a direction, not only as a dot on a rim — and the same
 * thumb, a surface disc in a 2px `border-brand` ring (≥3:1 on every surface). Arrow keys step,
 * Page Up/Down take ten steps, Home/End go to the ends; pointer and touch drag around the dial
 * (`touch-action: none`, so dragging does not scroll the page). The angle is direction-free, so
 * the keys do not mirror under `rtl`, and the geometry is physical on purpose.
 */
function AngleSlider({
  value,
  defaultValue = 0,
  onValueChange,
  size = 80,
  step = 1,
  disabled,
  readOnly,
  "aria-label": ariaLabelProp,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  getAriaValueText,
  className,
}: AngleSliderProps) {
  const messages = useMessages("angleSlider", angleSliderMessages);
  const ariaLabel = ariaLabelProp ?? messages.label;
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const angle = norm(isControlled ? (value as number) : internal);
  const ref = React.useRef<HTMLDivElement>(null);
  // 0° and 360° are the same direction, so the largest selectable value is one step short of a
  // full turn. `End` lands there, and `aria-valuemax` says so.
  const maxAngle = 360 - Math.max(1, step);

  const set = (next: number) => {
    const n = norm(next);
    if (!isControlled) setInternal(n);
    onValueChange?.(n);
  };

  const fromPointer = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const deg = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI + 90;
    set(deg);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || readOnly) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    fromPointer(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (disabled || readOnly || e.buttons !== 1) return;
    fromPointer(e.clientX, e.clientY);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || readOnly) return;
    let next: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = angle + step;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = angle - step;
        break;
      case "PageUp":
        next = angle + step * 10;
        break;
      case "PageDown":
        next = angle - step * 10;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = maxAngle;
        break;
      default:
        return;
    }
    e.preventDefault();
    set(next);
  };

  // Geometry is physical on purpose — a dial has no reading direction — so it lives in inline
  // style rather than in logical utilities.
  const radius = size / 2;
  const thumb = Math.max(12, Math.round(size * 0.18));
  const rail = 4;
  const reach = radius - thumb / 2 - 2;
  const rad = ((angle - 90) * Math.PI) / 180;
  const tx = radius + reach * Math.cos(rad);
  const ty = radius + reach * Math.sin(rad);
  const dot = 6;

  return (
    <div
      ref={ref}
      data-slot="angle-slider"
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      role="slider"
      aria-label={ariaLabelledby ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      aria-valuemin={0}
      aria-valuemax={maxAngle}
      aria-valuenow={angle}
      aria-valuetext={getAriaValueText ? getAriaValueText(angle) : messages.valueText(angle)}
      aria-disabled={disabled || undefined}
      aria-readonly={readOnly || undefined}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      className={cn(
        "group/angle-slider relative shrink-0 touch-none rounded-full bg-surface-sunken outline-none select-none",
        "focus-visible:focus-ring",
        "data-disabled:cursor-not-allowed data-disabled:opacity-disabled",
        !disabled && !readOnly && "cursor-pointer",
        "forced-colors:border forced-colors:border-[CanvasText]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* Rail: the circle the thumb travels, drawn under its centre like the linear rail. */}
      <span
        aria-hidden
        data-slot="angle-slider-track"
        className="pointer-events-none absolute rounded-full border-border-strong forced-colors:border-[GrayText]"
        style={{
          borderWidth: rail,
          left: radius - reach - rail / 2,
          top: radius - reach - rail / 2,
          width: reach * 2 + rail,
          height: reach * 2 + rail,
        }}
      />
      {/* Needle: centre to thumb, so the angle reads as a direction and not only as a dot. */}
      <span
        aria-hidden
        data-slot="angle-slider-needle"
        className="pointer-events-none absolute rounded-full bg-primary forced-colors:bg-[Highlight]"
        style={{
          left: radius - 1,
          top: radius - reach,
          width: 2,
          height: reach,
          transformOrigin: "50% 100%",
          transform: `rotate(${angle}deg)`,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full bg-primary forced-colors:bg-[Highlight]"
        style={{ left: radius - dot / 2, top: radius - dot / 2, width: dot, height: dot }}
      />
      <span
        aria-hidden
        data-slot="angle-slider-thumb"
        className={cn(
          "pointer-events-none absolute rounded-full border-2 border-border-brand bg-surface shadow-rest",
          "transition-shadow duration-fast ease-standard group-hover/angle-slider:shadow-hover",
          "forced-colors:border-[CanvasText] forced-colors:bg-[Canvas]",
        )}
        style={{ width: thumb, height: thumb, left: tx - thumb / 2, top: ty - thumb / 2 }}
      />
    </div>
  );
}

export type { AngleSliderProps };
export { AngleSlider };
