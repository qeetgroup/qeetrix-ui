import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { AuditEvent, AuditEventMetadata, AuditLog } from "@/components/AuditEvent/audit-event";

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

describe("AuditEvent status and scanability", () => {
  it("shows a visible status tag for warning and danger", () => {
    render(
      <>
        <AuditEvent
          eventId="1"
          actor="Ada"
          action="exported"
          timestamp="2026-08-18"
          severity="warning"
        />
        <AuditEvent
          eventId="2"
          actor="Ada"
          action="deleted"
          timestamp="2026-08-18"
          severity="danger"
        />
      </>,
    );
    expect(screen.getByText("Warning")).not.toHaveClass("sr-only");
    expect(screen.getByText("Danger")).not.toHaveClass("sr-only");
  });

  it("keeps routine info and success labels for screen readers only", () => {
    render(
      <>
        <AuditEvent eventId="1" actor="Ada" action="signed in" timestamp="2026-08-18" />
        <AuditEvent
          eventId="2"
          actor="Ada"
          action="synced"
          timestamp="2026-08-18"
          severity="success"
        />
      </>,
    );
    expect(screen.getByText("Info")).toHaveClass("sr-only");
    expect(screen.getByText("Success")).toHaveClass("sr-only");
  });

  it("shows a custom status label whatever the severity", () => {
    render(
      <AuditEvent
        eventId="1"
        actor="Ada"
        action="tried to sign in"
        timestamp="2026-08-18"
        severity="info"
        statusLabel="Denied"
      />,
    );
    expect(screen.getByText("Denied")).not.toHaveClass("sr-only");
  });

  it("renders the event sentence with actor and resource emphasised", () => {
    const { container } = render(
      <AuditEvent
        eventId="1"
        actor="Ada Lovelace"
        action="changed role for"
        resource="Grace Hopper"
        timestamp="2026-08-18"
      />,
    );
    expect(container.querySelector('[data-slot="audit-event-actor"]')).toHaveClass("font-medium");
    expect(container.querySelector('[data-slot="audit-event-resource"]')).toHaveClass(
      "font-medium",
    );
    expect(container.querySelector('[data-slot="audit-event-action"]')).toHaveTextContent(
      "changed role for",
    );
  });

  it("names the technical identifier and renders it monospaced", () => {
    const { container } = render(
      <AuditEvent eventId="evt_01J9" actor="Ada" action="signed in" timestamp="2026-08-18" />,
    );
    const id = container.querySelector('[data-slot="audit-event-id"]');
    expect(id).toHaveClass("font-mono", "text-muted-foreground");
    expect(id?.parentElement).toHaveTextContent("Event ID evt_01J9");
  });

  it("formats in the given time zone", () => {
    render(
      <AuditEvent
        eventId="1"
        actor="Ada"
        action="signed in"
        timestamp="2026-08-18T23:30:00.000Z"
        locale="en-US"
        timeZone="Asia/Kolkata"
      />,
    );
    expect(screen.getByText(/Aug 19, 2026/)).toBeInTheDocument();
  });
});

