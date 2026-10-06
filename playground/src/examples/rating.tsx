import { Field, FieldDescription, FieldError, FieldLabel, Rating } from "@qeetrix/ui";
import { HeartIcon } from "lucide-react";
import { useState } from "react";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select } from "../registry/types";

const verdicts = ["Not rated", "Poor", "Fair", "Good", "Great", "Excellent"];

function SupportCallDemo() {
  const [score, setScore] = useState(4);
  return (
    <Field className="w-72">
      <FieldLabel>Rate your onboarding call</FieldLabel>
      <div className="flex items-center gap-3">
        <Rating value={score} onChange={setScore} name="csat" />
        <span className="text-sm text-muted-foreground" aria-hidden>
          {verdicts[score]}
        </span>
      </div>
      <FieldDescription>Kanpur Logistics · with Neha Joshi, Customer Success</FieldDescription>
    </Field>
  );
}

const controls = {
  defaultValue: num(3.5, { min: 0, max: 10, step: 0.5, label: "Default value" }),
  max: num(5, { min: 3, max: 10, label: "max" }),
  allowHalf: bool(true, "allowHalf"),
  size: select(["sm", "default", "lg"] as const, "default"),
  readOnly: bool(false, "readOnly"),
  disabled: bool(false),
  showValue: bool(false, "showValue"),
  heart: bool(false, "Heart icon"),
};

export const examples: FamilyExamples = {
  rating: {
    demos: [
      {
        name: "Interactive",
        description: "Click a star or use the arrow keys; the Field label names the slider.",
        render: () => <SupportCallDemo />,
      },
      {
        name: "Read-only, with value",
        description: "`showValue` prints the number beside the stars (“4.5”) so it reads as text.",
        render: () => (
          <div className="flex items-center gap-2 text-sm">
            <Rating value={4.5} allowHalf readOnly showValue aria-label="Qeet Pay on G2" />
            <span className="text-muted-foreground">· 1,284 reviews on G2</span>
          </div>
        ),
      },
      {
        name: "Interactive, with value",
        description: "While pointing, the number follows the hover preview.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Rate the SCIM setup guide</FieldLabel>
            <Rating defaultValue={3.5} allowHalf showValue />
          </Field>
        ),
      },
      {
        name: "Sizes",
        render: () => (
          <div className="flex flex-col items-start gap-2">
            <Rating defaultValue={3} size="sm" aria-label="Small rating" />
            <Rating defaultValue={3} aria-label="Default rating" />
            <Rating defaultValue={3} size="lg" aria-label="Large rating" />
          </div>
        ),
      },
      {
        name: "Custom icon",
        render: () => (
          <Field className="w-72">
            <FieldLabel>How likely are you to recommend Qeet ID?</FieldLabel>
            <Rating defaultValue={4} icon={HeartIcon} />
          </Field>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Rate the resolution of INC-2041</FieldLabel>
            <Rating defaultValue={0} />
            <FieldError>Pick a rating before you close the ticket.</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Webhook reliability</FieldLabel>
            <Rating defaultValue={3} disabled />
            <FieldDescription>Survey closed on 30 Sept 2026.</FieldDescription>
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls,
      render: (v) => (
        <Rating
          key={`${v.defaultValue}-${v.max}`}
          defaultValue={Math.min(v.defaultValue, v.max)}
          max={v.max}
          allowHalf={v.allowHalf}
          size={v.size}
          readOnly={v.readOnly}
          disabled={v.disabled}
          showValue={v.showValue}
          icon={v.heart ? HeartIcon : undefined}
          aria-label="Onboarding call rating"
        />
      ),
      code: (v) =>
        jsx("Rating", {
          defaultValue: v.defaultValue,
          ...changedProps(v, controls, ["max", "size", "readOnly", "disabled"]),
          allowHalf: v.allowHalf,
          showValue: v.showValue,
          icon: v.heart ? expr("HeartIcon") : undefined,
          "aria-label": "Onboarding call rating",
        }),
    }),
  },
};
