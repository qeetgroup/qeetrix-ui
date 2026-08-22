"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface AvailabilityGridProps {
  /** Column headers (e.g. ["Mon", "Tue", …]). */
  days: string[];
  /** Row labels (e.g. ["09:00", "09:30", …]). */
  times: string[];
  /** Selected slot keys, `"<dayIndex>:<timeIndex>"`. */
  value: string[];
  onValueChange: (value: string[]) => void;
  /** Booked/blocked slot keys, `"<dayIndex>:<timeIndex>"` — rendered disabled. */
  unavailable?: string[];
  className?: string;
}

/** Week × time-slot picker (booking availability, shift planning). */
function AvailabilityGrid({
  days,
  times,
  value,
  onValueChange,
  unavailable = [],
  className,
}: AvailabilityGridProps) {
  const selected = new Set(value);
  const blocked = new Set(unavailable);

  const toggle = (key: string) => {
    if (blocked.has(key)) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onValueChange([...next]);
  };

  return (
    <div
      data-slot="availability-grid"
      className={cn(
        "inline-grid gap-px overflow-hidden rounded-lg border border-border bg-border",
        className,
      )}
      style={{ gridTemplateColumns: `auto repeat(${days.length}, minmax(3rem, 1fr))` }}
    >
      <div className="bg-card" />
      {days.map((d) => (
        <div
          key={d}
          className="bg-card px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
        >
          {d}
        </div>
      ))}
      {times.map((t, ti) => (
        <React.Fragment key={t}>
          <div className="bg-card px-2 py-1 text-end text-xs text-muted-foreground tabular-nums">
            {t}
          </div>
          {days.map((d, di) => {
            const key = `${di}:${ti}`;
            const isBlocked = blocked.has(key);
            const isSel = selected.has(key);
            return (
              <button
                key={key}
                type="button"
                disabled={isBlocked}
                aria-pressed={isSel}
                aria-label={`${d} ${t}`}
                onClick={() => toggle(key)}
                className={cn(
                  "h-7 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                  isBlocked
                    ? "cursor-not-allowed bg-muted [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,var(--border)_4px,var(--border)_5px)]"
                    : isSel
                      ? "bg-primary/80 hover:bg-primary"
                      : "bg-card hover:bg-accent",
                )}
              />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

export type { AvailabilityGridProps };
export { AvailabilityGrid };
