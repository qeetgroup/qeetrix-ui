"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

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
  className?: string;
}

const norm = (deg: number) => ((Math.round(deg) % 360) + 360) % 360;

/** Circular slider for selecting a 0–360° angle (APG Slider). */
function AngleSlider({
  value,
  defaultValue = 0,
  onValueChange,
  size = 80,
  step = 1,
  disabled,
  readOnly,
  "aria-label": ariaLabel = "Angle",
  className,
}: AngleSliderProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const angle = norm(isControlled ? (value as number) : internal);
  const ref = React.useRef<HTMLDivElement>(null);

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
        next = 359;
        break;
      default:
        return;
    }
    e.preventDefault();
    set(next);
  };

  const radius = size / 2;
  const thumb = Math.max(10, size * 0.16);
  const rad = ((angle - 90) * Math.PI) / 180;
  const tx = radius + (radius - thumb / 2 - 2) * Math.cos(rad);
  const ty = radius + (radius - thumb / 2 - 2) * Math.sin(rad);

  return (
    <div
      ref={ref}
      data-slot="angle-slider"
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={angle}
      aria-disabled={disabled || undefined}
      aria-readonly={readOnly || undefined}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      className={cn(
        "group relative rounded-full border border-border bg-muted shadow-inset-subtle outline-none focus-visible:ring-3 focus-visible:ring-ring/disabled dark:bg-input/30",
        disabled && "opacity-disabled",
        !disabled && !readOnly && "cursor-pointer",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden
        className="absolute rounded-full bg-primary shadow-sm ring-2 ring-background transition-shadow group-hover:ring-[length:var(--qx-focus-ring-width)] group-focus-visible:ring-[length:var(--qx-focus-ring-width)]"
        style={{ width: thumb, height: thumb, left: tx - thumb / 2, top: ty - thumb / 2 }}
      />
    </div>
  );
}

export type { AngleSliderProps };
export { AngleSlider };
