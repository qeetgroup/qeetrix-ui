import {
  Button,
  formatTime,
  type StatusKind,
  StatusPill,
  Timer,
  type TimerStatus,
  toast,
  useTimer,
} from "@qeetrix/ui";
import { useEffect, useState } from "react";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select } from "../registry/types";

/** The inline "Resend in 00:29" readout: `useTimer` + `formatTime`, no Timer chrome. */
function ResendCountdown({ onComplete }: { onComplete: () => void }) {
  const { remaining, start, pause } = useTimer({
    mode: "countdown",
    initialSeconds: 30,
    onComplete,
  });
  // Started here rather than with `autoStart`: under React StrictMode the hook's autoStart is
  // cleaned up and never re-armed (see the playground report), so the countdown would freeze.
  // Pausing on cleanup lets the second StrictMode mount start it again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: start once on mount
  useEffect(() => {
    start();
    return pause;
  }, []);
  return (
    <span
      role="timer"
      aria-label="Time until you can resend the code"
      className="font-mono font-medium text-foreground tabular-nums"
    >
      {formatTime(remaining, "mm:ss")}
    </span>
  );
}

/** "Resend OTP" is locked until the countdown completes; resending restarts it. */
function OtpResendDemo() {
  const [round, setRound] = useState(1);
  const [canResend, setCanResend] = useState(false);
  return (
    <div className="flex w-72 flex-col gap-3 rounded-lg border bg-card p-4 text-sm">
      <div>
        <div className="font-medium">Enter the code we sent</div>
        <div className="text-muted-foreground">SMS to +91 98•• ••4210 · attempt {round} of 3</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        {canResend ? (
          <span className="text-muted-foreground">Didn’t get it?</span>
        ) : (
          <span className="text-muted-foreground">
            Resend in <ResendCountdown key={round} onComplete={() => setCanResend(true)} />
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={!canResend || round >= 3}
          onClick={() => {
            setRound((r) => r + 1);
            setCanResend(false);
            toast.success("New code sent to +91 98•• ••4210");
          }}
        >
          Resend OTP
        </Button>
      </div>
    </div>
  );
}

const statusPill: Record<TimerStatus, { kind: StatusKind; label: string }> = {
  idle: { kind: "neutral", label: "Idle" },
  running: { kind: "info", label: "Running" },
  paused: { kind: "warning", label: "Paused" },
  completed: { kind: "success", label: "Completed" },
};

/** A TOTP-style 30 s window driven by `useTimer`, so its `status` can be shown and acted on. */
function TotpWindowDemo() {
  const { remaining, status, toggle, reset } = useTimer({
    mode: "countdown",
    initialSeconds: 30,
  });
  return (
    <div className="flex w-64 flex-col gap-3 rounded-lg border bg-card p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">TOTP window</span>
        <StatusPill kind={statusPill[status].kind}>{statusPill[status].label}</StatusPill>
      </div>
      <span role="timer" aria-label="TOTP window" className="font-mono text-2xl tabular-nums">
        {formatTime(remaining, "mm:ss")}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={toggle} disabled={status === "completed"}>
          {status === "running" ? "Pause" : status === "paused" ? "Resume" : "Start"}
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}

const timerControls = {
  mode: select(["stopwatch", "countdown"] as const, "countdown"),
  initialSeconds: num(300, { min: 0, max: 7200, step: 30, label: "Initial seconds (countdown)" }),
  format: select(["mm:ss", "hh:mm:ss"] as const, "mm:ss"),
  showControls: bool(true, "Show controls"),
  autoStart: bool(false, "Auto start"),
};

export const examples: FamilyExamples = {
  timer: {
    minHeight: 640,
    demos: [
      {
        name: "OTP resend countdown",
        description:
          "`useTimer` + `formatTime` for an inline readout; `onComplete` unlocks the resend button.",
        render: () => <OtpResendDemo />,
      },
      {
        name: "States",
        description:
          "Start runs it (Qeet dot), Pause dims it and offers Resume; the 3 s countdown completes and dims.",
        render: () => (
          <div className="flex flex-wrap items-start gap-6">
            <figure className="flex flex-col items-center gap-1">
              <Timer aria-label="Incident bridge duration" />
              <figcaption className="text-caption text-muted-foreground">stopwatch</figcaption>
            </figure>
            <figure className="flex flex-col items-center gap-1">
              <Timer mode="countdown" initialSeconds={3} aria-label="Three-second countdown" />
              <figcaption className="text-caption text-muted-foreground">3 s countdown</figcaption>
            </figure>
          </div>
        ),
      },
      {
        name: "useTimer status",
        description:
          "The hook exposes `status` (idle · running · paused · completed) for your own UI.",
        render: () => <TotpWindowDemo />,
      },
      {
        name: "Session timeout",
        render: () => (
          <div className="flex flex-col items-center gap-1">
            <span className="text-caption text-muted-foreground">Admin session expires in</span>
            <Timer
              mode="countdown"
              initialSeconds={300}
              aria-label="Admin session expires in"
              onComplete={() => toast.warning("Session expired — sign in again with your passkey")}
            />
          </div>
        ),
      },
      {
        name: "Hours format",
        render: () => (
          <div className="flex flex-col items-center gap-1">
            <span className="text-caption text-muted-foreground">
              ap-south-1 maintenance window
            </span>
            <Timer
              mode="countdown"
              initialSeconds={2 * 3600}
              format="hh:mm:ss"
              aria-label="Maintenance window remaining"
            />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: timerControls,
      render: (v) => (
        <Timer
          key={JSON.stringify(v)}
          mode={v.mode}
          initialSeconds={v.initialSeconds}
          format={v.format}
          showControls={v.showControls}
          autoStart={v.autoStart}
          onComplete={() => toast.info("Countdown complete")}
        />
      ),
      code: (v) =>
        jsx("Timer", {
          mode: v.mode === "stopwatch" ? undefined : v.mode,
          initialSeconds: v.mode === "countdown" && v.initialSeconds ? v.initialSeconds : undefined,
          format: v.format === "mm:ss" ? undefined : v.format,
          showControls: v.showControls ? undefined : expr("false"),
          autoStart: v.autoStart,
          onComplete:
            v.mode === "countdown" ? expr('() => toast.info("Countdown complete")') : undefined,
        }),
    }),
  },
};
