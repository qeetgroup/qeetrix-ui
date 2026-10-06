import {
  Autocomplete,
  Combobox,
  type ComboboxOption,
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  MultiSelect,
} from "@qeetrix/ui";
import { useEffect, useRef, useState } from "react";
import { auditRecords, tenants, users } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

const tenantOptions: ComboboxOption[] = tenants.map((tenant) => ({
  value: tenant.id,
  label: tenant.status === "suspended" ? `${tenant.name} (suspended)` : tenant.name,
  description: tenant.domain,
  detail: tenant.plan,
  keywords: [tenant.id, tenant.region],
  disabled: tenant.status === "suspended",
}));

const billingContacts: ComboboxOption[] = users
  .filter((user) => user.role === "Billing" || user.role === "Owner")
  .map((user) => ({
    value: user.id,
    label: user.name,
    description: user.email,
    detail: user.role,
  }));

const directory: ComboboxOption[] = users.map((user) => ({
  value: user.id,
  label: user.name,
  description: `${user.department} · ${user.location}`,
  keywords: [user.email],
}));

/** Server-side search: `filter={null}`, a controlled query and `loading` while "fetching". */
function DirectorySearchDemo() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ComboboxOption[]>(directory.slice(0, 5));
  const [loading, setLoading] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function search(next: string) {
    setQuery(next);
    setLoading(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const needle = next.trim().toLowerCase();
      setResults(
        directory.filter(
          (option) =>
            option.label.toLowerCase().includes(needle) ||
            option.keywords?.some((keyword) => keyword.includes(needle)),
        ),
      );
      setLoading(false);
    }, 700);
  }

  return (
    <Field className="w-80">
      <FieldLabel>Approver</FieldLabel>
      <FieldControl
        render={
          <Combobox
            items={results}
            filter={null}
            inputValue={query}
            onInputValueChange={search}
            loading={loading}
            loadingMessage="Searching the Acme India directory…"
            placeholder="Search people"
          />
        }
      />
      <FieldDescription>Results come from the Qeet ID users API as you type.</FieldDescription>
    </Field>
  );
}

const scopeOptions: ComboboxOption[] = [
  "payments:write",
  "payments:read",
  "invoices:read",
  "invoices:write",
  "refunds:write",
  "users:read",
  "logs:read",
  "webhooks:manage",
].map((scope) => ({ value: scope, label: scope }));

const cities = [
  "Bengaluru",
  "Mumbai",
  "New Delhi",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Kochi",
  "Gurugram",
  "Jaipur",
  "Lucknow",
] as const;

const eventTypes = [
  ...new Set([
    ...auditRecords.map((record) => record.action),
    "user.invited",
    "user.suspended",
    "sso.connection.updated",
    "scim.user.provisioned",
    "invoice.paid",
    "refund.created",
  ]),
];

/** GST state codes: the place of supply on every Qeet Pay invoice. */
const gstStates: readonly [string, string, boolean?][] = [
  ["01", "Jammu and Kashmir", true],
  ["02", "Himachal Pradesh"],
  ["03", "Punjab"],
  ["04", "Chandigarh", true],
  ["05", "Uttarakhand"],
  ["06", "Haryana"],
  ["07", "Delhi", true],
  ["08", "Rajasthan"],
  ["09", "Uttar Pradesh"],
  ["10", "Bihar"],
  ["11", "Sikkim"],
  ["12", "Arunachal Pradesh"],
  ["13", "Nagaland"],
  ["14", "Manipur"],
  ["15", "Mizoram"],
  ["16", "Tripura"],
  ["17", "Meghalaya"],
  ["18", "Assam"],
  ["19", "West Bengal"],
  ["20", "Jharkhand"],
  ["21", "Odisha"],
  ["22", "Chhattisgarh"],
  ["23", "Madhya Pradesh"],
  ["24", "Gujarat"],
  ["26", "Dadra and Nagar Haveli and Daman and Diu", true],
  ["27", "Maharashtra"],
  ["29", "Karnataka"],
  ["30", "Goa"],
  ["31", "Lakshadweep", true],
  ["32", "Kerala"],
  ["33", "Tamil Nadu"],
  ["34", "Puducherry", true],
  ["35", "Andaman and Nicobar Islands", true],
  ["36", "Telangana"],
  ["37", "Andhra Pradesh"],
  ["38", "Ladakh", true],
];

const placeOfSupply: ComboboxOption[] = gstStates.map(([code, name, territory]) => ({
  value: code,
  label: name,
  description: territory ? "Union territory" : undefined,
  detail: code,
  keywords: [code],
}));

