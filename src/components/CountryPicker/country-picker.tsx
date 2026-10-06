"use client";

import * as React from "react";

import { Combobox, type ComboboxOption } from "@/components/Combobox/combobox";
import { useFieldControl } from "@/components/Input/field";
import { NativeSelect } from "@/components/Select/native-select";
import { useControllableState } from "@/hooks/use-controllable-state";
import { countryPickerMessages } from "@/lib/messages";
import { useMessages } from "@/providers/messages-provider";

interface CountryPickerProps {
  /** ISO 3166-1 alpha-2 code (e.g. "US", "FR"). Empty = no selection. Omit to go uncontrolled. */
  value?: string;
  /** Initial code when uncontrolled. Defaults to `""` (no selection). */
  defaultValue?: string;
  onChange?: (next: string) => void;
  /** Optional placeholder when value is empty. */
  placeholder?: string;
  /** Localisation override; defaults to the user's browser locale. */
  locale?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  /**
   * Type-to-filter instead of the native list. Search matches the localised name, the English
   * name and the ISO code, ignoring case and accents ("cote" finds "Côte d'Ivoire"). The native
   * list (the default) is the better choice for mobile hosted flows and browser autofill.
   */
  searchable?: boolean;
  /**
   * Restrict — and order — the list to these ISO codes, e.g. the markets a product ships to.
   * Defaults to every code in `COUNTRY_CODES`, sorted by localised name.
   */
  countries?: readonly string[];
  /** Codes pinned to the top of the list, in this order (e.g. `["IN"]` for an India-first product). */
  priority?: readonly string[];
  /** Shown in the searchable list when nothing matches. */
  emptyMessage?: string;
  /** Submits the selected code under this name. */
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

/** ISO 3166-1 alpha-2 codes for all UN-recognised states + a few common
 *  dependencies. Hand-maintained — Intl doesn't expose this list. */
const ISO_CODES: string[] = [
  "AD",
  "AE",
  "AF",
  "AG",
  "AI",
  "AL",
  "AM",
  "AO",
  "AR",
  "AS",
  "AT",
  "AU",
  "AW",
  "AX",
  "AZ",
  "BA",
  "BB",
  "BD",
  "BE",
  "BF",
  "BG",
  "BH",
  "BI",
  "BJ",
  "BL",
  "BM",
  "BN",
  "BO",
  "BQ",
  "BR",
  "BS",
  "BT",
  "BW",
  "BY",
  "BZ",
  "CA",
  "CC",
  "CD",
  "CF",
  "CG",
  "CH",
  "CI",
  "CK",
  "CL",
  "CM",
  "CN",
  "CO",
  "CR",
  "CU",
  "CV",
  "CW",
  "CX",
  "CY",
  "CZ",
  "DE",
  "DJ",
  "DK",
  "DM",
  "DO",
  "DZ",
  "EC",
  "EE",
  "EG",
  "EH",
  "ER",
  "ES",
  "ET",
  "FI",
  "FJ",
  "FK",
  "FM",
  "FO",
  "FR",
  "GA",
  "GB",
  "GD",
  "GE",
  "GF",
  "GG",
  "GH",
  "GI",
  "GL",
  "GM",
  "GN",
  "GP",
  "GQ",
  "GR",
  "GT",
  "GU",
  "GW",
  "GY",
  "HK",
  "HN",
  "HR",
  "HT",
  "HU",
  "ID",
  "IE",
  "IL",
  "IM",
  "IN",
  "IO",
  "IQ",
  "IR",
  "IS",
  "IT",
  "JE",
  "JM",
  "JO",
  "JP",
  "KE",
  "KG",
  "KH",
  "KI",
  "KM",
  "KN",
  "KP",
  "KR",
  "KW",
  "KY",
  "KZ",
  "LA",
  "LB",
  "LC",
  "LI",
  "LK",
  "LR",
  "LS",
  "LT",
  "LU",
  "LV",
  "LY",
  "MA",
  "MC",
  "MD",
  "ME",
  "MF",
  "MG",
  "MH",
  "MK",
  "ML",
  "MM",
  "MN",
  "MO",
  "MP",
  "MQ",
  "MR",
  "MS",
  "MT",
  "MU",
  "MV",
  "MW",
  "MX",
  "MY",
  "MZ",
  "NA",
  "NC",
  "NE",
  "NF",
  "NG",
  "NI",
  "NL",
  "NO",
  "NP",
  "NR",
  "NU",
  "NZ",
  "OM",
  "PA",
  "PE",
  "PF",
  "PG",
  "PH",
  "PK",
  "PL",
  "PM",
  "PN",
  "PR",
  "PS",
  "PT",
  "PW",
  "PY",
  "QA",
  "RE",
  "RO",
  "RS",
  "RU",
  "RW",
  "SA",
  "SB",
  "SC",
  "SD",
  "SE",
  "SG",
  "SH",
  "SI",
  "SJ",
  "SK",
  "SL",
  "SM",
  "SN",
  "SO",
  "SR",
  "SS",
  "ST",
  "SV",
  "SX",
  "SY",
  "SZ",
  "TC",
  "TD",
  "TG",
  "TH",
  "TJ",
  "TK",
  "TL",
  "TM",
  "TN",
  "TO",
  "TR",
  "TT",
  "TV",
  "TW",
  "TZ",
  "UA",
  "UG",
  "US",
  "UY",
  "UZ",
  "VA",
  "VC",
  "VE",
  "VG",
  "VI",
  "VN",
  "VU",
  "WF",
  "WS",
  "YE",
  "YT",
  "ZA",
  "ZM",
  "ZW",
];

interface CountryOption {
  code: string;
  name: string;
  /** The English name, searched alongside the localised one, when the two differ. */
  english?: string;
}

function displayNamesFor(locale: string): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    return null;
  }
}

