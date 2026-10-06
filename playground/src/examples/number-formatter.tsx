import { NumberFormatter } from "@qeetrix/ui";
import type { ReactNode } from "react";
import {
  invoices,
  invoiceTotals,
  logEvents,
  monthlyRevenue,
  paymentMethods,
  tenants,
} from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

const inr = { style: "currency", currency: "INR" } as const;

const [acmeInvoice, bharatInvoice] = invoices;
const bharatTotal = bharatInvoice ? invoiceTotals(bharatInvoice).total : 0;
const acmeGst = acmeInvoice ? invoiceTotals(acmeInvoice).tax : 0;
const september = monthlyRevenue.find((month) => month.month === "Sep");
const august = monthlyRevenue.find((month) => month.month === "Aug");
const yearCollected = monthlyRevenue.reduce((sum, month) => sum + month.collected, 0);
const upiShare = (paymentMethods.find((method) => method.key === "upi")?.share ?? 0) / 100;
const growth = september && august ? september.collected / august.collected - 1 : 0;
const refundRate = september ? september.refunds / september.collected : 0;
const batch = logEvents.find((event) => event.service === "qeet-logs-ingest")?.attributes;
const batchBytes = typeof batch?.bytes === "number" ? batch.bytes : 0;
const allUsers = tenants.reduce((sum, tenant) => sum + tenant.users, 0);
const bharatUsers = tenants.find((tenant) => tenant.id === "tnt_bharat")?.users ?? 0;
const batchRecords = typeof batch?.records === "number" ? batch.records : 0;

