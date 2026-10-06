import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { formatTime, Timer, useTimer } from "@/components/Timer/timer";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Timer", () => {
  it('renders with role="timer"', () => {
    render(<Timer />);
    expect(screen.getByRole("timer")).toBeInTheDocument();
  });

  describe("formatTime utility", () => {
    it('formats 90s as "01:30" in mm:ss', () => {
      expect(formatTime(90, "mm:ss")).toBe("01:30");
    });

    it('formats 3661s as "01:01:01" in hh:mm:ss', () => {
      expect(formatTime(3661, "hh:mm:ss")).toBe("01:01:01");
    });
  });

  it("Start button changes label to Pause when clicked", () => {
    render(<Timer />);
    const startBtn = screen.getByRole("button", { name: "Start" });
    fireEvent.click(startBtn);
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Timer aria-label="Test timer" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/*
 * Fake timers *and* a fake clock: the timer measures elapsed time from `Date.now()`, so a test
 * that only advanced timers would not exercise it. The start instant is fixed, so nothing here
 * depends on when the suite runs.
 */
describe("Timer states and announcements", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 0, 1, 9, 0, 0) }));
  afterEach(() => vi.useRealTimers());

  const display = () => screen.getByText(/^\d\d:\d\d$/);
  const status = () => document.querySelector("[data-slot=timer-status]");
  const root = () => document.querySelector("[data-slot=timer]");
  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  it("counts down, completes once, dims and says so", () => {
    const onComplete = vi.fn();
    render(<Timer mode="countdown" initialSeconds={3} onComplete={onComplete} />);
    expect(root()).toHaveAttribute("data-state", "idle");
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(root()).toHaveAttribute("data-state", "running");
    expect(status()).toHaveTextContent("Timer running");

    advance(1000);
    expect(display()).toHaveTextContent("00:02");
    advance(2000);
    expect(display()).toHaveTextContent("00:00");
    expect(root()).toHaveAttribute("data-state", "completed");
    expect(status()).toHaveTextContent("Time is up");
    expect(onComplete).toHaveBeenCalledTimes(1);

    // A spent countdown cannot be started again (only reset), and stays focusable.
    const start = screen.getByRole("button", { name: "Start" });
    expect(start).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(start);
    advance(5000);
    expect(onComplete).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(root()).toHaveAttribute("data-state", "idle");
    expect(display()).toHaveTextContent("00:03");
  });

  it("pauses with an announcement, offers Resume, and resumes where it stopped", () => {
    render(<Timer />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    advance(5000);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(root()).toHaveAttribute("data-state", "paused");
    expect(status()).toHaveTextContent("Timer paused at 00:05");
    advance(10_000);
    expect(display()).toHaveTextContent("00:05");

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    advance(2000);
    expect(display()).toHaveTextContent("00:07");
  });

  it("stays right when its ticks are throttled, as in a background tab", () => {
    render(<Timer mode="countdown" initialSeconds={30} autoStart />);
    // The clock moves 20 s while no timer callback runs at all.
    act(() => vi.setSystemTime(Date.now() + 20_000));
    advance(1000);
    expect(display()).toHaveTextContent("00:09");
  });

  it("does not announce an auto-started timer", () => {
    render(<Timer mode="countdown" initialSeconds={30} autoStart />);
    advance(2000);
    expect(root()).toHaveAttribute("data-state", "running");
    expect(status()).toHaveTextContent("");
  });

  it("keeps role=timer out of the live region, so seconds are never read out", () => {
    render(<Timer />);
    expect(screen.getByRole("timer")).toHaveAttribute("aria-live", "off");
    expect(screen.getByRole("status")).toBe(status());
  });

  it("takes overrides for the strings it adds to the timer group", () => {
    render(<Timer messages={{ start: "Starten" }} />);
    expect(screen.getByRole("button", { name: "Starten" })).toBeInTheDocument();
  });
});

describe("useTimer", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 0, 1, 9, 0, 0) }));
  afterEach(() => vi.useRealTimers());

  it("reports elapsed, remaining and status for a countdown", () => {
    const { result } = renderHook(() => useTimer({ mode: "countdown", initialSeconds: 10 }));
    expect(result.current).toMatchObject({ elapsed: 0, remaining: 10, status: "idle" });
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current).toMatchObject({ elapsed: 4, remaining: 6, status: "running" });
    act(() => result.current.pause());
    expect(result.current.status).toBe("paused");
  });

  it("does nothing when started with nothing to count down", () => {
    const { result } = renderHook(() => useTimer({ mode: "countdown", initialSeconds: 0 }));
    act(() => result.current.start());
    expect(result.current.isRunning).toBe(false);
  });
});
