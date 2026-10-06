import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  NumberField,
} from "@qeetrix/ui";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

const formats = {
  number: undefined,
  currency: { style: "currency", currency: "INR", maximumFractionDigits: 0 },
  percent: { style: "percent", maximumFractionDigits: 1 },
  unit: { style: "unit", unit: "hour", unitDisplay: "long" },
} satisfies Record<string, Intl.NumberFormatOptions | undefined>;

const formatCode: Record<keyof typeof formats, string | undefined> = {
  number: undefined,
  currency: '{ style: "currency", currency: "INR", maximumFractionDigits: 0 }',
  percent: '{ style: "percent", maximumFractionDigits: 1 }',
  unit: '{ style: "unit", unit: "hour", unitDisplay: "long" }',
};

const numberFieldControls = {
  defaultValue: num(25, { label: "Default value" }),
  min: num(1, { label: "min" }),
  max: num(500, { label: "max" }),
  step: num(1, { min: 0.001, label: "step" }),
  format: select(["number", "currency", "percent", "unit"] as const, "number"),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  required: bool(false),
  "aria-label": text("Seats", "aria-label"),
};

export const examples: FamilyExamples = {
  "number-field": {
    minHeight: 300,
    demos: [
      {
        name: "Default",
        description: "Type, use the steppers, or arrow keys (Shift for 10×).",
        render: () => (
          <Field className="w-56">
            <FieldLabel>Seats</FieldLabel>
            <FieldControl
              render={<NumberField name="seats" defaultValue={25} min={1} max={500} />}
            />
            <FieldDescription>₹349 per seat per month on Enterprise.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Currency",
        render: () => (
          <Field className="w-56">
            <FieldLabel>Monthly spend cap</FieldLabel>
            <FieldControl
              render={
                <NumberField
                  defaultValue={250000}
                  min={0}
                  step={1000}
                  largeStep={10000}
                  locale="en-IN"
                  format={formats.currency}
                />
              }
            />
          </Field>
        ),
      },
      {
        name: "Percent and units",
        render: () => (
          <FieldGroup className="w-56">
            <Field>
              <FieldLabel>Early-payment discount</FieldLabel>
              <FieldControl
                render={
                  <NumberField
                    defaultValue={0.02}
                    min={0}
                    max={0.2}
                    step={0.005}
                    locale="en-IN"
                    format={formats.percent}
                  />
                }
              />
            </Field>
            <Field>
              <FieldLabel>Session max age</FieldLabel>
              <FieldControl
                render={
                  <NumberField
                    defaultValue={12}
                    min={1}
                    max={24}
                    locale="en-IN"
                    format={formats.unit}
                  />
                }
              />
            </Field>
          </FieldGroup>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-56">
            <FieldLabel>Seats</FieldLabel>
            <FieldControl render={<NumberField defaultValue={2400} min={1} />} />
            <FieldError>
              Growth allows up to 2,000 seats. Upgrade to Enterprise for more.
            </FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled and read-only",
        render: () => (
          <FieldGroup className="w-56">
            <Field data-disabled="true">
              <FieldLabel>API rate limit (req/min)</FieldLabel>
              <FieldControl render={<NumberField defaultValue={600} disabled />} />
            </Field>
            <Field>
              <FieldLabel>GST rate (%)</FieldLabel>
              <FieldControl render={<NumberField defaultValue={18} readOnly />} />
              <FieldDescription>Set by the SAC code on the line item.</FieldDescription>
            </Field>
          </FieldGroup>
        ),
      },
    ],
    playground: definePlayground({
      controls: numberFieldControls,
      render: (v) => (
        <NumberField
          key={`${v.defaultValue}-${v.format}`}
          defaultValue={v.defaultValue}
          min={v.min}
          max={v.max}
          step={v.step}
          locale="en-IN"
          format={formats[v.format]}
          disabled={v.disabled}
          readOnly={v.readOnly}
          required={v.required}
          aria-label={v["aria-label"]}
          className="w-56"
        />
      ),
      code: (v) =>
        jsx("NumberField", {
          defaultValue: v.defaultValue,
          min: v.min,
          max: v.max,
          ...changedProps(v, numberFieldControls, ["step"]),
          locale: formatCode[v.format] ? "en-IN" : undefined,
          format: formatCode[v.format] ? expr(formatCode[v.format] ?? "") : undefined,
          ...changedProps(v, numberFieldControls, ["disabled", "readOnly", "required"]),
          "aria-label": v["aria-label"],
          className: "w-56",
        }),
    }),
  },
};
