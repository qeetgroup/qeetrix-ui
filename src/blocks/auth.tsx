"use client";

import * as React from "react";
import { Button } from "@/components/actions/button";
import { Alert, AlertDescription } from "@/components/feedback/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/inputs/field";
import { Form, FormActions } from "@/components/inputs/form";
import { Input } from "@/components/inputs/input";
import { OTPInput } from "@/components/inputs/otp-input";
import { PasswordStrengthMeter } from "@/components/inputs/password-strength-meter";
import { Separator } from "@/components/utility/separator";
import { cn } from "@/lib/utils";

interface AuthShellProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** Brand logo slot (pass a `@qeetrix/ui/brand` logo or any node). */
  logo?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Rendered beneath the card (e.g. "Don't have an account? Sign up"). */
  footer?: React.ReactNode;
}

/** Centered card frame for authentication screens. */
function AuthShell({
  logo,
  title,
  description,
  footer,
  className,
  children,
  ...props
}: AuthShellProps) {
  return (
    <div
      data-slot="auth-shell"
      className={cn("grid min-h-svh place-items-center p-4", className)}
      {...props}
    >
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          {logo}
          <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="rounded-xl bg-card p-6 text-card-foreground ring-1 ring-foreground/10">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4">
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}

function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <Alert variant="danger">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

interface LoginFormProps {
  onSubmit?: (values: { email: string; password: string }) => void;
  loading?: boolean;
  error?: string;
  /** Href for the "Forgot password?" link. */
  forgotHref?: string;
  /** Passkey / SSO buttons rendered below a divider. */
  socialButtons?: React.ReactNode;
  className?: string;
}

function readValues(form: HTMLFormElement) {
  const fd = new FormData(form);
  return (key: string) => String(fd.get(key) ?? "");
}

/** Email + password sign-in form. Library-agnostic — owns markup, not state. */
function LoginForm({
  onSubmit,
  loading,
  error,
  forgotHref,
  socialButtons,
  className,
}: LoginFormProps) {
  // IDs are instance-scoped: two LoginForms on one page must not produce duplicate
  // document IDs (a label would then focus the first instance's control). The `name`
  // attributes stay stable because they are the form's serialisation contract.
  const uid = React.useId();
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  return (
    <Form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const get = readValues(e.currentTarget);
        onSubmit?.({ email: get("email"), password: get("password") });
      }}
    >
      <FormError error={error} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={emailId}>Email</FieldLabel>
          <Input id={emailId} name="email" type="email" autoComplete="email" required />
        </Field>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
            {forgotHref && (
              <a
                href={forgotHref}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </a>
            )}
          </div>
          <Input
            id={passwordId}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
      </FieldGroup>
      <FormActions className="sm:justify-stretch">
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </FormActions>
      {socialButtons && (
        <>
          <Separator className="my-1" />
          <div className="flex flex-col gap-2">{socialButtons}</div>
        </>
      )}
    </Form>
  );
}

interface SignupFormProps {
  onSubmit?: (values: { name: string; email: string; password: string }) => void;
  loading?: boolean;
  error?: string;
  /** Show the live password-strength meter. Defaults to `true`. */
  showStrength?: boolean;
  className?: string;
}

/** Name + email + password registration form with a live strength meter. */
function SignupForm({ onSubmit, loading, error, showStrength = true, className }: SignupFormProps) {
  const [password, setPassword] = React.useState("");
  const uid = React.useId();
  const nameId = `${uid}-name`;
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  return (
    <Form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const get = readValues(e.currentTarget);
        onSubmit?.({ name: get("name"), email: get("email"), password: get("password") });
      }}
    >
      <FormError error={error} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={nameId}>Name</FieldLabel>
          <Input id={nameId} name="name" autoComplete="name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor={emailId}>Email</FieldLabel>
          <Input id={emailId} name="email" type="email" autoComplete="email" required />
        </Field>
        <Field>
          <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
          <Input
            id={passwordId}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {showStrength && password.length > 0 && (
            <PasswordStrengthMeter value={password} className="mt-1" />
          )}
        </Field>
      </FieldGroup>
      <FormActions className="sm:justify-stretch">
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </FormActions>
    </Form>
  );
}

interface ForgotPasswordFormProps {
  onSubmit?: (values: { email: string }) => void;
  loading?: boolean;
  error?: string;
  className?: string;
}

/** Single-field "send reset link" form. */
function ForgotPasswordForm({ onSubmit, loading, error, className }: ForgotPasswordFormProps) {
  const emailId = `${React.useId()}-email`;
  return (
    <Form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.({ email: readValues(e.currentTarget)("email") });
      }}
    >
      <FormError error={error} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={emailId}>Email</FieldLabel>
          <Input id={emailId} name="email" type="email" autoComplete="email" required />
        </Field>
      </FieldGroup>
      <FormActions className="sm:justify-stretch">
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </FormActions>
    </Form>
  );
}

interface OtpFormProps {
  onSubmit?: (code: string) => void;
  length?: number;
  loading?: boolean;
  error?: string;
  /** Resend handler; renders a "Resend code" button when provided. */
  onResend?: () => void;
  className?: string;
}

/** One-time-code (MFA / magic-link) verification form. */
function OtpForm({ onSubmit, length = 6, loading, error, onResend, className }: OtpFormProps) {
  const [code, setCode] = React.useState("");
  return (
    <Form
      className={cn("items-center", className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(code);
      }}
    >
      <FormError error={error} />
      <OTPInput
        value={code}
        onChange={setCode}
        length={length}
        autoFocus
        onComplete={(value) => onSubmit?.(value)}
        aria-label="Verification code"
      />
      <Button type="submit" className="w-full" disabled={loading || code.length < length}>
        {loading ? "Verifying…" : "Verify"}
      </Button>
      {onResend && (
        <Button type="button" variant="ghost" size="sm" onClick={onResend}>
          Resend code
        </Button>
      )}
    </Form>
  );
}

export type {
  AuthShellProps,
  ForgotPasswordFormProps,
  LoginFormProps,
  OtpFormProps,
  SignupFormProps,
};
export { AuthShell, ForgotPasswordForm, LoginForm, OtpForm, SignupForm };
