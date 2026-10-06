"use client";

import * as React from "react";

import { Combobox, type ComboboxOption } from "@/components/Combobox/combobox";
import { useFieldControl } from "@/components/Input/field";
import { NativeSelect } from "@/components/Select/native-select";
import { useControllableState } from "@/hooks/use-controllable-state";
import { timezonePickerMessages } from "@/lib/messages";
import { useMessages } from "@/providers/messages-provider";

interface TimezonePickerProps {
  /** IANA timezone identifier like "America/New_York". Empty = no selection. Omit to go uncontrolled. */
  value?: string;
  /** Initial zone when uncontrolled. Defaults to `""` (no selection). */
  defaultValue?: string;
  onChange?: (next: string) => void;
  /** Optional placeholder when value is empty. */
  placeholder?: string;
  disabled?: boolean;
  /** Accessible label for screen readers. */
  ariaLabel?: string;
  className?: string;
  /**
   * Type-to-filter instead of the native list. Search matches the zone id, the city, the
   * localised zone name ("India Standard Time") and the UTC offset ("+5:30", "GMT+5:30").
   */
  searchable?: boolean;
  /** Locale for zone names and offsets. Defaults to the browser's. */
  locale?: string;
  /** Restrict the list to these IANA ids. Defaults to every zone the runtime supports. */
  timezones?: readonly string[];
  /** Shown in the searchable list when nothing matches. */
  emptyMessage?: string;
  /** Submits the selected zone under this name. */
  name?: string;
  /** Associate the submitted value with a form it is not nested inside, by form `id`. */
  form?: string;
  /**
   * Requires a choice. Browser-enforced in the native list (the placeholder option has an empty
   * value); advisory when `searchable`, as for every composite — see `field.tsx`.
   */
  required?: boolean;
  /** Applied to the focusable control, so a `Field` label's `htmlFor` resolves to it. */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
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
/**
 * CLDR's canonical ids lag the IANA database: Chromium lists "Asia/Calcutta", Node lists
 * "Asia/Kolkata". A user typing "Kolkata" must find their zone either way, and a stored IANA id
 * must not appear twice, so the well-known renames are normalised to the current IANA name —
 * which every runtime accepts as an alias — and the old spelling stays searchable.
 */
const LEGACY_ZONE_NAMES: Readonly<Record<string, string>> = {
  "Africa/Asmera": "Africa/Asmara",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Catamarca": "America/Argentina/Catamarca",
  "America/Cordoba": "America/Argentina/Cordoba",
  "America/Godthab": "America/Nuuk",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "America/Jujuy": "America/Argentina/Jujuy",
  "America/Louisville": "America/Kentucky/Louisville",
  "America/Mendoza": "America/Argentina/Mendoza",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Kiev": "Europe/Kyiv",
  "Pacific/Enderbury": "Pacific/Kanton",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
};

/** The legacy spelling for a current IANA name, if it has one — kept as a search keyword. */
const MODERN_TO_LEGACY: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(LEGACY_ZONE_NAMES).map(([legacy, modern]) => [modern, legacy]),
);

function getTimezones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intl.supportedValuesOf === "function") {
    try {
      const zones = [
        ...new Set(intl.supportedValuesOf("timeZone").map((z) => LEGACY_ZONE_NAMES[z] ?? z)),
      ].sort((a, b) => a.localeCompare(b));
      // Several runtimes list only canonical *regional* zones and leave out "UTC" — the one an
      // enterprise admin reaches for first. It is a valid IANA id, so it leads the list.
      return zones.includes("UTC") ? zones : ["UTC", ...zones];
    } catch {
      // Fall through to fallback.
    }
  }
  return FALLBACK_TIMEZONES;
}

interface ZoneInfo {
  /** The IANA id, underscores as spaces: "America/Argentina/Buenos Aires". */
  label: string;
  /** Localised generic name, when it adds something: "India Standard Time". */
  name?: string;
  /** Localised current offset: "GMT+5:30". */
  offset?: string;
  /** Extra search terms: the city, offset spellings. */
  keywords?: string[];
}

const zoneLabel = (zone: string) => zone.replace(/_/g, " ");

function zonePart(
  locale: string,
  timeZone: string,
  style: "shortOffset" | "longGeneric",
  at: Date,
) {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: style })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value;
  } catch {
    return undefined;
  }
}

/**
 * Names and offsets for every zone. Offsets depend on today's date (DST) and on the runtime's
 * time-zone data, so this only ever runs after mount — the server and the hydrating client
 * render bare ids, and the enriched labels arrive in an effect.
 */
