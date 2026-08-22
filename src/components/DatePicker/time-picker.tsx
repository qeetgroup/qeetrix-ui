"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select/select";
import { cn } from "@/lib/utils";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/* ── Step normalisation ────────────────────────────────────────────────────────────────────
 * `minuteStep` is `number` at the type level, so a consumer can hand this component `0`, `-5`,
 * `NaN`, `Infinity` or `0.1` and typecheck cleanly. A `0` or negative step makes the option loop
 * below non-terminating: the counter never reaches its bound, so the render never returns and the
 * main thread is gone. A non-finite step terminates but yields a single-option picker, and a
 * fractional step yields floating-point labels. All of them are normalisation problems, so they
 * are normalised once, here, rather than guarded at each call site.
 *
 * The bound is closed at both ends. Below `1` there is nothing finer than a minute to select;
 * above `30` a minute column holds one option, which is a column that cannot be used. Both ends
 * clamp instead of throwing — a picker that silently offers coarser minutes is recoverable, a
 * render that throws is not.
 */

/** Coarsest supported minute granularity; `60` would leave a single, unusable option. */
const MAX_MINUTE_STEP = 30;

/**
 * Normalise a consumer-supplied minute granularity to an integer in `[1, 30]`.
 * Anything that is not a finite number, and anything that rounds below `1`,
 * becomes `1`; anything above `30` becomes `30`.
 */
function normalizeMinuteStep(step: number): number {
  if (!Number.isFinite(step)) return 1;
  const rounded = Math.round(step);
  if (rounded < 1) return 1;
  return Math.min(rounded, MAX_MINUTE_STEP);
}

/**
 * `[0, stop)` in `step` increments. Total by construction: `step` is coerced to a positive
 * integer first, so no caller — present or future — can make this loop forever or emit
 * fractional values. Callers that care about the difference should normalise first with
 * {@link normalizeMinuteStep}.
 */
function range(stop: number, step: number): number[] {
  const safeStep = Number.isFinite(step) && step >= 1 ? Math.floor(step) : 1;
  const out: number[] = [];
  for (let i = 0; i < stop; i += safeStep) out.push(i);
  return out;
}

/** A minute a `Select` can actually hold: whole, and inside the hour. */
function isRenderableMinute(m: number): boolean {
  return Number.isInteger(m) && m >= 0 && m < 60;
}

/**
 * Minute options for `step`, plus `current` when the step grid does not land on it.
 *
 * A step that does not divide 60 (`7`, say) is honoured as given rather than rounded to a
 * divisor — the consumer asked for that granularity and 60 has few divisors. The consequence is
 * that a value already held by the form can fall between two options, and a `Select` cannot
 * display a value it has no item for: the minute column would read as empty while the component
 * believed it had a value. The off-grid minute is therefore added to the list, so the picker can
 * always render its own value. Changing minutes snaps back onto the grid.
 */
function minuteOptionsFor(step: number, current: number | null): number[] {
  const options = range(60, step);
  if (current === null || !isRenderableMinute(current) || options.includes(current)) return options;
  return [...options, current].sort((a, b) => a - b);
}

interface TimeParts {
  h: number;
  m: number;
  s: number;
}

/** Parse a canonical `"HH:mm"` / `"HH:mm:ss"` (24h) string. */
function parseTime(value?: string): TimeParts | null {
  if (!value) return null;
  const parts = value.split(":");
  const h = Number.parseInt(parts[0], 10);
  const m = Number.parseInt(parts[1], 10);
  const s = Number.parseInt(parts[2], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m, s: Number.isNaN(s) ? 0 : s };
}

