import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  MaskInput,
  type MaskInputProps,
} from "@qeetrix/ui";
import { useState } from "react";
import { invoices } from "../data/qeet";
import { changedProps, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/**
 * Indian identifiers as masks. `+91 ` is a literal the mask inserts. The GSTIN `Z` and the IFSC
 * `0` stay `*` slots: a literal that the user also types is swallowed when it is the last
 * character so far (MaskInput does not render a trailing literal), so `HDFC0001234` typed into
 * `AAAA0******` would lose its zeros, and a lower-case `z` would not match the literal `Z`.
 */
const masks = {
  gstin: { mask: "##AAAAA####A***", label: "GSTIN", placeholder: "29AAACA1234F1Z5" },
  pan: { mask: "AAAAA####A", label: "PAN", placeholder: "AAACA1234F" },
  ifsc: { mask: "AAAA*******", label: "IFSC", placeholder: "HDFC0001234" },
  mobile: { mask: "+91 ##### #####", label: "Mobile", placeholder: "+91 98450 12345" },
  card: { mask: "#### #### #### ####", label: "Card number", placeholder: "4111 1111 1111 1111" },
  expiry: { mask: "##/##", label: "Expiry (MM/YY)", placeholder: "MM/YY" },
} as const;

type MaskKey = keyof typeof masks;

/** Controlled GSTIN entry: upper-cases as you type and reads the state code back. */
function GstinDemo() {
  const [gstin, setGstin] = useState(invoices[0].gstin);
  return (
    <Field className="w-72">
      <FieldLabel>Customer GSTIN</FieldLabel>
      <FieldControl
        render={
          <MaskInput
            mask={masks.gstin.mask}
            placeholder={masks.gstin.placeholder}
            value={gstin}
            onValueChange={(_raw, formatted) => setGstin(formatted.toUpperCase())}
            className="font-mono"
            spellCheck={false}
          />
        }
      />
      <FieldDescription>
        {gstin.length === 15
          ? `State code ${gstin.slice(0, 2)} · PAN ${gstin.slice(2, 12)}`
          : `${15 - gstin.length} characters to go`}
      </FieldDescription>
    </Field>
  );
}

/** Identifiers are upper-case: normalise the controlled value, not just its display. */
function UpperMaskInput({ defaultValue = "", ...props }: MaskInputProps) {
  const [value, setValue] = useState(defaultValue.toUpperCase());
  return (
    <MaskInput
      {...props}
      value={value}
      onValueChange={(_raw, formatted) => setValue(formatted.toUpperCase())}
      spellCheck={false}
    />
  );
}

function PlaygroundMask({
  maskKey,
  placeholder,
  disabled,
  readOnly,
  invalid,
}: {
  maskKey: MaskKey;
  placeholder: string;
  disabled: boolean;
  readOnly: boolean;
  invalid: boolean;
}) {
  const [values, setValues] = useState({ raw: "", formatted: "" });
  const spec = masks[maskKey];
  return (
    <div className="flex w-72 flex-col gap-2">
      <MaskInput
        mask={spec.mask}
        placeholder={placeholder || spec.placeholder}
        aria-label={spec.label}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={invalid || undefined}
        onValueChange={(raw, formatted) => setValues({ raw, formatted })}
        className="font-mono"
      />
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-caption text-muted-foreground">
        <dt>raw</dt>
        <dd className="font-mono">{values.raw || "—"}</dd>
        <dt>formatted</dt>
        <dd className="font-mono">{values.formatted || "—"}</dd>
      </dl>
    </div>
  );
}

const maskControls = {
  mask: select(Object.keys(masks) as MaskKey[], "gstin", "Mask"),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  invalid: bool(false, "Invalid (aria-invalid)"),
  placeholder: text("", "Placeholder override"),
};

export const examples: FamilyExamples = {
  "mask-input": {
    minHeight: 360,
    demos: [
      {
        name: "GSTIN",
        description: "Controlled: `onValueChange` gives the raw characters and the masked string.",
        render: () => <GstinDemo />,
      },
      {
        name: "KYC and bank details",
        render: () => (
          <FieldGroup className="w-72">
            <Field>
              <FieldLabel>PAN</FieldLabel>
              <FieldControl
                render={
                  <UpperMaskInput
                    mask={masks.pan.mask}
                    placeholder={masks.pan.placeholder}
                    className="font-mono"
                  />
                }
              />
            </Field>
            <Field>
              <FieldLabel>IFSC</FieldLabel>
              <FieldControl
                render={
                  <UpperMaskInput
                    mask={masks.ifsc.mask}
                    placeholder={masks.ifsc.placeholder}
                    className="font-mono"
                  />
                }
              />
              <FieldDescription>Settlements go to this branch via NEFT/IMPS.</FieldDescription>
            </Field>
          </FieldGroup>
        ),
      },
      {
        name: "Phone and card",
        description:
          "Digit-only masks switch the mobile keyboard to numeric; the +91 prefix is a literal the mask inserts.",
        render: () => (
          <FieldGroup className="w-72">
            <Field>
              <FieldLabel>Mobile for OTP</FieldLabel>
              <FieldControl
                render={
                  <MaskInput
                    mask={masks.mobile.mask}
                    placeholder={masks.mobile.placeholder}
                    autoComplete="tel-national"
                  />
                }
              />
            </Field>
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <Field>
                <FieldLabel>Card number</FieldLabel>
                <FieldControl
                  render={
                    <MaskInput
                      mask={masks.card.mask}
                      autoComplete="cc-number"
                      placeholder={masks.card.placeholder}
                    />
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Expiry</FieldLabel>
                <FieldControl
                  render={
                    <MaskInput mask={masks.expiry.mask} autoComplete="cc-exp" placeholder="MM/YY" />
                  }
                />
              </Field>
            </div>
          </FieldGroup>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Vendor GSTIN</FieldLabel>
            <FieldControl
              render={
                <UpperMaskInput
                  mask={masks.gstin.mask}
                  defaultValue="27AABCB5678"
                  className="font-mono"
                />
              }
            />
            <FieldError>GSTIN must be 15 characters; 4 are missing.</FieldError>
          </Field>
        ),
      },
      {
        name: "Read-only and disabled",
        description:
          "Read-only keeps a verified value focusable and copyable; disabled takes it out of the form.",
        render: () => (
          <FieldGroup className="w-72">
            <Field>
              <FieldLabel>Registered GSTIN</FieldLabel>
              <FieldControl
                render={
                  <MaskInput
                    mask={masks.gstin.mask}
                    defaultValue={invoices[1].gstin}
                    readOnly
                    className="font-mono"
                  />
                }
              />
              <FieldDescription>Verified against the GST portal on 2 Oct 2026.</FieldDescription>
            </Field>
            <Field data-disabled="true">
              <FieldLabel>Settlement IFSC</FieldLabel>
              <FieldControl
                render={
                  <MaskInput
                    mask={masks.ifsc.mask}
                    defaultValue="HDFC0004821"
                    disabled
                    className="font-mono"
                  />
                }
              />
              <FieldDescription>Change it from Settlements → Bank accounts.</FieldDescription>
            </Field>
          </FieldGroup>
        ),
      },
    ],
    playground: definePlayground({
      controls: maskControls,
      render: (v) => (
        <PlaygroundMask
          key={v.mask}
          maskKey={v.mask}
          placeholder={v.placeholder}
          disabled={v.disabled}
          readOnly={v.readOnly}
          invalid={v.invalid}
        />
      ),
      code: (v) =>
        jsx("MaskInput", {
          mask: masks[v.mask].mask,
          placeholder: v.placeholder || masks[v.mask].placeholder,
          "aria-label": masks[v.mask].label,
          ...changedProps(v, maskControls, ["disabled", "readOnly"]),
          "aria-invalid": v.invalid,
        }),
    }),
  },
};
