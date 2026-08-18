import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { formatTime, Timer } from "@/components/ui/timer";

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
