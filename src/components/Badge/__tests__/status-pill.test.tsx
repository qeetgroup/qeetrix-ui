import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { resolveStatusKind, StatusPill } from "@/components/Badge/status-pill";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("StatusPill", () => {
  it("resolves a known status to its label", () => {
    render(<StatusPill status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("title-cases an unknown status", () => {
    render(<StatusPill status="throttled" />);
    expect(screen.getByText("Throttled")).toBeInTheDocument();
  });

  it("turns snake_case and kebab-case statuses into words", () => {
    render(
      <>
        <StatusPill status="in_progress" />
        <StatusPill status="past-due" />
      </>,
    );
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Past due")).toBeInTheDocument();
  });

  it("renders the info kind as the quiet info badge, not the solid Qeet fill", () => {
    render(<StatusPill kind="info">Syncing</StatusPill>);
    const pill = screen.getByText("Syncing");
    expect(pill).toHaveAttribute("data-slot", "status-pill");
    expect(pill).toHaveAttribute("data-kind", "info");
    expect(pill).toHaveClass("bg-info-subtle", "text-info-text");
    expect(pill).not.toHaveClass("bg-(--qx-component-badge-default-background)");
  });

  it.each([
    ["syncing", "info"],
    ["compromised", "danger"],
    ["locked", "danger"],
    ["trusted", "success"],
    ["untrusted", "warning"],
    ["archived", "muted"],
    ["mystery", "neutral"],
  ] as const)("maps %s to the %s kind", (status, kind) => {
    expect(resolveStatusKind(status)).toBe(kind);
    expect(resolveStatusKind(status.toUpperCase())).toBe(kind);
  });

  it("lets an explicit kind win over the known mapping", () => {
    expect(resolveStatusKind("active", "warning")).toBe("warning");
  });

  it("keeps the dot decorative and forwards attributes", () => {
    const { container } = render(<StatusPill id="s1" title="Since Monday" status="expired" />);
    const pill = screen.getByText("Expired");
    expect(pill).toHaveAttribute("id", "s1");
    expect(pill).toHaveAttribute("title", "Since Monday");
    expect(container.querySelector('[data-slot="status-pill-dot"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(
      ["active", "syncing", "pending", "expired", "draft", "unknown"].map((s) => (
        <StatusPill key={s} status={s} />
      )),
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