const gstinDirectory = [
  "Acme India Pvt Ltd · 29AAACA1234F1Z5",
  "Bharat FinServ · 27AABCB5678K1Z2",
  "Zenvia Health · 33AADCZ9012M1Z8",
  "Kanpur Logistics · 09AAFCK3456P1Z1",
  "Northwind Retail · 29AAGCN7788Q1Z4",
  "Coastal Spices Exports · 32AAHCC2468R1Z9",
  "Indus Motors · 24AAICI1357S1Z6",
  "Lotus Education Trust · 36AAJCL8642T1Z3",
];

/** Suggestions that arrive from a lookup: `loading` while the request is in flight. */
function GstinLookupDemo() {
  const [suggestions, setSuggestions] = useState<readonly string[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <Field className="w-80">
      <FieldLabel>Customer</FieldLabel>
      <FieldControl
        render={
          <Autocomplete
            items={suggestions}
            loading={loading}
            loadingMessage="Looking up GST registrations…"
            placeholder="Name or GSTIN"
            onValueChange={(next) => {
              setLoading(true);
              window.clearTimeout(timer.current);
              timer.current = window.setTimeout(() => {
                const needle = next.trim().toLowerCase();
                setSuggestions(
                  needle
                    ? gstinDirectory.filter((entry) => entry.toLowerCase().includes(needle))
                    : [],
                );
                setLoading(false);
              }, 600);
            }}
          />
        }
      />
      <FieldDescription>Suggestions come from your Qeet Pay customer list.</FieldDescription>
    </Field>
  );
}

