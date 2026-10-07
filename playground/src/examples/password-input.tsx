import { CheckIcon, XIcon } from "@qeetrix/icons";
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  PasswordInput,
  PasswordStrengthMeter,
  type PasswordStrengthScore,
} from "@qeetrix/ui";
import { useState } from "react";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/** The Qeet ID tenant password policy for Acme India. */
const policy = [
  { id: "length", label: "At least 12 characters", test: (value: string) => value.length >= 12 },
  {
    id: "case",
    label: "Upper- and lower-case letters",
    test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value),
  },
  { id: "digit", label: "A number", test: (value: string) => /\d/.test(value) },
  { id: "symbol", label: "A symbol", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
  {
    id: "name",
    label: "Doesn't contain “acme”",
    test: (value: string) => value.length > 0 && !/acme/i.test(value),
  },
] as const;

function feedbackFor(value: string): string[] {
  if (!value) return [];
  return policy
    .filter((rule) => !rule.test(value))
    .map((rule) => `Add: ${rule.label.toLowerCase()}`);
}

function NewPasswordDemo() {
  const [password, setPassword] = useState("Bengaluru2026");
  return (
    <Field className="w-80">
      <FieldLabel>New password</FieldLabel>
      <FieldControl
        render={
          <PasswordInput
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        }
      />
      <PasswordStrengthMeter value={password} />
      <ul className="flex flex-col gap-1 text-caption" aria-label="Password policy">
        {policy.map((rule) => {
          const met = rule.test(password);
          return (
            <li
              key={rule.id}
              className={
                met
                  ? "flex items-center gap-1.5 text-success-text"
                  : "flex items-center gap-1.5 text-muted-foreground"
              }
            >
              {met ? (
                <CheckIcon aria-hidden className="size-3.5" />
              ) : (
                <XIcon aria-hidden className="size-3.5" />
              )}
              <span>
                {rule.label}
                <span className="sr-only">{met ? " (met)" : " (not met)"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Field>
  );
}

function LiveMeterDemo() {
  const [password, setPassword] = useState("acmeindia");
  return (
    <div className="flex w-72 flex-col gap-2">
      <PasswordInput
        aria-label="Admin console password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <PasswordStrengthMeter value={password} feedback={feedbackFor(password)} />
    </div>
  );
}

const samples = [
  { id: "empty", value: "", note: "Empty" },
  { id: "weak", value: "qeet123", note: "7 characters" },
  { id: "fair", value: "acmeindia", note: "9 lower-case letters" },
  { id: "good", value: "Bengaluru2026", note: "13 characters, 3 classes" },
  { id: "strong", value: "Kx7#mPq2!vLr9@Wd", note: "16 characters, 4 classes" },
] as const;

const hindiLabels: [string, string, string, string, string] = [
  "",
  "कमज़ोर",
  "ठीक-ठाक",
  "अच्छा",
  "मज़बूत",
];

const passwordControls = {
  placeholder: text("Enter your password", "Placeholder"),
  defaultValue: text("", "Default value"),
  showToggle: bool(true, "showToggle"),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  required: bool(false),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

const meterControls = {
  value: text("Bengaluru2026", "value"),
  score: select(["auto", "0", "1", "2", "3", "4"] as const, "auto", "score"),
  hideLabel: bool(false, "hideLabel"),
  feedback: bool(false, "Policy feedback"),
};

export const examples: FamilyExamples = {
  "password-input": {
    minHeight: 360,
    demos: [
      {
        name: "Sign in",
        description: "The eye button toggles visibility; its label flips between show and hide.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Password</FieldLabel>
            <FieldControl
              render={
                <PasswordInput autoComplete="current-password" placeholder="Enter your password" />
              }
            />
          </Field>
        ),
      },
      {
        name: "New password with policy",
        description:
          "Controlled value drives the strength meter and the tenant's policy checklist.",
        render: () => <NewPasswordDemo />,
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Current password</FieldLabel>
            <FieldControl render={<PasswordInput defaultValue="qeet123" />} />
            <FieldError>
              That password is incorrect. 2 attempts left before a 15-minute lock.
            </FieldError>
          </Field>
        ),
      },
      {
        name: "Without toggle",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Confirm password</FieldLabel>
            <FieldControl
              render={<PasswordInput showToggle={false} autoComplete="new-password" />}
            />
            <FieldDescription>Re-type the password; it stays masked.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Read-only",
        description:
          "A generated temporary password: read-only, but still revealable and copyable for the admin.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Temporary password for Meera Krishnan</FieldLabel>
            <FieldControl render={<PasswordInput readOnly defaultValue="Kx7#mPq2!vLr9@Wd" />} />
            <FieldDescription>
              She must change it at first sign-in. Expires in 24 hours.
            </FieldDescription>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-72" data-disabled="true">
            <FieldLabel>Password</FieldLabel>
            <FieldControl render={<PasswordInput disabled defaultValue="managed-by-sso" />} />
            <FieldDescription>
              Acme India signs in with Okta SSO; passwords are off.
            </FieldDescription>
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls: passwordControls,
      render: (v) => (
        <div className="w-72">
          <PasswordInput
            key={v.defaultValue}
            aria-label="Password"
            placeholder={v.placeholder}
            defaultValue={v.defaultValue || undefined}
            showToggle={v.showToggle}
            disabled={v.disabled}
            readOnly={v.readOnly}
            required={v.required}
            aria-invalid={v.invalid || undefined}
          />
        </div>
      ),
      code: (v) =>
        jsx("PasswordInput", {
          "aria-label": "Password",
          placeholder: v.placeholder || undefined,
          defaultValue: v.defaultValue || undefined,
          ...changedProps(v, passwordControls, ["showToggle", "disabled", "readOnly", "required"]),
          "aria-invalid": v.invalid,
        }),
    }),
  },

  "password-strength-meter": {
    minHeight: 340,
    demos: [
      {
        name: "Scores",
        description: "The built-in heuristic: length plus character-class diversity.",
        render: () => (
          <div className="flex w-72 flex-col gap-4">
            {samples.map((sample) => (
              <div key={sample.id} className="flex flex-col gap-1">
                <span className="font-mono text-caption text-muted-foreground">
                  {sample.value || "—"} · {sample.note}
                </span>
                <PasswordStrengthMeter value={sample.value} />
              </div>
            ))}
          </div>
        ),
      },
      {
        name: "Live, with feedback",
        render: () => <LiveMeterDemo />,
      },
      {
        name: "Custom score and labels",
        description: "Pass `score` from a real estimator (e.g. zxcvbn) and localised `labels`.",
        render: () => (
          <div className="flex w-72 flex-col gap-4">
            <PasswordStrengthMeter
              value="ignored"
              score={3}
              labels={hindiLabels}
              statusPrefix="पासवर्ड की मज़बूती:"
            />
            <PasswordStrengthMeter
              value="ignored"
              score={1}
              labels={hindiLabels}
              statusPrefix="पासवर्ड की मज़बूती:"
            />
          </div>
        ),
      },
      {
        name: "Bar only",
        render: () => (
          <div className="w-72">
            <PasswordStrengthMeter value="Kx7#mPq2!vLr9@Wd" hideLabel />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: meterControls,
      render: (v) => (
        <div className="w-72">
          <PasswordStrengthMeter
            value={v.value}
            score={v.score === "auto" ? undefined : (Number(v.score) as PasswordStrengthScore)}
            hideLabel={v.hideLabel}
            feedback={v.feedback ? feedbackFor(v.value) : undefined}
          />
        </div>
      ),
      code: (v) =>
        jsx("PasswordStrengthMeter", {
          value: v.value,
          score: v.score === "auto" ? undefined : Number(v.score),
          hideLabel: v.hideLabel,
          feedback: v.feedback ? expr(JSON.stringify(feedbackFor(v.value))) : undefined,
        }),
    }),
  },
};
