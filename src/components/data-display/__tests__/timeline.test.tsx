import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Timeline,
  TimelineContent,
  TimelineDescription,
  TimelineIndicator,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
} from "@/components/data-display/timeline";

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