const comboboxControls = {
  placeholder: text("Search tenants…", "Placeholder"),
  defaultValue: select(["", ...tenants.map((tenant) => tenant.id)], "", "Default value"),
  emptyMessage: text("No tenant matches that name.", "Empty message"),
  limit: num(0, { min: 0, max: 10, label: "limit (0 = none)" }),
  loading: bool(false),
  autoHighlight: bool(false, "autoHighlight"),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

const autocompleteControls = {
  placeholder: text("Start typing a city", "Placeholder"),
  defaultValue: text("", "Default value"),
  emptyMessage: text("No matching city — the typed value is kept.", "Empty message"),
  limit: num(0, { min: 0, max: 10, label: "limit (0 = none)" }),
  loading: bool(false),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

export const examples: FamilyExamples = {
  combobox: {
    minHeight: 480,
    demos: [
      {
        name: "Default",
        description:
          "Type to filter, then pick with a click or Enter. Suspended tenants are disabled options.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Tenant</FieldLabel>
            <FieldControl
              render={
                <Combobox
                  items={tenantOptions}
                  placeholder="Search tenants…"
                  emptyMessage="No tenant matches that name."
                />
              }
            />
            <FieldDescription>Only Owners can move users between tenants.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "With a value",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Billing contact</FieldLabel>
            <FieldControl
              render={
                <Combobox items={billingContacts} defaultValue="usr_04" name="billing_contact" />
              }
            />
          </Field>
        ),
      },
      {
        name: "Multiple (MultiSelect)",
        description: "The multi-value sibling: selections render as removable chips.",
        render: () => (
          <Field className="w-80">
            <FieldLabel>API key scopes</FieldLabel>
            <FieldControl
              render={
                <MultiSelect
                  items={scopeOptions}
                  defaultValue={["payments:write", "invoices:read"]}
                  placeholder="Add a scope…"
                  name="scopes"
                />
              }
            />
            <FieldDescription>Grant the least the checkout service needs.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Server-side search",
        description:
          "`filter={null}` with a controlled query: results load as you type, with a spinner and a polite announcement.",
        render: () => <DirectorySearchDemo />,
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Settlement tenant</FieldLabel>
            <FieldControl
              render={<Combobox items={tenantOptions} required placeholder="Search tenants…" />}
            />
            <FieldError>Choose the tenant this settlement belongs to.</FieldError>
          </Field>
        ),
      },
      {
        name: "Long list with limit",
        description:
          "36 states and UTs: `limit` renders the first 6 matches and says to keep typing. The GST code is searchable via keywords.",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Place of supply</FieldLabel>
            <FieldControl
              render={
                <Combobox
                  items={placeOfSupply}
                  limit={6}
                  limitMessage="Keep typing a state name or its 2-digit GST code."
                  autoHighlight
                  placeholder="State or GST code"
                />
              }
            />
            <FieldDescription>Decides CGST + SGST (same state) or IGST.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Read-only",
        description: "Focusable and announced with its value, but the list never opens.",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Billing contact</FieldLabel>
            <FieldControl
              render={<Combobox items={billingContacts} defaultValue="usr_11" readOnly />}
            />
            <FieldDescription>Set by the Owner; ask Ananya Iyer to change it.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-72" data-disabled="true">
            <FieldLabel>Home tenant</FieldLabel>
            <FieldControl
              render={<Combobox items={tenantOptions} defaultValue="tnt_acme" disabled />}
            />
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls: comboboxControls,
      render: (v) => (
        <div className="w-72">
          <Combobox
            key={v.defaultValue}
            aria-label="Tenant"
            items={tenantOptions}
            placeholder={v.placeholder}
            defaultValue={v.defaultValue || undefined}
            emptyMessage={v.emptyMessage}
            limit={v.limit > 0 ? v.limit : undefined}
            loading={v.loading}
            autoHighlight={v.autoHighlight}
            disabled={v.disabled}
            readOnly={v.readOnly}
            aria-invalid={v.invalid || undefined}
          />
        </div>
      ),
      code: (v) =>
        jsx("Combobox", {
          "aria-label": "Tenant",
          items: expr("tenantOptions"),
          placeholder: v.placeholder || undefined,
          defaultValue: v.defaultValue || undefined,
          emptyMessage: v.emptyMessage || undefined,
          limit: v.limit > 0 ? v.limit : undefined,
          loading: v.loading,
          autoHighlight: v.autoHighlight,
          disabled: v.disabled,
          readOnly: v.readOnly,
          "aria-invalid": v.invalid,
        }),
    }),
  },

  autocomplete: {
    minHeight: 320,
    demos: [
      {
        name: "Default",
        description: "Suggestions are advisory: whatever is typed is the submitted value.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Office city</FieldLabel>
            <FieldControl
              render={<Autocomplete items={cities} name="city" placeholder="Start typing a city" />}
            />
          </Field>
        ),
      },
      {
        name: "Loading suggestions",
        description:
          "Type “in” or a GSTIN prefix: a spinner shows and the popup is aria-busy until results land.",
        render: () => <GstinLookupDemo />,
      },
      {
        name: "Event type filter",
        description: "`limit={5}` caps the suggestions; keep typing to narrow them.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Audit event</FieldLabel>
            <FieldControl
              render={
                <Autocomplete
                  items={eventTypes}
                  defaultValue="user."
                  limit={5}
                  emptyMessage="No known event — search runs on the typed text."
                  className="font-mono"
                />
              }
            />
            <FieldDescription>
              Matches events in the last 90 days of the audit log.
            </FieldDescription>
          </Field>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Place of business</FieldLabel>
            <FieldControl render={<Autocomplete items={cities} defaultValue="Bangalor" />} />
            <FieldError>Use the city as registered on the GST certificate (Bengaluru).</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled and read-only",
        render: () => (
          <FieldGroup className="w-72">
            <Field data-disabled="true">
              <FieldLabel>Billing city</FieldLabel>
              <FieldControl
                render={<Autocomplete items={cities} defaultValue="Bengaluru" disabled />}
              />
            </Field>
            <Field>
              <FieldLabel>Registered city</FieldLabel>
              <FieldControl
                render={<Autocomplete items={cities} defaultValue="Mumbai" readOnly />}
              />
              <FieldDescription>
                From the GST certificate; edit it on the GST portal.
              </FieldDescription>
            </Field>
          </FieldGroup>
        ),
      },
    ],
    playground: definePlayground({
      controls: autocompleteControls,
      render: (v) => (
        <div className="w-72">
          <Autocomplete
            key={v.defaultValue}
            items={cities}
            aria-label="Office city"
            placeholder={v.placeholder}
            defaultValue={v.defaultValue || undefined}
            emptyMessage={v.emptyMessage}
            limit={v.limit > 0 ? v.limit : undefined}
            loading={v.loading}
            disabled={v.disabled}
            readOnly={v.readOnly}
            aria-invalid={v.invalid || undefined}
          />
        </div>
      ),
      code: (v) =>
        jsx("Autocomplete", {
          items: expr("cities"),
          "aria-label": "Office city",
          placeholder: v.placeholder || undefined,
          defaultValue: v.defaultValue || undefined,
          emptyMessage: v.emptyMessage || undefined,
          limit: v.limit > 0 ? v.limit : undefined,
          loading: v.loading,
          disabled: v.disabled,
          readOnly: v.readOnly,
          "aria-invalid": v.invalid,
        }),
    }),
  },
};