describe("AuditEvent details disclosure", () => {
  const details = {
    metadata: <div>IP 203.0.113.7</div>,
    diff: <div>Member to Admin</div>,
    raw: <pre>{"{}"}</pre>,
  };

  it("labels each details section as a group, not a page landmark", () => {
    render(
      <AuditEvent
        eventId="1"
        actor="Ada"
        action="changed"
        timestamp="2026-08-18"
        defaultExpanded
        {...details}
      />,
    );
    expect(screen.getByRole("group", { name: "Metadata" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Changes" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Raw event" })).toBeInTheDocument();
    expect(screen.queryAllByRole("region")).toHaveLength(0);
  });

  it("opens and closes uncontrolled", () => {
    const onExpandedChange = vi.fn();
    const { container } = render(
      <AuditEvent
        eventId="1"
        actor="Ada"
        action="changed"
        timestamp="2026-08-18"
        onExpandedChange={onExpandedChange}
        {...details}
      />,
    );
    const disclosure = container.querySelector("details");
    expect(disclosure).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Event details"));
    expect(disclosure).toHaveAttribute("open");
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByText("Event details"));
    expect(disclosure).not.toHaveAttribute("open");
  });

  it("stays authoritative when controlled", () => {
    const onExpandedChange = vi.fn();
    const { container, rerender } = render(
      <AuditEvent
        eventId="1"
        actor="Ada"
        action="changed"
        timestamp="2026-08-18"
        expanded={false}
        onExpandedChange={onExpandedChange}
        {...details}
      />,
    );
    fireEvent.click(screen.getByText("Event details"));
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(container.querySelector("details")).not.toHaveAttribute("open");

    rerender(
      <AuditEvent
        eventId="1"
        actor="Ada"
        action="changed"
        timestamp="2026-08-18"
        expanded
        onExpandedChange={onExpandedChange}
        {...details}
      />,
    );
    expect(container.querySelector("details")).toHaveAttribute("open");
  });

  it("has no axe violations when expanded", async () => {
    const { container } = render(
      <AuditLog aria-label="Audit history">
        <AuditEvent
          eventId="1"
          actor="Ada"
          action="changed"
          timestamp="2026-08-18"
          severity="danger"
          defaultExpanded
          actions={<button type="button">Revert</button>}
          {...details}
        />
      </AuditLog>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("AuditLog", () => {
  it("names each article by its event, as the feed pattern requires", () => {
    render(
      <AuditLog aria-label="Audit history">
        <AuditEvent
          eventId="1"
          actor="Ada Lovelace"
          action="changed role for"
          resource="Grace Hopper"
          description="Member to Admin"
          timestamp="2026-08-18"
        />
        <AuditEvent eventId="2" actor="Grace" action="signed out" timestamp="2026-08-19" />
      </AuditLog>,
    );
    const article = screen.getByRole("article", {
      name: "Ada Lovelace changed role for Grace Hopper",
    });
    expect(article).toHaveAccessibleDescription("Member to Admin");
    expect(screen.getByRole("article", { name: "Grace signed out" })).toBeInTheDocument();
  });

  it("defaults to the list presentation for long logs", () => {
    render(
      <AuditLog aria-label="Audit history">
        <AuditEvent eventId="1" actor="Ada" action="signed in" timestamp="2026-08-18" />
      </AuditLog>,
    );
    expect(screen.getByRole("feed")).toHaveAttribute("data-variant", "list");
    // Deferred rendering is opt-in: off-screen rows would be blank in full-page captures.
    expect(screen.getByRole("article")).not.toHaveClass("[content-visibility:auto]");
  });

  it("defers off-screen rows on request", () => {
    render(
      <AuditLog aria-label="Audit history" deferOffscreen>
        <AuditEvent eventId="1" actor="Ada" action="signed in" timestamp="2026-08-18" />
      </AuditLog>,
    );
    expect(screen.getByRole("article")).toHaveClass("[content-visibility:auto]");
  });

  it("keeps the card presentation available", () => {
    render(
      <AuditLog aria-label="Audit history" variant="card">
        <AuditEvent eventId="1" actor="Ada" action="signed in" timestamp="2026-08-18" />
      </AuditLog>,
    );
    expect(screen.getByRole("feed")).toHaveAttribute("data-variant", "card");
  });
});

describe("AuditEventMetadata", () => {
  it("renders a description list with monospaced technical values", () => {
    render(
      <AuditEventMetadata
        items={[
          { label: "IP address", value: "203.0.113.7", mono: true },
          { label: "Location", value: "Bengaluru, IN" },
        ]}
      />,
    );
    expect(screen.getByText("IP address").tagName).toBe("DT");
    expect(screen.getByText("203.0.113.7")).toHaveClass("font-mono");
    expect(screen.getByText("Bengaluru, IN")).not.toHaveClass("font-mono");
  });
});