/** Label/value rows: what a summary card or invoice footer looks like. */
function Figures({ rows }: { rows: { term: string; value: ReactNode }[] }) {
  return (
    <dl className="grid w-80 grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
      {rows.map((row) => (
        <div key={row.term} className="contents">
          <dt className="text-muted-foreground">{row.term}</dt>
          <dd className="text-end font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const controls = {
  value: num(bharatTotal, { label: "value" }),
  style: select(["currency", "decimal", "percent", "unit"] as const, "currency", "Style"),
  locale: select(["en-IN", "en-US", "en-GB", "de-DE", "hi-IN"] as const, "en-IN"),
  notation: select(["standard", "compact", "scientific", "engineering"] as const, "standard"),
  fixedDecimals: bool(false, "Fixed decimals"),
  decimals: num(2, { min: 0, max: 6, label: "decimals" }),
  prefix: text("", "prefix"),
  suffix: text("", "suffix"),
};

const styleOptions = {
  currency: { options: inr, code: '{ style: "currency", currency: "INR" }' },
  decimal: { options: undefined, code: undefined },
  percent: { options: { style: "percent" } as const, code: '{ style: "percent" }' },
  unit: {
    options: { style: "unit", unit: "kilobyte" } as const,
    code: '{ style: "unit", unit: "kilobyte" }',
  },
};

export const examples: FamilyExamples = {
  "number-formatter": {
    demos: [
      {
        name: "Indian rupees",
        description: "`en-IN` groups by lakh and crore: ₹13,86,500.00, not ₹1,386,500.00.",
        render: () => (
          <Figures
            rows={[
              {
                term: `${bharatInvoice?.number} total`,
                value: <NumberFormatter value={bharatTotal} locale="en-IN" options={inr} />,
              },
              {
                term: "GST on QP-INV-2026-00412",
                value: <NumberFormatter value={acmeGst} locale="en-IN" options={inr} />,
              },
              {
                term: "Collected in September",
                value: (
                  <NumberFormatter
                    value={september?.collected ?? 0}
                    locale="en-IN"
                    options={{ ...inr, maximumFractionDigits: 0 }}
                  />
                ),
              },
            ]}
          />
        ),
      },
      {
        name: "Compact",
        description: "Compact notation follows the locale: lakh/crore in en-IN, million in en-US.",
        render: () => (
          <Figures
            rows={[
              {
                term: "September (en-IN)",
                value: (
                  <NumberFormatter
                    value={september?.collected ?? 0}
                    locale="en-IN"
                    notation="compact"
                    options={{ ...inr, maximumFractionDigits: 1 }}
                  />
                ),
              },
              {
                term: "Last 12 months (en-IN)",
                value: (
                  <NumberFormatter
                    value={yearCollected}
                    locale="en-IN"
                    notation="compact"
                    options={{ ...inr, maximumFractionDigits: 2 }}
                  />
                ),
              },
              {
                term: "Last 12 months (en-US)",
                value: (
                  <NumberFormatter
                    value={yearCollected}
                    locale="en-US"
                    notation="compact"
                    options={{ ...inr, maximumFractionDigits: 1 }}
                  />
                ),
              },
              {
                term: "Active users, all tenants",
                value: <NumberFormatter value={allUsers} locale="en-IN" notation="compact" />,
              },
            ]}
          />
        ),
      },
      {
        name: "Percent",
        render: () => (
          <Figures
            rows={[
              {
                term: "UPI share of volume",
                value: (
                  <NumberFormatter value={upiShare} locale="en-IN" options={{ style: "percent" }} />
                ),
              },
              {
                term: "Collections vs August",
                value: (
                  <NumberFormatter
                    value={growth}
                    locale="en-IN"
                    options={{
                      style: "percent",
                      signDisplay: "exceptZero",
                      maximumFractionDigits: 1,
                    }}
                    className="text-success-text"
                  />
                ),
              },
              {
                term: "Refund rate, September",
                value: (
                  <NumberFormatter
                    value={refundRate}
                    locale="en-IN"
                    options={{ style: "percent", maximumFractionDigits: 2 }}
                  />
                ),
              },
            ]}
          />
        ),
      },
      {
        name: "Units",
        description: "A Qeet Logs batch flush, through Intl unit formatting.",
        render: () => (
          <Figures
            rows={[
              {
                term: "Batch size",
                value: (
                  <NumberFormatter
                    value={batchBytes / 1024 / 1024}
                    locale="en-IN"
                    options={{ style: "unit", unit: "megabyte", maximumFractionDigits: 1 }}
                  />
                ),
              },
              {
                term: "Records",
                value: <NumberFormatter value={batchRecords} locale="en-IN" />,
              },
              {
                term: "UPI collect p99",
                value: (
                  <NumberFormatter
                    value={5012}
                    locale="en-IN"
                    options={{ style: "unit", unit: "millisecond" }}
                  />
                ),
              },
              {
                term: "Ingest rate",
                value: (
                  <NumberFormatter
                    value={18.4}
                    locale="en-IN"
                    options={{ style: "unit", unit: "megabyte-per-second", unitDisplay: "short" }}
                  />
                ),
              },
            ]}
          />
        ),
      },
      {
        name: "Prefix, suffix and decimals",
        render: () => (
          <Figures
            rows={[
              {
                term: "USD settlement rate",
                value: (
                  <NumberFormatter
                    value={88.4}
                    decimals={2}
                    prefix="₹"
                    suffix=" / USD"
                    locale="en-IN"
                  />
                ),
              },
              {
                term: "Users at Bharat FinServ",
                value: (
                  <NumberFormatter
                    value={bharatUsers}
                    prefix="≈ "
                    suffix=" users"
                    locale="en-IN"
                    notation="compact"
                  />
                ),
              },
            ]}
          />
        ),
      },
    ],
    playground: definePlayground({
      controls,
      render: (v) => (
        <NumberFormatter
          value={v.value}
          locale={v.locale}
          notation={v.notation}
          decimals={v.fixedDecimals ? v.decimals : undefined}
          options={styleOptions[v.style].options}
          prefix={v.prefix || undefined}
          suffix={v.suffix || undefined}
          className="text-title font-heading"
        />
      ),
      code: (v) => {
        const optionsCode = styleOptions[v.style].code;
        return jsx("NumberFormatter", {
          value: v.value,
          locale: v.locale,
          notation: v.notation === "standard" ? undefined : v.notation,
          decimals: v.fixedDecimals ? v.decimals : undefined,
          options: optionsCode ? expr(optionsCode) : undefined,
          prefix: v.prefix || undefined,
          suffix: v.suffix || undefined,
        });
      },
    }),
  },
};