function describeZones(zones: readonly string[], locale: string): Map<string, ZoneInfo> {
  const at = new Date();
  const out = new Map<string, ZoneInfo>();
  for (const zone of zones) {
    const label = zoneLabel(zone);
    const offset = zonePart(locale, zone, "shortOffset", at);
    const generic = zonePart(locale, zone, "longGeneric", at);
    const city = label.split("/").pop();
    const keywords: string[] = [];
    if (city && city !== label) keywords.push(city);
    const legacy = MODERN_TO_LEGACY[zone];
    if (legacy) keywords.push(zoneLabel(legacy));
    if (offset) {
      // "GMT+5:30" → also "UTC+5:30" and "+05:30", the spellings people type.
      const sign = /[+\-−]\d{1,2}(?::\d{2})?/.exec(offset)?.[0];
      keywords.push(offset.replace(/^GMT/, "UTC"));
      if (sign) {
        const [h, m] = sign.slice(1).split(":");
        keywords.push(`${sign[0]}${(h ?? "").padStart(2, "0")}:${m ?? "00"}`);
      }
    }
    out.set(zone, {
      label,
      // A generic name that is only the offset again ("GMT+00:00") says nothing new.
      name: generic && !/^(GMT|UTC)/.test(generic) ? generic : undefined,
      offset,
      keywords,
    });
  }
  return out;
}

const HYDRATION_LOCALE = "en";

/**
 * TimezonePicker: every IANA zone from `Intl.supportedValuesOf("timeZone")`, each with its
 * current offset ("GMT+5:30") and, where it adds something, its localised name ("India
 * Standard Time").
 *
 * Two presentations, one value (the IANA id):
 *
 * - **native** (default) — a `NativeSelect`, styled as a Qeet field: accessible, type-to-jump
 *   in every browser, the platform list on mobile. Options read "Asia/Kolkata (GMT+5:30)".
 * - **`searchable`** — a `Combobox` for ~420 zones: type a city, a region, a zone name or an
 *   offset. The right choice for admin consoles assigning tenant regions.
 *
 * Use it when the user picks their personal timezone in profile settings, or when an admin
 * assigns a tenant region. Implements the composite-field contract: inside a `Field` the
 * control takes the label, description, error and invalid state.
 *
 * The first render (server and hydrating client alike) lists the curated fallback zones by bare
 * id; the runtime's full list, offsets and names arrive after mount, so hydration never sees two
 * different lists.
 */
function TimezonePicker({
  value: valueProp,
  defaultValue = "",
  onChange,
  placeholder: placeholderProp,
  disabled,
  ariaLabel,
  className,
  searchable = false,
  locale,
  timezones,
  emptyMessage,
  name,
  form,
  required,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: TimezonePickerProps) {
  const messages = useMessages("timezonePicker", timezonePickerMessages);
  const placeholder = placeholderProp ?? messages.placeholder;
  const [value, setValue] = useControllableState<string>({
    value: valueProp,
    defaultValue,
    onChange,
  });
  const [mounted, setMounted] = React.useState<{ zones: string[]; locale: string } | null>(null);

  React.useEffect(() => {
    setMounted({
      zones: getTimezones(),
      locale: locale ?? (navigator.language || HYDRATION_LOCALE),
    });
  }, [locale]);

  const zonesKey = (timezones ?? mounted?.zones ?? FALLBACK_TIMEZONES).join(",");
  const resolvedZones = React.useMemo(() => {
    const zones = zonesKey ? zonesKey.split(",") : [];
    if (!value || zones.includes(value)) return zones;
    // A stored legacy id ("Asia/Calcutta") takes its modern entry's place rather than doubling it.
    const modern = LEGACY_ZONE_NAMES[value];
    if (modern && zones.includes(modern)) return zones.map((z) => (z === modern ? value : z));
    return [...zones, value].sort((a, b) => a.localeCompare(b));
  }, [zonesKey, value]);

  const mountedLocale = mounted?.locale;
  const info = React.useMemo(
    () => (mountedLocale ? describeZones(resolvedZones, mountedLocale) : null),
    [resolvedZones, mountedLocale],
  );

  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });
  const label = field["aria-labelledby"] ? undefined : (ariaLabel ?? messages.label);

  const items = React.useMemo<ComboboxOption[]>(
    () =>
      resolvedZones.map((zone) => {
        const z = info?.get(zone);
        return {
          value: zone,
          label: zoneLabel(zone),
          description: z?.name,
          detail: z?.offset,
          keywords: z?.keywords,
        };
      }),
    [resolvedZones, info],
  );

  if (searchable) {
    return (
      <Combobox
        items={items}
        value={value || null}
        onValueChange={(next) => setValue(next ?? "")}
        placeholder={placeholder}
        emptyMessage={emptyMessage}
        locale={mountedLocale}
        autoHighlight
        disabled={disabled}
        required={required}
        name={name}
        form={form}
        id={field.id}
        aria-label={label}
        aria-labelledby={field["aria-labelledby"]}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className={className}
      />
    );
  }

  return (
    <NativeSelect
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setValue(e.target.value)}
      disabled={disabled}
      required={required}
      name={name}
      form={form}
      id={field.id}
      aria-label={label}
      aria-labelledby={field["aria-labelledby"]}
      aria-describedby={field["aria-describedby"]}
      aria-errormessage={field["aria-errormessage"]}
      aria-invalid={field["aria-invalid"]}
      data-slot="timezone-picker"
      className={className}
    >
      <option value="">{placeholder}</option>
      {resolvedZones.map((zone) => {
        const offset = info?.get(zone)?.offset;
        return (
          <option key={zone} value={zone}>
            {offset ? messages.option(zoneLabel(zone), offset) : zoneLabel(zone)}
          </option>
        );
      })}
    </NativeSelect>
  );
}

export type { TimezonePickerProps };
export { getTimezones, TimezonePicker };
