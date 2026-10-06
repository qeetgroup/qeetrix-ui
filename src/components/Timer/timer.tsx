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

/**
 * Where a timer is in its life. `completed` is a countdown that has reached zero; a stopwatch
 * never completes.
 */
type TimerStatus = "idle" | "running" | "paused" | "completed";

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

/* ── Measured, not counted ─────────────────────────────────────────────────────────────────
 * The timer used to add one per `setInterval(…, 1000)` callback. Intervals are not a clock:
 * each one runs late by however long the main thread was busy, and a background tab is throttled
 * to one callback a minute or worse — so a 30-second TOTP countdown left in a background tab
 * could still read 00:24 when the code had long expired.
 *
 * So the elapsed time is *measured*: the milliseconds banked by earlier runs plus `Date.now()`
 * minus the current run's start. Ticks only decide when to re-read it, and each is scheduled for
 * the next whole-second boundary, so the display turns over on the second rather than up to a
 * second late. A throttled tab simply re-reads the right value when it next runs.
 */

function useTimer({
  mode = "stopwatch",
  initialSeconds = 0,
  autoStart = false,
  onComplete,
}: UseTimerOptions = {}) {
  const countdownMs = Math.max(0, initialSeconds) * 1000;
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [isRunning, setIsRunning] = React.useState(false);

  /** Milliseconds banked by runs that have since been paused. */
  const bankedRef = React.useRef(0);
  /** `Date.now()` when the current run began, or `null` while stopped. */
  const startedAtRef = React.useRef<number | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Stable ref for the completion callback — avoids stale closures. */
  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTick = React.useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const measure = React.useCallback(
    () =>
      bankedRef.current + (startedAtRef.current === null ? 0 : Date.now() - startedAtRef.current),
    [],
  );

  const tick = React.useCallback(() => {
    const now = measure();
    if (mode === "countdown" && now >= countdownMs) {
      // Completion is detected here, outside any state updater, so the callback fires once.
      bankedRef.current = countdownMs;
      startedAtRef.current = null;
      timeoutRef.current = null;
      setElapsedMs(countdownMs);
      setIsRunning(false);
      onCompleteRef.current?.();
      return;
    }
    setElapsedMs(now);
    timeoutRef.current = setTimeout(tick, 1000 - (now % 1000));
  }, [countdownMs, measure, mode]);

  const start = React.useCallback(() => {
    if (startedAtRef.current !== null) return;
    // A finished (or zero-length) countdown has nothing left to run.
    if (mode === "countdown" && bankedRef.current >= countdownMs) return;
    startedAtRef.current = Date.now();
    setIsRunning(true);
    clearTick();
    timeoutRef.current = setTimeout(tick, 1000 - (bankedRef.current % 1000));
  }, [clearTick, countdownMs, mode, tick]);

  const pause = React.useCallback(() => {
    if (startedAtRef.current === null) return;
    clearTick();
    bankedRef.current = measure();
    startedAtRef.current = null;
    setElapsedMs(bankedRef.current);
    setIsRunning(false);
  }, [clearTick, measure]);

  const reset = React.useCallback(() => {
    clearTick();
    bankedRef.current = 0;
    startedAtRef.current = null;
    setElapsedMs(0);
    setIsRunning(false);
  }, [clearTick]);

  const toggle = React.useCallback(() => {
    if (startedAtRef.current !== null) pause();
    else start();
  }, [pause, start]);

  // Auto-start once on mount; stop ticking on unmount. The cleanup also banks the running span
  // and clears `startedAtRef`: React StrictMode runs this effect, its cleanup and the effect
  // again, and a cleanup that left the timer marked as started made the second `start()` a
  // no-op — so an `autoStart` timer never ticked in development.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional run-once on mount
  React.useEffect(() => {
    if (autoStart) start();
    return () => {
      clearTick();
      if (startedAtRef.current !== null) {
        bankedRef.current = measure();
        startedAtRef.current = null;
      }
    };
  }, []);

  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const elapsed =
    mode === "stopwatch" ? elapsedSeconds : Math.min(elapsedSeconds, Math.max(0, initialSeconds));
  // Ceiling, so a countdown shows 00:01 for its whole last second and reaches 00:00 exactly when
  // it completes — not a second early.
  const remaining =
    mode === "countdown" ? Math.max(0, Math.ceil((countdownMs - elapsedMs) / 1000)) : 0;
  const isComplete = mode === "countdown" && countdownMs > 0 && elapsedMs >= countdownMs;
  const status: TimerStatus = isRunning
    ? "running"
    : isComplete
      ? "completed"
      : elapsedMs > 0
        ? "paused"
        : "idle";

  return { elapsed, remaining, isRunning, status, start, pause, reset, toggle };
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

/**
 * A countdown or stopwatch readout with optional Start/Pause/Resume and Reset controls.
 *
 * `role="timer"` is not a live region — a screen reader must not hear every second. What *is*
 * announced, through a separate polite status, is each change the user would otherwise miss:
 * the controls starting or pausing it, and a countdown running out. `data-state` exposes the
 * status (`idle` · `running` · `paused` · `completed`) for styling; visually a running timer
 * carries a Qeet dot and a paused or finished one dims.
 *
 * Elapsed time is measured from the clock rather than counted in ticks, so a timer in a
 * background tab is still right when the tab comes back.
 */
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
  const { elapsed, remaining, status, toggle, reset } = useTimer({
    mode,
    initialSeconds,
    autoStart,
    onComplete,
  });

  const displaySeconds = mode === "countdown" ? remaining : elapsed;
  const formattedTime = formatTime(displaySeconds, format);
  const exhausted = mode === "countdown" && remaining === 0;

  // Announce a change of status, not the time. Start/pause are announced only when the controls
  // caused them — an auto-started timer must not speak on page load — while running out always is.
  const [announcement, setAnnouncement] = React.useState("");
  const announceNextRef = React.useRef(false);
  const previousStatusRef = React.useRef(status);
  React.useEffect(() => {
    if (previousStatusRef.current === status) return;
    previousStatusRef.current = status;
    const fromControls = announceNextRef.current;
    announceNextRef.current = false;
    if (status === "completed") setAnnouncement(messages.completed);
    else if (fromControls && status === "running") setAnnouncement(messages.running);
    else if (fromControls && status === "paused") setAnnouncement(messages.paused(formattedTime));
    else setAnnouncement("");
  }, [status, messages, formattedTime]);

  const toggleLabel =
    status === "running" ? messages.pause : status === "paused" ? messages.resume : messages.start;

  return (
    <div
      data-slot="timer"
      data-state={status}
      role="timer"
      aria-label={ariaLabel ?? (mode === "countdown" ? messages.countdown : messages.stopwatch)}
      aria-live="off"
      className={cn(timerVariants(), className)}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          data-slot="timer-indicator"
          className={cn(
            "size-2 shrink-0 rounded-full bg-primary transition-opacity duration-normal ease-standard",
            status === "running" ? "opacity-100" : "opacity-0",
          )}
        />
        <span
          data-slot="timer-display"
          className={cn(
            "font-mono text-3xl font-semibold tracking-tight tabular-nums transition-colors duration-normal ease-standard",
            status === "paused" || status === "completed"
              ? "text-muted-foreground"
              : "text-foreground",
          )}
        >
          {formattedTime}
        </span>
        {/* Balances the indicator so the digits stay centred. */}
        <span aria-hidden className="size-2 shrink-0" />
      </div>
      <span role="status" data-slot="timer-status" className="sr-only">
        {announcement}
      </span>
      {showControls && (
        <div data-slot="timer-controls" className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              announceNextRef.current = true;
              toggle();
            }}
            // A spent countdown has nothing to start: Reset is the way on. Kept focusable so focus
            // is not dropped to the document when a countdown runs out under it.
            disabled={exhausted}
            focusableWhenDisabled
            // Focusable-when-disabled sets `aria-disabled`, not `:disabled`, so the dimming is
            // restated for that attribute.
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-disabled"
          >
            {toggleLabel}
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>
            {messages.reset}
          </Button>
        </div>
      )}
    </div>
  );
}

export type { TimerProps, TimerStatus, UseTimerOptions };
export { formatTime, Timer, timerVariants, useTimer };
