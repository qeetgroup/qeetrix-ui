import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Stat } from "@/components/Stat/stat";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Stat", () => {
  it("renders label, value and delta", () => {
    render(<Stat label="MRR" value="$12,400" delta="+8%" trend="up" hint="vs last month" />);
    expect(screen.getByText("MRR")).toBeInTheDocument();
    expect(screen.getByText("$12,400")).toBeInTheDocument();
    expect(screen.getByText("+8%")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Stat label="MRR" value="$12,400" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Stat semantics and tone", () => {
  it("is a group named by its label", () => {
    render(<Stat label="Monthly recurring revenue" value="₹48.2L" />);
    expect(screen.getByRole("group", { name: "Monthly recurring revenue" })).toBeInTheDocument();
  });

  it("colours the delta by trend, through the status text roles", () => {
    render(<Stat label="MRR" value="1" delta="+8%" trend="up" />);
    const delta = screen.getByText("+8%");
    expect(delta).toHaveClass("text-success-text");
    expect(delta.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("lets tone override the colour when up is bad news", () => {
    render(<Stat label="Error rate" value="0.4%" delta="+0.1 pp" trend="up" tone="negative" />);
    const delta = screen.getByText("+0.1 pp");
    expect(delta).toHaveClass("text-destructive-text");
    expect(delta).not.toHaveClass("text-success-text");
    expect(delta).toHaveAttribute("data-tone", "negative");
    expect(delta).toHaveAttribute("data-trend", "up");
  });

  it("draws a level glyph only for an explicit neutral trend", () => {
    const { unmount } = render(<Stat label="A" value="1" delta="0%" trend="neutral" />);
    expect(screen.getByText("0%").querySelector("svg")).not.toBeNull();
    unmount();
    // Without a trend the delta is a note, and a dash in front of it would read as a minus.
    render(<Stat label="B" value="1" delta="12 new" />);
    expect(screen.getByText("12 new").querySelector("svg")).toBeNull();
  });

  it("holds its place and name while loading", () => {
    render(<Stat label="Settlements" value="₹3.1L" delta="+2%" trend="up" loading />);
    const tile = screen.getByRole("group", { name: "Settlements" });
    expect(tile).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("₹3.1L")).not.toBeInTheDocument();
    expect(screen.queryByText("+2%")).not.toBeInTheDocument();
  });

  it("renders children as a footer", () => {
    render(
      <Stat label="MRR" value="1">
        <a href="/billing">View billing</a>
      </Stat>,
    );
    expect(
      screen.getByRole("link", { name: "View billing" }).closest("[data-slot]"),
    ).toHaveAttribute("data-slot", "stat-footer");
  });

  it("has no axe violations with every slot filled", async () => {
    const { container } = render(
      <Stat label="MRR" value="$12,400" delta="+8%" trend="up" tone="positive" hint="vs last month">
        <span>footer</span>
      </Stat>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