/** `of()` throws on a malformed code; a picker should show the code rather than crash. */
function nameOf(names: Intl.DisplayNames | null, code: string): string | undefined {
  try {
    return names?.of(code) ?? undefined;
  } catch {
    return undefined;
  }
}

function buildOptions(
  locale: string,
  codes: readonly string[],
  priority: readonly string[],
): CountryOption[] {
  const displayNames = displayNamesFor(locale);
  const english = locale.toLowerCase().startsWith("en") ? null : displayNamesFor("en");
  const out = codes.map((raw): CountryOption => {
    const code = raw.toUpperCase();
    const name = nameOf(displayNames, code) ?? code;
    const englishName = nameOf(english, code);
    return englishName && englishName !== name
      ? { code, name, english: englishName }
      : { code, name };
  });
  // Sorted with the display locale's collation, not the runtime's: "Österreich" belongs under O
  // in German and the order must not depend on which machine rendered it.
  const collator = new Intl.Collator(locale);
  out.sort((a, b) => collator.compare(a.name, b.name));
  if (priority.length === 0) return out;
  const pinned = priority
    .map((p) => out.find((o) => o.code === p.toUpperCase()))
    .filter((o): o is CountryOption => o !== undefined);
  return [...pinned, ...out.filter((o) => !pinned.includes(o))];
}

const NO_PRIORITY: readonly string[] = [];

const HYDRATION_LOCALE = "en";

/**
 * The display locale: the `locale` prop, else the browser's — but only after mount. The server
 * cannot know the browser's locale, so the first client render must match the server's English
 * one; the switch happens in an effect, after hydration.
 */
function useResolvedLocale(locale: string | undefined): string {
  const [browserLocale, setBrowserLocale] = React.useState<string>();
  React.useEffect(() => {
    if (locale === undefined) {
      setBrowserLocale(navigator.language || HYDRATION_LOCALE);
    }
  }, [locale]);
  return locale ?? browserLocale ?? HYDRATION_LOCALE;
}

/**
 * CountryPicker: ISO 3166-1 alpha-2 codes with localised names from `Intl.DisplayNames`.
 *
 * Two presentations, one value (the alpha-2 code):
 *
 * - **native** (default) — a `NativeSelect`, styled as a Qeet field. The platform list on
 *   mobile, `autoComplete="country"` for browser autofill, type-to-jump everywhere, and it works
 *   before hydration. The right choice for hosted sign-up and checkout flows.
 * - **`searchable`** — a `Combobox`: type any part of the localised name, the English name or
 *   the code. The right choice for admin consoles, where people search rather than scroll.
 *
 * Long names ("South Georgia & South Sandwich Islands") wrap in the list and truncate in the
 * field. `countries` restricts the list, `priority` pins codes to the top. Pass a `locale`
 * (e.g. "fr-FR") to override the browser's. Implements the composite-field contract: inside a
 * `Field` the control takes the label, description, error and invalid state.
 *
 * The first render uses English names on both server and client, and switches to the
 * browser's locale after mount, so hydration never sees two different lists.
 */
function CountryPicker({
  value: valueProp,
  defaultValue = "",
  onChange,
  placeholder: placeholderProp,
  locale,
  disabled,
  ariaLabel,
  className,
  searchable = false,
  countries,
  priority = NO_PRIORITY,
  emptyMessage,
  name,
  form,
  required,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: CountryPickerProps) {
  const messages = useMessages("countryPicker", countryPickerMessages);
  const placeholder = placeholderProp ?? messages.placeholder;
  const [value, setValue] = useControllableState<string>({
    value: valueProp,
    defaultValue,
    onChange,
  });
  const resolvedLocale = useResolvedLocale(locale);
  // Keyed on the lists' contents, so an inline `countries={[...]}` does not rebuild every render.
  const codesKey = (countries ?? ISO_CODES).join(",");
  const priorityKey = priority.join(",");
  const built = React.useMemo(
    () =>
      buildOptions(
        resolvedLocale,
        codesKey ? codesKey.split(",") : [],
        priorityKey ? priorityKey.split(",") : [],
      ),
    [resolvedLocale, codesKey, priorityKey],
  );
  const options = React.useMemo(() => {
    // A value outside the list (a restricted `countries`, a newer code) still shows.
    if (value && !built.some((o) => o.code === value.toUpperCase())) {
      return [
        ...built,
        { code: value, name: nameOf(displayNamesFor(resolvedLocale), value) ?? value },
      ];
    }
    return built;
  }, [built, value, resolvedLocale]);
  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });
  const label = field["aria-labelledby"] ? undefined : (ariaLabel ?? messages.label);

  const items = React.useMemo<ComboboxOption[]>(
    () =>
      options.map((o) => ({
        value: o.code,
        label: o.name,
        detail: o.code,
        keywords: o.english ? [o.english] : undefined,
      })),
    [options],
  );

  if (searchable) {
    return (
      <Combobox
        items={items}
        value={value || null}
        onValueChange={(next) => setValue(next ?? "")}
        placeholder={placeholder}
        emptyMessage={emptyMessage}
        locale={resolvedLocale}
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
      autoComplete="country"
      id={field.id}
      aria-label={label}
      aria-labelledby={field["aria-labelledby"]}
      aria-describedby={field["aria-describedby"]}
      aria-errormessage={field["aria-errormessage"]}
      aria-invalid={field["aria-invalid"]}
      data-slot="country-picker"
      className={className}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.name}
        </option>
      ))}
    </NativeSelect>
  );
}

export type { CountryPickerProps };
export { CountryPicker, ISO_CODES as COUNTRY_CODES };
