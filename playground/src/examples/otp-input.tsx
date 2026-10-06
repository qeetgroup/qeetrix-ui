import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  OTPInput,
  Spinner,
  toast,
} from "@qeetrix/ui";
import { useEffect, useRef, useState } from "react";
import { changedProps, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, text } from "../registry/types";

/** The code the sign-in demo accepts. */
const DEMO_CODE = "246810";

type SignInState = "idle" | "verifying" | "wrong" | "verified";

function OtpSignInDemo() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<SignInState>("idle");
  const rootRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  // The boxes are disabled while verifying, which drops focus: put it back for the retry.
  useEffect(() => {
    if (state === "wrong")
      rootRef.current?.querySelector<HTMLInputElement>("input:not([type=hidden])")?.focus();
  }, [state]);

  function verify(value: string) {
    setState("verifying");
    timer.current = window.setTimeout(() => {
      if (value === DEMO_CODE) {
        setState("verified");
        toast.success("Signed in to Acme India", { description: "Session ses_7f3a · Bengaluru" });
      } else {
        setCode("");
        setState("wrong");
      }
    }, 600);
  }

  return (
    <div ref={rootRef}>
      <Field className="w-fit">
        <FieldLabel>Verification code</FieldLabel>
        <FieldDescription>Sent by SMS to +91 98450 •••21. (Try {DEMO_CODE}.)</FieldDescription>
        <OTPInput
          name="otp"
          value={code}
          onChange={(next) => {
            setCode(next);
            if (state === "wrong") setState("idle");
          }}
          onComplete={verify}
          disabled={state === "verifying" || state === "verified"}
        />
        {state === "wrong" && <FieldError>That code is incorrect or has expired.</FieldError>}
        <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          {state === "verifying" && (
            <>
              <Spinner size="sm" label="Verifying" />
              Verifying…
            </>
          )}
          {state === "verified" && <span className="text-success-text">Verified</span>}
          {(state === "idle" || state === "wrong") && (
            <Button
              variant="link"
              className="h-auto px-0"
              onClick={() =>
                toast("A new code is on its way", { description: "Valid for 10 minutes" })
              }
            >
              Resend code
            </Button>
          )}
          {state === "verified" && (
            <Button
              variant="link"
              className="h-auto px-0"
              onClick={() => {
                setCode("");
                setState("idle");
              }}
            >
              Start over
            </Button>
          )}
        </div>
      </Field>
    </div>
  );
}

const otpControls = {
  length: num(6, { min: 4, max: 8, label: "length" }),
  groupSize: num(0, { min: 0, max: 4, label: "groupSize (0 = none)" }),
  defaultValue: text("", "Default value"),
  "aria-label": text("Verification code", "aria-label"),
  disabled: bool(false),
  required: bool(false),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

export const examples: FamilyExamples = {
  "otp-input": {
    minHeight: 420,
    demos: [
      {
        name: "Default",
        description:
          "Inside a Field the group takes the label and description. Paste a full code into any box.",
        render: () => (
          <Field className="w-fit">
            <FieldLabel>Authenticator code</FieldLabel>
            <OTPInput name="totp" />
            <FieldDescription>
              Open Qeet ID Authenticator and enter the 6-digit code.
            </FieldDescription>
          </Field>
        ),
      },
      {
        name: "Sign-in flow",
        description: "Verifies on `onComplete`, shows a busy state, then success or an error.",
        render: () => <OtpSignInDemo />,
      },
      {
        name: "Grouped",
        description: "`groupSize={3}` splits a 6-digit code into two visual groups of three.",
        render: () => (
          <Field className="w-fit">
            <FieldLabel>Email code</FieldLabel>
            <OTPInput groupSize={3} name="email_code" />
            <FieldDescription>
              Sent to rohan.mehta@acme.in · expires in 10 minutes.
            </FieldDescription>
          </Field>
        ),
      },
      {
        name: "Four digits",
        render: () => (
          <Field className="w-fit">
            <FieldLabel>UPI PIN confirmation</FieldLabel>
            <OTPInput length={4} name="pin" />
          </Field>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-fit">
            <FieldLabel>Email code</FieldLabel>
            <OTPInput defaultValue="135790" />
            <FieldError>Code expired. Request a new one from the sign-in page.</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-fit" data-disabled="true">
            <FieldLabel>Verification code</FieldLabel>
            <OTPInput defaultValue="48" disabled />
            <FieldDescription>Too many attempts. Try again in 14:52.</FieldDescription>
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls: otpControls,
      render: (v) => (
        <OTPInput
          key={`${v.length}-${v.defaultValue}`}
          length={v.length}
          groupSize={v.groupSize > 0 ? v.groupSize : undefined}
          defaultValue={v.defaultValue}
          aria-label={v["aria-label"]}
          disabled={v.disabled}
          required={v.required}
          aria-invalid={v.invalid || undefined}
        />
      ),
      code: (v) =>
        jsx("OTPInput", {
          ...changedProps(v, otpControls, ["length"]),
          groupSize: v.groupSize > 0 ? v.groupSize : undefined,
          defaultValue: v.defaultValue || undefined,
          "aria-label": v["aria-label"],
          ...changedProps(v, otpControls, ["disabled", "required"]),
          "aria-invalid": v.invalid,
        }),
    }),
  },
};
