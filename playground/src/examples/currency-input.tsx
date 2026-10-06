import {
  CurrencyInput,
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@qeetrix/ui";
import { useState } from "react";
import { formatInr, paymentWebhook } from "../data/qeet";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const GST_RATE = 18;
/** The captured payment from the webhook sample (₹2,92,640 for QP-INV-2026-00412). */
const capturedRupees = paymentWebhook.data.payment.amount;
const { fees } = paymentWebhook.data.payment;
/** What reached the bank after platform fees and GST on fees. */
const settledRupees = capturedRupees - fees.platform - fees.gst_on_fees;

function InvoiceAmountDemo() {
  const [amount, setAmount] = useState<number | undefined>(248000);
  const taxable = amount ?? 0;
  const gst = Math.round(taxable * GST_RATE) / 100;
  return (
    <Field className="w-72">
      <FieldLabel>Taxable value</FieldLabel>
      <FieldControl
        render={
          <CurrencyInput currency="INR" locale="en-IN" value={amount} onValueChange={setAmount} />
        }
      />
      <FieldDescription>
        + {formatInr(gst)} GST ({GST_RATE}%) = <strong>{formatInr(taxable + gst)}</strong>
      </FieldDescription>
    </Field>
  );
}

function RefundDemo() {
  const [amount, setAmount] = useState<number | undefined>(300000);
  const tooMuch = (amount ?? 0) > capturedRupees;
  return (
    <Field className="w-72">
      <FieldLabel>Refund amount</FieldLabel>
      <FieldControl
        render={
          <CurrencyInput currency="INR" locale="en-IN" value={amount} onValueChange={setAmount} />
        }
      />
      {tooMuch ? (
        <FieldError>Refund can't exceed the captured {formatInr(capturedRupees)}.</FieldError>
      ) : (
        <FieldDescription>Up to {formatInr(capturedRupees)} on pay_8Kq2Nf.</FieldDescription>
      )}
    </Field>
  );
}

function ForeignCurrencyDemo() {
  const [usd, setUsd] = useState<number | undefined>(1250);
  const [eur, setEur] = useState<number | undefined>(980.5);
  return (
    <FieldGroup className="w-72">
      <Field>
        <FieldLabel>Export invoice (USD)</FieldLabel>
        <FieldControl
          render={
            <CurrencyInput currency="USD" locale="en-US" value={usd} onValueChange={setUsd} />
          }
        />
      </Field>
      <Field>
        <FieldLabel>Northwind Retail (EUR, de-DE)</FieldLabel>
        <FieldControl
          render={
            <CurrencyInput currency="EUR" locale="de-DE" value={eur} onValueChange={setEur} />
          }
        />
        <FieldDescription>Typed in German notation: 1.234,56.</FieldDescription>
      </Field>
    </FieldGroup>
  );
}

function FormatOnBlurDemo() {
  const [formatted, setFormatted] = useState<number | undefined>(1500);
  const [raw, setRaw] = useState<number | undefined>(1500);
  return (
    <FieldGroup className="w-72">
      <Field>
        <FieldLabel>Late-payment fee</FieldLabel>
        <FieldControl
          render={
            <CurrencyInput
              currency="INR"
              locale="en-IN"
              value={formatted}
              onValueChange={setFormatted}
            />
          }
        />
        <FieldDescription>
          Default: rewritten as ₹ with paise when you leave the field.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel>UPI collect limit</FieldLabel>
        <FieldControl
          render={
            <CurrencyInput
              currency="INR"
              locale="en-IN"
              formatOnBlur={false}
              value={raw}
              onValueChange={setRaw}
            />
          }
        />
        <FieldDescription>
          With formatOnBlur off, the field keeps exactly what was typed.
        </FieldDescription>
      </Field>
    </FieldGroup>
  );
}

function PlaygroundCurrency({
  currency,
  locale,
  placeholder,
  formatOnBlur,
  disabled,
  readOnly,
  invalid,
}: {
  currency: string;
  locale: string;
  placeholder: string;
  formatOnBlur: boolean;
  disabled: boolean;
  readOnly: boolean;
  invalid: boolean;
}) {
  // A read-only amount needs a value to show.
  const [amount, setAmount] = useState<number | undefined>(readOnly ? 248000 : undefined);
  return (
    <div className="flex w-72 flex-col gap-2">
      <CurrencyInput
        currency={currency}
        locale={locale}
        aria-label="Amount"
        placeholder={placeholder || undefined}
        formatOnBlur={formatOnBlur}
        value={amount}
        onValueChange={setAmount}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={invalid || undefined}
      />
      <p className="text-caption text-muted-foreground">
        onValueChange →{" "}
        <span className="font-mono">{amount === undefined ? "undefined" : amount}</span>
      </p>
    </div>
  );
}

const currencyControls = {
  currency: select(["INR", "USD", "EUR", "GBP", "AED", "SGD"] as const, "INR"),
  locale: select(["en-IN", "en-US", "de-DE", "en-GB", "ar-AE"] as const, "en-IN"),
  placeholder: text("0.00", "Placeholder"),
  formatOnBlur: bool(true, "formatOnBlur"),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

export const examples: FamilyExamples = {
  "currency-input": {
    minHeight: 420,
    demos: [
      {
        name: "Invoice amount",
        description: "Emits a number; the description recomputes GST from it.",
        render: () => <InvoiceAmountDemo />,
      },
      {
        name: "Validated refund",
        description: "Type more than the captured amount to see the error.",
        render: () => <RefundDemo />,
      },
      {
        name: "Other currencies and locales",
        render: () => <ForeignCurrencyDemo />,
      },
      {
        name: "Format on blur",
        description: "Type 1500 into each and tab away.",
        render: () => <FormatOnBlurDemo />,
      },
      {
        name: "Read-only and disabled",
        render: () => (
          <FieldGroup className="w-72">
            <Field>
              <FieldLabel>Captured on pay_8Kq2Nf</FieldLabel>
              <FieldControl
                render={
                  <CurrencyInput currency="INR" locale="en-IN" value={capturedRupees} readOnly />
                }
              />
              <FieldDescription>
                Read-only: focusable and copyable for reconciliation.
              </FieldDescription>
            </Field>
            <Field data-disabled="true">
              <FieldLabel>Settled to HDFC ••4821</FieldLabel>
              <FieldControl
                render={
                  <CurrencyInput currency="INR" locale="en-IN" value={settledRupees} disabled />
                }
              />
              <FieldDescription>Settlement SETL-2026-1006 · T+1</FieldDescription>
            </Field>
          </FieldGroup>
        ),
      },
    ],
    playground: definePlayground({
      controls: currencyControls,
      render: (v) => (
        <PlaygroundCurrency
          key={`${v.currency}-${v.locale}-${v.readOnly}`}
          currency={v.currency}
          locale={v.locale}
          placeholder={v.placeholder}
          formatOnBlur={v.formatOnBlur}
          disabled={v.disabled}
          readOnly={v.readOnly}
          invalid={v.invalid}
        />
      ),
      code: (v) =>
        jsx("CurrencyInput", {
          currency: v.currency,
          locale: v.locale,
          "aria-label": "Amount",
          placeholder: v.placeholder || undefined,
          value: expr("amount"),
          onValueChange: expr("setAmount"),
          ...changedProps(v, currencyControls, ["formatOnBlur", "disabled", "readOnly"]),
          "aria-invalid": v.invalid,
        }),
    }),
  },
};