interface TimePickerProps {
  /** Canonical 24h value: `"HH:mm"` or `"HH:mm:ss"`. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Display hour cycle. The emitted value is always 24h. Defaults to `24`. */
  hourCycle?: 12 | 24;
  withSeconds?: boolean;
  /**
   * Minute granularity, normalised to an integer in `[1, 30]`. Anything that is
   * not a finite number, and anything that rounds below `1`, becomes `1`;
   * anything above `30` becomes `30`. A step that does not divide 60 is honoured
   * as given, and the current value's minute is always offered even when it
   * falls between two steps. Defaults to `1`.
   */
  minuteStep?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Time-of-day picker built from `Select` columns (hours / minutes / optional
 * seconds / AM-PM). Controlled or uncontrolled. The value is always emitted as
 * a 24h `"HH:mm"` (or `"HH:mm:ss"`) string regardless of `hourCycle`.
 *
 * `minuteStep` is normalised before it reaches the option loop — see
 * {@link TimePickerProps.minuteStep} for the exact rule.
 */
function TimePicker({
  value,
  defaultValue,
  onValueChange,
  hourCycle = 24,
  withSeconds = false,
  minuteStep = 1,
  disabled,
  id,
  className,
  "aria-label": ariaLabel,
}: TimePickerProps) {
  const [internal, setInternal] = React.useState<string | undefined>(defaultValue);
  const current = value !== undefined ? value : internal;
  const parsed = parseTime(current);
  const base: TimeParts = parsed ?? { h: 0, m: 0, s: 0 };

  const is12 = hourCycle === 12;
  const period = base.h < 12 ? "AM" : "PM";
  const hour12 = base.h % 12 === 0 ? 12 : base.h % 12;

  function emit(parts: TimeParts) {
    const next = withSeconds
      ? `${pad(parts.h)}:${pad(parts.m)}:${pad(parts.s)}`
      : `${pad(parts.h)}:${pad(parts.m)}`;
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }

  function setHour(raw: string | null) {
    if (raw == null) return;
    const hv = Number.parseInt(raw, 10);
    const h = is12 ? (hv % 12) + (period === "PM" ? 12 : 0) : hv;
    emit({ ...base, h });
  }

  function setMinute(raw: string | null) {
    if (raw == null) return;
    emit({ ...base, m: Number.parseInt(raw, 10) });
  }

  function setSecond(raw: string | null) {
    if (raw == null) return;
    emit({ ...base, s: Number.parseInt(raw, 10) });
  }

  function setPeriod(p: string | null) {
    if (p == null) return;
    const h = (hour12 % 12) + (p === "PM" ? 12 : 0);
    emit({ ...base, h });
  }

  const step = normalizeMinuteStep(minuteStep);
  const hourOptions = is12 ? Array.from({ length: 12 }, (_, i) => i + 1) : range(24, 1);
  const minuteOptions = minuteOptionsFor(step, parsed ? base.m : null);
  const secondOptions = range(60, 1);

  const hourValue = parsed ? (is12 ? String(hour12) : pad(base.h)) : null;
  const minuteValue = parsed ? pad(base.m) : null;
  const secondValue = parsed ? pad(base.s) : null;

  return (
    <fieldset
      data-slot="time-picker"
      aria-label={ariaLabel ?? "Time"}
      className={cn(
        "flex min-w-0 items-center gap-1 border-0 p-0",
        disabled && "opacity-disabled",
        className,
      )}
    >
      <Select value={hourValue} onValueChange={setHour} disabled={disabled}>
        <SelectTrigger id={id} size="sm" aria-label="Hours" className="w-16">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {hourOptions.map((h) => (
            <SelectItem key={h} value={is12 ? String(h) : pad(h)}>
              {is12 ? h : pad(h)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground">:</span>

      <Select value={minuteValue} onValueChange={setMinute} disabled={disabled}>
        <SelectTrigger size="sm" aria-label="Minutes" className="w-16">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {minuteOptions.map((m) => (
            <SelectItem key={m} value={pad(m)}>
              {pad(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {withSeconds && (
        <>
          <span className="text-muted-foreground">:</span>
          <Select value={secondValue} onValueChange={setSecond} disabled={disabled}>
            <SelectTrigger size="sm" aria-label="Seconds" className="w-16">
              <SelectValue placeholder="SS" />
            </SelectTrigger>
            <SelectContent>
              {secondOptions.map((s) => (
                <SelectItem key={s} value={pad(s)}>
                  {pad(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {is12 && (
        <Select value={parsed ? period : undefined} onValueChange={setPeriod} disabled={disabled}>
          <SelectTrigger size="sm" aria-label="AM or PM" className="w-18">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      )}
    </fieldset>
  );
}

export type { TimePickerProps };
export { parseTime, TimePicker };
