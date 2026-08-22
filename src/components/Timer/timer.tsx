"use client";

import { cva } from "class-variance-authority";
import * as React from "react";

import { Button } from "@/components/Button/button";
import type { MessagesFor } from "@/lib/messages";
import { timerMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

// ---------------------------------------------------------------------------
// Hook types
// ---------------------------------------------------------------------------

interface UseTimerOptions {
  mode?: "countdown" | "stopwatch";
  /** Countdown: start value in seconds (e.g. 30 for TOTP). Ignored for stopwatch. */
  initialSeconds?: number;
  autoStart?: boolean;
  /** Fired once when a countdown reaches 0. */
  onComplete?: () => void;
}

// ---------------------------------------------------------------------------
// formatTime helper
// ---------------------------------------------------------------------------

/**
 * Formats a non-negative integer number of seconds into a human-readable string.
 *
 * - `"mm:ss"` — folds hours into minutes, e.g. 90 → "01:30", 3600 → "60:00"
 * - `"hh:mm:ss"` — always shows hours, e.g. 3661 → "01:01:01"
 */
function formatTime(seconds: number, format: "mm:ss" | "hh:mm:ss"): string {
  const total = Math.max(0, Math.floor(seconds));

  if (format === "hh:mm:ss") {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // mm:ss — fold hours into minutes
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// useTimer hook
// ---------------------------------------------------------------------------

function useTimer({
  mode = "stopwatch",
  initialSeconds = 0,
  autoStart = false,
  onComplete,
}: UseTimerOptions = {}) {
  const [seconds, setSeconds] = React.useState(mode === "countdown" ? initialSeconds : 0);
  const [isRunning, setIsRunning] = React.useState(false);

  /** Interval handle lives in a ref — mutations never trigger re-renders. */
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  /** Stable ref for the completion callback — avoids stale closures. */
  const onCompleteRef = React.useRef(onComplete);
  /**
   * Prevents firing onComplete on mount when mode === "countdown"
   * and initialSeconds === 0 (i.e. the timer has not yet ticked once).
   */
  const hasTickedRef = React.useRef(false);

  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimer = React.useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = React.useCallback(() => {
    if (intervalRef.current !== null) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      hasTickedRef.current = true;
      setSeconds((s) => {
        if (mode === "countdown") return Math.max(0, s - 1);
        return s + 1;
      });
    }, 1000);
  }, [mode]);

  const pause = React.useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  const reset = React.useCallback(() => {
    clearTimer();
    hasTickedRef.current = false;
    setIsRunning(false);
    setSeconds(mode === "countdown" ? initialSeconds : 0);
  }, [clearTimer, initialSeconds, mode]);

  const toggle = React.useCallback(() => {
    if (isRunning) pause();
    else start();
  }, [isRunning, pause, start]);

  // Detect countdown completion as a side effect outside the state updater,
  // so it is never invoked inside a pure React state updater function.
  React.useEffect(() => {
    if (mode === "countdown" && isRunning && seconds === 0 && hasTickedRef.current) {
      clearTimer();
      setIsRunning(false);
      onCompleteRef.current?.();
    }
  }, [clearTimer, isRunning, mode, seconds]);

  // Auto-start once on mount.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional run-once on mount
  React.useEffect(() => {
    if (autoStart) start();
    return clearTimer;
  }, []);

  const elapsed = mode === "stopwatch" ? seconds : initialSeconds - seconds;
  const remaining = mode === "countdown" ? seconds : 0;

  return { elapsed, remaining, isRunning, start, pause, reset, toggle };
}

// ---------------------------------------------------------------------------
// Timer component
// ---------------------------------------------------------------------------

const timerVariants = cva("flex flex-col items-center gap-3");

interface TimerProps {
  mode?: "countdown" | "stopwatch";
  /** For countdown mode: the value (in seconds) to count down from (e.g. 30 for TOTP). */
  initialSeconds?: number;
  autoStart?: boolean;
  /** Display format. Defaults to "mm:ss". */
  format?: "mm:ss" | "hh:mm:ss";
  /** Called when a countdown reaches zero. */
  onComplete?: () => void;
  /** Show Start/Pause and Reset controls. Defaults to true. */
  showControls?: boolean;
  "aria-label"?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"timer">;
  className?: string;
}

function Timer({
  mode = "stopwatch",
  initialSeconds = 0,
  autoStart = false,
  format = "mm:ss",
  onComplete,
  showControls = true,
  "aria-label": ariaLabel,
  messages: messageOverrides,
  className,
}: TimerProps) {
  const messages = useMessages("timer", timerMessages, messageOverrides);
  const { elapsed, remaining, isRunning, toggle, reset } = useTimer({
    mode,
    initialSeconds,
    autoStart,
    onComplete,
  });

  const displaySeconds = mode === "countdown" ? remaining : elapsed;
  const formattedTime = formatTime(displaySeconds, format);

  return (
    <div
      data-slot="timer"
      role="timer"
      aria-label={ariaLabel ?? (mode === "countdown" ? messages.countdown : messages.stopwatch)}
      aria-live="off"
      className={cn(timerVariants(), className)}
    >
      <span
        data-slot="timer-display"
        className="font-mono tabular-nums text-3xl font-semibold tracking-tight"
      >
        {formattedTime}
      </span>
      {showControls && (
        <div data-slot="timer-controls" className="flex gap-2">
          <Button size="sm" variant="outline" onClick={toggle}>
            {isRunning ? messages.pause : messages.start}
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>
            {messages.reset}
          </Button>
        </div>
      )}
    </div>
  );
}

export type { TimerProps, UseTimerOptions };
export { formatTime, Timer, timerVariants, useTimer };
