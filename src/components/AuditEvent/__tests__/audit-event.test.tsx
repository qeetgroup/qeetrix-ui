import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { AuditEvent, AuditLog } from "@/components/AuditEvent/audit-event";

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

/*
 * Invalid timestamps (DATE-001). `toISOString()` used to run before the validity check, so a
 * `Date` built from an unparseable value threw a RangeError during render and took the whole
 * surrounding subtree with it. Audit rows come from logs and exports, so one bad field must not
 * be able to blank a page.
 */
describe("AuditEvent invalid timestamps", () => {
  it("does not throw when a Date instance is invalid", () => {
    expect(() =>
      render(
        <AuditEvent eventId="1" actor="Ada" action="signed in" timestamp={new Date(Number.NaN)} />,
      ),
    ).not.toThrow();
  });

  it("does not throw when a Date came from an unparseable string", () => {
    expect(() =>
      render(<AuditEvent eventId="1" actor="Ada" action="signed in" timestamp={new Date("n/a")} />),
    ).not.toThrow();
  });

  it("keeps sibling events rendered when one timestamp is invalid", () => {
    render(
      <AuditLog aria-label="Audit history">
        <AuditEvent eventId="bad" actor="Ada" action="signed in" timestamp={new Date("n/a")} />
        <AuditEvent eventId="good" actor="Grace" action="signed out" timestamp="2026-08-19" />
      </AuditLog>,
    );
    expect(screen.getByText("good")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Grace signed out" })).toBeInTheDocument();
  });

  it("renders an invalid timestamp outside <time> and emits no datetime attribute", () => {
    const { container } = render(
      <AuditEvent eventId="1" actor="Ada" action="signed in" timestamp={new Date("n/a")} />,
    );
    expect(container.querySelector("time")).toBeNull();
    expect(container.querySelector("[datetime]")).toBeNull();
    expect(
      container.querySelector('[data-slot="audit-event-invalid-timestamp"]'),
    ).toHaveTextContent("Invalid Date");
  });

  it("renders an unparseable string verbatim, still outside <time>", () => {
    const { container } = render(
      <AuditEvent eventId="1" actor="Ada" action="signed in" timestamp="last Tuesday" />,
    );
    expect(container.querySelector("time")).toBeNull();
    expect(
      container.querySelector('[data-slot="audit-event-invalid-timestamp"]'),
    ).toHaveTextContent("last Tuesday");
  });

  it("has no axe violations with an invalid timestamp", async () => {
    const { container } = render(
      <AuditLog aria-label="Audit history">
        <AuditEvent eventId="1" actor="Ada" action="signed in" timestamp={new Date("n/a")} />
      </AuditLog>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("AuditEvent valid timestamps", () => {
  it("normalises a Date to ISO 8601 in the datetime attribute", () => {
    const { container } = render(
      <AuditEvent
        eventId="1"
        actor="Ada"
        action="signed in"
        timestamp={new Date(Date.UTC(2026, 7, 18, 12, 0, 0))}
      />,
    );
    expect(container.querySelector('[data-slot="audit-event-timestamp"]')).toHaveAttribute(
      "datetime",
      "2026-08-18T12:00:00.000Z",
    );
  });

  it("passes a string through unchanged so a date-only value stays date-only", () => {
    const { container } = render(
      <AuditEvent eventId="1" actor="Ada" action="signed in" timestamp="2026-08-18" />,
    );
    expect(container.querySelector("time")).toHaveAttribute("datetime", "2026-08-18");
  });
});
