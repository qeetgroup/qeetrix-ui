import { CheckIcon } from "@qeetrix/icons/icons/check";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Timeline,
  TimelineContent,
  TimelineDescription,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
} from "@/components/Feed/timeline";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function Example() {
  return (
    <Timeline>
      <TimelineItem>
        <TimelineIndicator />
        <TimelineContent>
          <TimelineTitle>Account created</TimelineTitle>
          <TimelineTime>2h ago</TimelineTime>
          <TimelineDescription>Signed up with a passkey.</TimelineDescription>
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  );
}

function Hierarchy() {
  return (
    <Timeline>
      <TimelineItem>
        <TimelineIndicator tone="success" icon={<CheckIcon />} label="Succeeded" />
        <TimelineContent>
          <TimelineHeader>
            <TimelineTitle>Passkey added</TimelineTitle>
            <TimelineTime dateTime="2026-08-18T12:00:00.000Z">2h ago</TimelineTime>
          </TimelineHeader>
          <TimelineDescription>MacBook Pro · Touch ID</TimelineDescription>
        </TimelineContent>
      </TimelineItem>
      <TimelineItem emphasis="minor">
        <TimelineIndicator />
        <TimelineContent>
          <TimelineHeader>
            <TimelineTitle>Directory sync ran</TimelineTitle>
            <TimelineTime>3h ago</TimelineTime>
          </TimelineHeader>
        </TimelineContent>
      </TimelineItem>
    </Timeline>
  );
}

describe("Timeline", () => {
  it("renders an ordered list of items", () => {
    render(<Example />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Account created")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Example />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Timeline event hierarchy", () => {
  it("defaults to a neutral dot, not the brand fill", () => {
    const { container } = render(<Example />);
    const marker = container.querySelector('[data-slot="timeline-marker"]');
    expect(marker).toHaveAttribute("data-tone", "neutral");
    expect(marker).not.toHaveClass("bg-primary");
  });

  it("renders an icon marker in its tone, hidden from assistive technology", () => {
    const { container } = render(<Hierarchy />);
    const marker = container.querySelector('[data-slot="timeline-marker"][data-tone="success"]');
    expect(marker).toHaveAttribute("aria-hidden");
    expect(marker?.querySelector("svg")).not.toBeNull();
  });

  it("says what the marker conveys when given a label", () => {
    render(<Hierarchy />);
    expect(screen.getByText("Succeeded")).toHaveClass("sr-only");
  });

  it("marks minor events so their marker and text step back", () => {
    render(<Hierarchy />);
    const [, minor] = screen.getAllByRole("listitem");
    expect(minor).toHaveAttribute("data-emphasis", "minor");
  });

  it("renders a machine-readable time when given dateTime", () => {
    render(<Hierarchy />);
    const time = screen.getByText("2h ago");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", "2026-08-18T12:00:00.000Z");
    expect(screen.getByText("3h ago").tagName).toBe("DIV");
  });

  it("keeps one connector per item, hidden from assistive technology", () => {
    const { container } = render(<Hierarchy />);
    const connectors = container.querySelectorAll('[data-slot="timeline-connector"]');
    expect(connectors).toHaveLength(2);
    for (const connector of connectors) expect(connector).toHaveAttribute("aria-hidden");
  });

  it("replaces the marker entirely with custom children", () => {
    const { container } = render(
      <Timeline>
        <TimelineItem>
          <TimelineIndicator>
            <span data-testid="custom-marker" />
          </TimelineIndicator>
          <TimelineContent>
            <TimelineTitle>Custom</TimelineTitle>
          </TimelineContent>
        </TimelineItem>
      </Timeline>,
    );
    expect(screen.getByTestId("custom-marker")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="timeline-marker"]')).toBeNull();
  });

  it("has no axe violations with icons, labels and minor events", async () => {
    const { container } = render(<Hierarchy />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
