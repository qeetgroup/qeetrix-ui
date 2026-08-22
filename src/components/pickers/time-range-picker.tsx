"use client";

import { ClockIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/actions/button";
import { Calendar } from "@/components/pickers/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/surfaces/popover";
import { cn } from "@/lib/utils";

type TimeRangePreset = "1h" | "24h" | "7d" | "30d" | "90d" | "custom";

interface TimeRangeValue {
  preset: TimeRangePreset;
  from: Date;
  to: Date;
}

const PRESETS: { value: Exclude<TimeRangePreset, "custom">; label: string; ms: number }[] = [
  { value: "1h", label: "Last hour", ms: 36e5 },
  { value: "24h", label: "Last 24 hours", ms: 864e5 },
  { value: "7d", label: "Last 7 days", ms: 7 * 864e5 },
  { value: "30d", label: "Last 30 days", ms: 30 * 864e5 },
  { value: "90d", label: "Last 90 days", ms: 90 * 864e5 },
];

const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function presetRange(ms: number): { from: Date; to: Date } {
  const to = new Date();
  return { from: new Date(to.getTime() - ms), to };
}

interface TimeRangePickerProps {
  value?: TimeRangeValue;
  defaultValue?: TimeRangeValue;
  onValueChange?: (value: TimeRangeValue) => void;
  align?: "start" | "center" | "end";
  className?: string;
}

/**
 * Preset + custom time-range selector (log windows, analytics, billing periods).
 * Emits `{ preset, from, to }`; presets close on click, the calendar sets a custom range.
 */
function TimeRangePicker({
  value,
  defaultValue,
  onValueChange,
  align = "start",
  className,
}: TimeRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<TimeRangeValue>(
    () => defaultValue ?? { preset: "24h", ...presetRange(864e5) },
  );
  const current = isControlled ? (value as TimeRangeValue) : internal;

  const commit = (next: TimeRangeValue) => {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };

  const selectPreset = (p: (typeof PRESETS)[number]) => {
    commit({ preset: p.value, ...presetRange(p.ms) });
    setOpen(false);
  };
  const selectCustom = (range: DateRange | undefined) => {
    if (range?.from) commit({ preset: "custom", from: range.from, to: range.to ?? range.from });
  };

  const label =
    current.preset === "custom"
      ? `${fmt.format(current.from)} – ${fmt.format(current.to)}`
      : (PRESETS.find((p) => p.value === current.preset)?.label ?? "Select range");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            data-slot="time-range-picker"
            className={cn("justify-start gap-2 font-normal", className)}
          >
            <ClockIcon aria-hidden className="size-4" />
            {label}
          </Button>
        }
      />
      <PopoverContent align={align} className="flex w-auto gap-0 p-0">
        <div className="flex flex-col gap-0.5 border-e border-border p-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.value}
              variant={current.preset === p.value ? "secondary" : "ghost"}
              size="sm"
              className="justify-start"
              onClick={() => selectPreset(p)}
            >
              {p.label}
            </Button>
          ))}
          <span className="px-2 pt-1.5 text-xs font-medium text-muted-foreground">
            Custom range
          </span>
        </div>
        <Calendar
          mode="range"
          selected={
            current.preset === "custom" ? { from: current.from, to: current.to } : undefined
          }
          onSelect={selectCustom}
          numberOfMonths={2}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export type { TimeRangePickerProps, TimeRangePreset, TimeRangeValue };
export { TimeRangePicker };
