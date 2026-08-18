import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { AuditEvent, AuditLog } from "@/components/ui/audit-event";

const a11y = (container: Element) =>
  axe(container, { rules: { "color-contrast": { enabled: false } } });

describe("AuditEvent", () => {
  it("exposes actor, action, resource, time, severity, and detail slots", () => {
    render(
      <AuditLog aria-label="Tenant audit history">
        <AuditEvent
          eventId="evt_01"
          actor="Ada Lovelace"
          action="changed role for"
          resource="Grace Hopper"
          timestamp="2026-08-18T12:00:00.000Z"
          severity="warning"
          metadata={<div>IP 203.0.113.7</div>}
          diff={<div>Member to Admin</div>}
        />
      </AuditLog>,
    );

    expect(
      screen.getByRole("group", { name: "Ada Lovelace changed role for Grace Hopper" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getByText("evt_01")).toBeInTheDocument();
    expect(screen.getByText("IP 203.0.113.7")).toBeInTheDocument();
    expect(screen.getByText("Member to Admin")).toBeInTheDocument();
    expect(screen.getByText(/Aug 18, 2026/).closest("time")).toHaveAttribute(
      "datetime",
      "2026-08-18T12:00:00.000Z",
    );
  });

  it("inherits APG feed navigation across audit events", () => {
    render(
      <AuditLog aria-label="Audit history">
        <AuditEvent eventId="1" actor="Ada" action="signed in" timestamp="2026-08-18" />
        <AuditEvent eventId="2" actor="Grace" action="signed out" timestamp="2026-08-19" />
      </AuditLog>,
    );
    const articles = screen.getAllByRole("article");

    articles[0].focus();
    fireEvent.keyDown(articles[0], { key: "PageDown" });
    expect(articles[1]).toHaveFocus();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AuditLog aria-label="Audit history">
        <AuditEvent eventId="1" actor="Ada" action="signed in" timestamp="2026-08-18" />
      </AuditLog>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});