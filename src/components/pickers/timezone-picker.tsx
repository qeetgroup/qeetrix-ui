"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface TimezonePickerProps {
  /** IANA timezone identifier like "America/New_York". Empty = no selection. */
  value: string;
  onChange: (next: string) => void;
  /** Optional placeholder when value is empty. */
  placeholder?: string;
  disabled?: boolean;
  /** Accessible label for screen readers. */
  ariaLabel?: string;
  className?: string;
}

const FALLBACK_TIMEZONES = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "America/Anchorage",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Phoenix",
  "America/Sao_Paulo",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Bangkok",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Manila",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Melbourne",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Berlin",
  "Europe/Dublin",
  "Europe/Istanbul",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Moscow",
  "Europe/Paris",
  "Europe/Rome",
  "Europe/Warsaw",
  "Pacific/Auckland",
  "Pacific/Honolulu",
];

/**
 * Returns the supported IANA timezones. Falls back to a curated subset
 * when running on an older runtime that doesn't expose
 * `Intl.supportedValuesOf` (Safari < 15.4, Node < 18).
 */
function getTimezones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intl.supportedValuesOf === "function") {
    try {
      return intl.supportedValuesOf("timeZone");
    } catch {
      // Fall through to fallback.
    }
  }
  return FALLBACK_TIMEZONES;
}

/**
 * TimezonePicker renders a native `<select>` populated from
 * `Intl.supportedValuesOf("timeZone")`. Native selects are accessible,
 * have type-to-jump in every major browser, and weigh ~0 KB.
 *
 * Use this when the user needs to pick their personal timezone in
 * profile settings, or when the admin assigns a tenant region.
 */
function TimezonePicker({
  value,
  onChange,
  placeholder = "Select timezone",
  disabled,
  ariaLabel,
  className,
}: TimezonePickerProps) {
  const [zones, setZones] = React.useState<string[]>(FALLBACK_TIMEZONES);

  React.useEffect(() => {
    setZones(getTimezones());
  }, []);

  const resolvedZones =
    value && !zones.includes(value) ? [...zones, value].sort((a, b) => a.localeCompare(b)) : zones;

  return (
    <select
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel ?? "Timezone"}
      data-slot="timezone-picker"
      className={cn(
        "h-[var(--qx-density-control-height,2.25rem)] w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-disabled",
        className,
      )}
    >
      <option value="">{placeholder}</option>
      {resolvedZones.map((z) => (
        <option key={z} value={z}>
          {z.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}

export type { TimezonePickerProps };
export { getTimezones, TimezonePicker };
