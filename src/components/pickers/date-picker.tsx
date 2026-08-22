"use client";

import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/actions/button";
import { Calendar } from "@/components/pickers/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/surfaces/popover";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

interface DatePickerProps {
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** A single-date picker: an outline trigger button opening a Calendar in a Popover. */
function DatePicker({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Pick a date",
  disabled,
  id,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState<Date | undefined>(defaultValue);
  const selected = value !== undefined ? value : internal;

  const handleSelect = (date: Date | undefined) => {
    if (value === undefined) setInternal(date);
    onValueChange?.(date);
    if (date) setOpen(false);
  };

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
            <CalendarIcon className="size-4" />
            {selected ? formatDate(selected) : placeholder}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start" aria-label="Choose a date">
        <Calendar mode="single" selected={selected} onSelect={handleSelect} autoFocus />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Months shown side by side in the popover. Defaults to 2. */
  numberOfMonths?: number;
}

function formatRange(range: DateRange | undefined): string | null {
  if (!range?.from) return null;
  if (!range.to) return formatDate(range.from);
  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
}

/** A date-range picker (log windows, billing periods): two-month range Calendar in a Popover. */
function DateRangePicker({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Pick a date range",
  disabled,
  id,
  className,
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState<DateRange | undefined>(defaultValue);
  const selected = value !== undefined ? value : internal;
  const label = formatRange(selected);

  const handleSelect = (range: DateRange | undefined) => {
    if (value === undefined) setInternal(range);
    onValueChange?.(range);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            data-empty={!label}
            className={cn(
              "w-full justify-start gap-2 font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="size-4" />
            {label ?? placeholder}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start" aria-label="Choose a date range">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={numberOfMonths}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export type { DatePickerProps, DateRangePickerProps };
export { DatePicker, DateRangePicker };
