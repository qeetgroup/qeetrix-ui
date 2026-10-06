import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PresenceIndicator } from "@/components/PresenceIndicator/presence-indicator";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

const STATUSES = ["online", "away", "busy", "offline"] as const;

describe("PresenceIndicator", () => {
  it("exposes the status as an accessible label", () => {
    render(<PresenceIndicator status="online" />);
    expect(screen.getByRole("img", { name: "online" })).toBeInTheDocument();
  });

  it("accepts a custom label", () => {
    render(<PresenceIndicator status="busy" label="In a meeting" />);
    expect(screen.getByRole("img", { name: "In a meeting" })).toBeInTheDocument();
  });

  it("gives every state its own shape, so presence never rests on colour alone", () => {
    render(STATUSES.map((s) => <PresenceIndicator key={s} status={s} />));
    const mark = (s: string) => screen.getByRole("img", { name: s });
    // online: a plain filled disc.
    expect(mark("online")).toHaveClass("bg-success", "after:hidden");
    // away: a crescent — a bite painted in the surface colour.
    expect(mark("away")).toHaveClass("after:bg-(--presence-surface)", "after:size-[72%]");
    // busy: a do-not-disturb bar.
    expect(mark("busy")).toHaveClass("after:bg-destructive-foreground", "after:h-[24%]");
    // offline: a hollow ring at full contrast (the old 40% dot was 1.8:1).
    expect(mark("offline")).toHaveClass("border-muted-foreground", "after:hidden");
    expect(mark("offline").className).not.toContain("bg-muted-foreground/40");
    for (const s of STATUSES) expect(mark(s)).toHaveAttribute("data-status", s);
  });

  it("draws the shapes in system colours under forced colors", () => {
    render(<PresenceIndicator status="away" />);
    expect(screen.getByRole("img")).toHaveClass(
      "forced-color-adjust-none",
      "forced-colors:bg-[CanvasText]",
      "forced-colors:after:bg-[Canvas]",
    );
  });

  it("lets the surface colour be overridden for the ring and the cut-outs", () => {
    render(<PresenceIndicator status="away" className="[--presence-surface:var(--card)]" />);
    const mark = screen.getByRole("img");
    expect(mark).toHaveClass("[--presence-surface:var(--card)]");
    expect(mark).not.toHaveClass("[--presence-surface:var(--background)]");
  });

  it("only pulses with motion allowed", () => {
    render(<PresenceIndicator status="online" pulse />);
    expect(screen.getByRole("img")).toHaveClass("animate-pulse", "motion-reduce:animate-none");
  });

  it("has no axe violations", async () => {
    const { container } = render(STATUSES.map((s) => <PresenceIndicator key={s} status={s} />));
    expect(await a11y(container)).toHaveNoViolations();
  });
});
