import { ArrowLeftIcon, FingerprintPatternIcon, MailIcon, ShieldCheckIcon } from "@qeetrix/icons";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSeparator,
  formatTime,
  Input,
  Label,
  Link,
  OTPInput,
  PasswordInput,
  QeetLogo,
  useTimer,
} from "@qeetrix/ui";
import { useEffect, useState } from "react";

const noNavigation = (event: { preventDefault: () => void }) => event.preventDefault();

/**
 * "Resend in 00:45". Started from an effect rather than `<Timer autoStart>`: under React
 * StrictMode (the playground runs in it) Timer's autoStart is cleaned up on the first mount and
 * never re-armed, so the countdown would sit at 00:45 — see the bug list in the report.
 */
function ResendCountdown() {
  const { remaining, start, pause } = useTimer({ mode: "countdown", initialSeconds: 45 });
  // biome-ignore lint/correctness/useExhaustiveDependencies: start once on mount.
  useEffect(() => {
    start();
    return pause;
  }, []);
  return (
    <span
      role="timer"
      aria-label="Resend available in"
      className="font-mono font-medium tabular-nums"
    >
      {formatTime(remaining, "mm:ss")}
    </span>
  );
}

/**
 * The Qeet ID hosted sign-in flow for a tenant: passkey first, email + password as the
 * fallback, then a one-time code. Three steps, side by side, so every state is reviewable.
 */
export function SignInPattern() {
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [code, setCode] = useState("4821");
  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="flex items-center gap-2.5">
          <QeetLogo className="size-7 rounded-md" aria-hidden />
          <span className="font-heading text-sm font-semibold">Acme India</span>
        </span>
        <span className="text-caption text-muted-foreground">Secured by Qeet ID</span>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-6">
        <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
          <Card className="shadow-rest">
            <CardHeader>
              <CardTitle className="text-heading font-semibold">Sign in to Acme India</CardTitle>
              <CardDescription>Use the passkey on this device, or your work email.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <Button
                size="lg"
                className="w-full"
                loading={passkeyBusy}
                loadingLabel="Waiting for your passkey…"
                onClick={() => {
                  setPasskeyBusy(true);
                  window.setTimeout(() => setPasskeyBusy(false), 1800);
                }}
              >
                <FingerprintPatternIcon data-icon="inline-start" aria-hidden />
                Sign in with a passkey
              </Button>
              <FieldSeparator>or continue with email</FieldSeparator>
              <form className="flex flex-col gap-4" onSubmit={noNavigation} noValidate>
                <Field>
                  <FieldLabel>Work email</FieldLabel>
                  <FieldControl
                    render={
                      <Input
                        type="email"
                        autoComplete="username webauthn"
                        defaultValue="rohan.mehta@acme.in"
                      />
                    }
                  />
                </Field>
                <Field invalid>
                  <div className="flex items-baseline justify-between gap-2">
                    <FieldLabel>Password</FieldLabel>
                    <Link href="#reset" onClick={noNavigation} size="sm">
                      Forgot password?
                    </Link>
                  </div>
                  <FieldControl
                    render={
                      <PasswordInput
                        autoComplete="current-password"
                        defaultValue="hunter2024"
                        aria-invalid
                      />
                    }
                  />
                  <FieldError>
                    That password doesn’t match. 4 attempts left before a 15-minute lock.
                  </FieldError>
                </Field>
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" defaultChecked />
                  <Label htmlFor="remember" className="font-normal">
                    Keep me signed in on this device for 7 days
                  </Label>
                </div>
                <Button type="submit" variant="secondary" className="w-full">
                  <MailIcon data-icon="inline-start" aria-hidden />
                  Continue with email
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-center text-xs text-muted-foreground">
              New to Acme India?&nbsp;
              <Link href="#request" onClick={noNavigation} size="sm">
                Request access
              </Link>
            </CardFooter>
          </Card>

          <Card className="self-start shadow-rest">
            <CardHeader>
              <Button variant="ghost" size="sm" className="-ms-2 w-fit">
                <ArrowLeftIcon data-icon="inline-start" aria-hidden className="rtl:rotate-180" />
                Back
              </Button>
              <CardTitle className="text-heading font-semibold">Check your phone</CardTitle>
              <CardDescription>
                We sent a 6-digit code to +91 ••••• ••482 by SMS. It expires in 10 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <Field>
                <FieldLabel>Verification code</FieldLabel>
                <OTPInput value={code} onChange={setCode} autoFocus={false} />
                <FieldDescription>Paste the whole code into any box.</FieldDescription>
              </Field>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Didn’t get it? Resend in</span>
                <ResendCountdown />
              </div>
              <Button className="w-full" disabled={code.length < 6}>
                Verify and sign in
              </Button>
              <Alert variant="info">
                <ShieldCheckIcon aria-hidden />
                <AlertDescription>
                  Admins at Acme India must add a passkey after this sign-in. It takes about 20
                  seconds.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="flex flex-wrap items-center justify-center gap-4 px-6 py-5 text-caption text-muted-foreground">
        <Link href="#privacy" onClick={noNavigation} variant="muted" size="sm">
          Privacy
        </Link>
        <Link href="#terms" onClick={noNavigation} variant="muted" size="sm">
          Terms
        </Link>
        <span>© 2026 Qeet Group · Data stored in India (ap-south-1)</span>
      </footer>
    </div>
  );
}
