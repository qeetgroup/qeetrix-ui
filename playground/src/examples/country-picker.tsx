import { CountryPicker, Field, FieldDescription, FieldError, FieldLabel } from "@qeetrix/ui";
import { useState } from "react";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/** Markets Qeet Pay settles in, India first. */
const settlementMarkets = ["IN", "AE", "SG", "GB", "US", "DE", "AU", "MY"];

/** How Qeet Pay treats an invoice to a customer in each billing country. */
function gstTreatment(code: string): string {
  if (!code) return "Pick a country to see how GST applies.";
  if (code === "IN") return "Domestic supply: CGST + SGST or IGST by place of supply.";
  return "Export of services: zero-rated under LUT, no GST charged.";
}

function BillingCountryDemo() {
  const [country, setCountry] = useState("IN");
  return (
    <Field className="w-72">
      <FieldLabel>Billing country</FieldLabel>
      <CountryPicker
        value={country}
        onChange={setCountry}
        locale="en-IN"
        priority={["IN"]}
        name="billing_country"
      />
      <FieldDescription aria-live="polite">{gstTreatment(country)}</FieldDescription>
    </Field>
  );
}

const controls = {
  defaultValue: select(["IN", "SG", "AE", "GB", "US", "(none)"] as const, "IN", "Default value"),
  searchable: bool(false),
  markets: bool(false, "Only settlement markets (countries)"),
  priority: bool(true, 'priority={["IN"]}'),
  locale: select(["en-IN", "hi-IN", "ta-IN", "fr-FR", "ja-JP", "browser"] as const, "en-IN"),
  placeholder: text("Select country", "Placeholder"),
  required: bool(false),
  disabled: bool(false),
};

export const examples: FamilyExamples = {
  "country-picker": {
    demos: [
      {
        name: "Default",
        description:
          "A native select of ISO 3166-1 codes with Intl.DisplayNames names; `priority` pins India to the top.",
        render: () => <BillingCountryDemo />,
      },
      {
        name: "Searchable, with priority",
        description:
          "`searchable` filters by localised name, English name or ISO code (“ae”, “emirates”); `priority` pins Qeet's main markets above the rest.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Customer country</FieldLabel>
            <CountryPicker
              searchable
              priority={["IN", "AE", "SG"]}
              locale="en-IN"
              placeholder="Search countries"
              emptyMessage="No country matches"
            />
            <FieldDescription>Decides the invoice currency and tax treatment.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Restricted list",
        description: "`countries` limits the list to the markets Qeet Pay settles in.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Settlement country</FieldLabel>
            <CountryPicker
              searchable
              countries={settlementMarkets}
              defaultValue="AE"
              locale="en-IN"
              placeholder="Search markets"
            />
            <FieldDescription>Payouts in the local currency of this market.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Localised names",
        description: "`locale` renders and sorts country names in Hindi.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>पंजीकरण का देश (Country of registration)</FieldLabel>
            <CountryPicker defaultValue="IN" locale="hi-IN" priority={["IN"]} />
          </Field>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Tax residency</FieldLabel>
            <CountryPicker
              locale="en-IN"
              placeholder="Select country of tax residence"
              priority={["IN"]}
              required
            />
            <FieldError>Required to work out TDS on your payouts.</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Data residency</FieldLabel>
            <CountryPicker defaultValue="IN" locale="en-IN" disabled />
            <FieldDescription>
              Acme India's data stays in ap-south-1 (Mumbai) under the DPDP Act.
            </FieldDescription>
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls,
      render: (v) => {
        const initial = v.defaultValue === "(none)" ? "" : v.defaultValue;
        return (
          <div className="w-72">
            <CountryPicker
              key={`${initial}-${v.searchable}`}
              defaultValue={initial}
              searchable={v.searchable}
              countries={v.markets ? settlementMarkets : undefined}
              priority={v.priority ? ["IN"] : undefined}
              locale={v.locale === "browser" ? undefined : v.locale}
              placeholder={v.placeholder}
              required={v.required}
              disabled={v.disabled}
              ariaLabel="Billing country"
            />
          </div>
        );
      },
      code: (v) =>
        jsx("CountryPicker", {
          defaultValue: v.defaultValue === "(none)" ? undefined : v.defaultValue,
          searchable: v.searchable,
          countries: v.markets
            ? expr(JSON.stringify(settlementMarkets).replaceAll(",", ", "))
            : undefined,
          priority: v.priority ? expr('["IN"]') : undefined,
          locale: v.locale === "browser" ? undefined : v.locale,
          placeholder: v.placeholder === "Select country" ? undefined : v.placeholder,
          required: v.required,
          disabled: v.disabled,
          ariaLabel: "Billing country",
        }),
    }),
  },
};
