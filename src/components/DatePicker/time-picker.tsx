"use client";

import * as React from "react";
import { FieldHiddenInput, useFieldControl } from "@/components/Input/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select/select";
import { timePickerMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

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

/**
 * `H:mm`, `HH:mm` or `HH:mm:ss`, with an optional fraction (a native `<input type="time">` with a
 * sub-second `step` submits one), which is ignored.
 */
const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/;

/**
 * Parse a canonical 24h time string: `"HH:mm"` or `"HH:mm:ss"`.
 *
 * Strict on purpose. `parseInt` used to accept `"25:99"`, `"9:5x"` and `"1e1:30"`, and a picker
 * holding an hour or minute it has no option for renders an empty column while believing it has
 * a value. Anything that is not a real wall-clock time is `null` — no value — so the picker shows
 * its placeholders and the next pick emits a valid time.
 */
function parseTime(value?: string): TimeParts | null {
  if (!value) return null;
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = match[3] === undefined ? 0 : Number(match[3]);
  if (h > 23 || m > 59 || s > 59) return null;
  return { h, m, s };
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
  /**
   * Height of the columns. `"default"` is the density-resolved field height, so a TimePicker
   * lines up with the Inputs and Selects in the same form row; `"sm"` is the compact 28px
   * column. Defaults to `"default"`.
   */
  size?: "sm" | "default";
  disabled?: boolean;
  /** Goes on the hours column, the group's first stop, so a `<label htmlFor>` reaches it. */
  id?: string;
  className?: string;
  /**
   * Submits the time as `HH:mm` (`HH:mm:ss` with `withSeconds`) under this name — the same
   * canonical 24h string `onValueChange` emits. Empty while there is no valid time.
   */
  name?: string;
  /** Associate the submitted value with a form it is not nested inside, by form `id`. */
  form?: string;
  /** Names the group. Defaults to "Time" when neither this nor a labelling Field is present. */
  "aria-label"?: string;
  /** Names the group from visible text, e.g. a heading. Wins over a surrounding Field label. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  /** Marks every column invalid (and draws the destructive boundary). */
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

/**
 * Time-of-day picker built from `Select` columns (hours / minutes / optional
 * seconds / AM-PM). Controlled or uncontrolled. The value is always emitted as
 * a 24h `"HH:mm"` (or `"HH:mm:ss"`) string regardless of `hourCycle`.
 *
 * `minuteStep` is normalised before it reaches the option loop — see
 * {@link TimePickerProps.minuteStep} for the exact rule.
 *
 * Forms: the columns are a named group. Inside a `Field` the Field label names the group, the
 * hours column takes the Field's control id (so the label focuses it), the description describes
 * the group, and `aria-invalid` marks every column. `name` submits the canonical string. There is
 * no `required`: a hidden value is exempt from constraint validation.
 */
function TimePicker({
  value,
  defaultValue,
  onValueChange,
  hourCycle = 24,
  withSeconds = false,
  minuteStep = 1,
  size = "default",
  disabled,
  id,
  className,
  name,
  form,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: TimePickerProps) {
  const messages = useMessages("timePicker", timePickerMessages);
  // The default "Time" name is *not* passed here: it would suppress a surrounding Field's label.
  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });
  const groupLabelledBy = field["aria-labelledby"];
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

  const submitted = parsed
    ? withSeconds
      ? `${pad(base.h)}:${pad(base.m)}:${pad(base.s)}`
      : `${pad(base.h)}:${pad(base.m)}`
    : "";
  /** What every column shares: its height and the invalid state. */
  const column = {
    size,
    "aria-invalid": field["aria-invalid"],
    "aria-errormessage": field["aria-errormessage"],
  } as const;
  // The colons are typography, not content: hidden from assistive technology, and dimmed with
  // the columns when disabled. The columns fade themselves, so the group does not fade again —
  // stacking the two made a disabled picker a quarter of its contrast.
  const separator = (
    <span aria-hidden className={cn("text-muted-foreground", disabled && "opacity-disabled")}>
      :
    </span>
  );

  return (
    <fieldset
      data-slot="time-picker"
      aria-labelledby={groupLabelledBy}
      aria-label={groupLabelledBy ? undefined : (ariaLabel ?? messages.label)}
      aria-describedby={field["aria-describedby"]}
      data-disabled={disabled || undefined}
      className={cn("flex min-w-0 items-center gap-1 border-0 p-0", className)}
    >
      <FieldHiddenInput name={name} value={submitted} form={form} disabled={disabled} />
      <Select value={hourValue} onValueChange={setHour} disabled={disabled}>
        <SelectTrigger id={field.id} aria-label={messages.hours} className="w-18" {...column}>
          <SelectValue placeholder={messages.hoursPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {hourOptions.map((h) => (
            <SelectItem key={h} value={is12 ? String(h) : pad(h)}>
              {is12 ? h : pad(h)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {separator}

      <Select value={minuteValue} onValueChange={setMinute} disabled={disabled}>
        <SelectTrigger aria-label={messages.minutes} className="w-18" {...column}>
          <SelectValue placeholder={messages.minutesPlaceholder} />
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
          {separator}
          <Select value={secondValue} onValueChange={setSecond} disabled={disabled}>
            <SelectTrigger aria-label={messages.seconds} className="w-18" {...column}>
              <SelectValue placeholder={messages.secondsPlaceholder} />
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
        <Select value={parsed ? period : null} onValueChange={setPeriod} disabled={disabled}>
          <SelectTrigger aria-label={messages.period} className="w-20" {...column}>
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">{messages.am}</SelectItem>
            <SelectItem value="PM">{messages.pm}</SelectItem>
          </SelectContent>
        </Select>
      )}
    </fieldset>
  );
}

export type { TimePickerProps };
export { parseTime, TimePicker };
