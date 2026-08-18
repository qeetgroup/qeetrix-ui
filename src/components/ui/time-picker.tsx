"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function range(stop: number, step: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < stop; i += step) out.push(i);
  return out;
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
  /** Minute granularity. Defaults to `1`. */
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

  const hourOptions = is12 ? Array.from({ length: 12 }, (_, i) => i + 1) : range(24, 1);
  const minuteOptions = range(60, minuteStep);
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
