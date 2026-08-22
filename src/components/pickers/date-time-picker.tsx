"use client";

import { CalendarIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/actions/button";
import { Calendar } from "@/components/pickers/calendar";
import { TimePicker } from "@/components/pickers/time-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/surfaces/popover";
import { cn } from "@/lib/utils";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function timeStringFromDate(date: Date, withSeconds: boolean): string {
  const base = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return withSeconds ? `${base}:${pad(date.getSeconds())}` : base;
}

interface DateTimePickerProps {
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (date: Date | undefined) => void;
  placeholder?: string;
  hourCycle?: 12 | 24;
  withSeconds?: boolean;
  minuteStep?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Date + time-of-day picker: a Calendar with a {@link TimePicker} footer inside
 * a Popover, emitting a single `Date`. Selecting a day keeps the chosen time
 * (and vice-versa). Controlled or uncontrolled, mirroring `DatePicker`.
 */
function DateTimePicker({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Pick date & time",
  hourCycle = 24,
  withSeconds = false,
  minuteStep = 5,
  disabled,
  id,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState<Date | undefined>(defaultValue);
  const selected = value !== undefined ? value : internal;

  const formatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: withSeconds ? "medium" : "short",
      }),
    [withSeconds],
  );

  function commit(next: Date | undefined) {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }

  function handleDateSelect(date: Date | undefined) {
    if (!date) {
      commit(undefined);
      return;
    }
    const next = new Date(date);
    if (selected) {
      next.setHours(selected.getHours(), selected.getMinutes(), selected.getSeconds(), 0);
    } else {
      next.setHours(0, 0, 0, 0);
    }
    commit(next);
  }

  function handleTimeChange(time: string) {
    const [h, m, s] = time.split(":").map((x) => Number.parseInt(x, 10));
    const next = selected ? new Date(selected) : new Date();
    next.setHours(h, m, Number.isNaN(s) ? 0 : s, 0);
    commit(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            data-empty={!selected}
            className={cn(
              "w-full justify-start gap-2 font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon aria-hidden className="size-4" />
            {selected ? formatter.format(selected) : placeholder}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start" aria-label="Choose a date and time">
        <Calendar mode="single" selected={selected} onSelect={handleDateSelect} autoFocus />
        <div className="flex items-center justify-center border-t p-3">
          <TimePicker
            value={selected ? timeStringFromDate(selected, withSeconds) : undefined}
            onValueChange={handleTimeChange}
            hourCycle={hourCycle}
            withSeconds={withSeconds}
            minuteStep={minuteStep}
            aria-label="Time"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type { DateTimePickerProps };
export { DateTimePicker };
