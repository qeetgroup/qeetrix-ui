import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/Popover/hover-card";

const a11y = (c: Element) =>
  axe(c, {
    rules: { "color-contrast": { enabled: false }, "aria-command-name": { enabled: false } },
  });

function HoverCardExample({ open }: { open?: boolean }) {
  return (
    <HoverCard open={open}>
      <HoverCardTrigger>@username</HoverCardTrigger>
      <HoverCardContent>
        <p>User profile preview</p>
      </HoverCardContent>
    </HoverCard>
  );
}

describe("HoverCard", () => {
  it("renders the trigger element", () => {
    const { container } = render(<HoverCardExample />);
    expect(container.querySelector('[data-slot="hover-card-trigger"]')).toBeInTheDocument();
  });

  it("trigger contains the text", () => {
    render(<HoverCardExample />);
    expect(screen.getByText("@username")).toBeInTheDocument();
  });

  it("shows content when open=true", () => {
    render(<HoverCardExample open />);
    expect(screen.getByText("User profile preview")).toBeInTheDocument();
  });

  it("hides content when closed", () => {
    render(<HoverCardExample open={false} />);
    expect(screen.queryByText("User profile preview")).not.toBeInTheDocument();
  });

  it("has no axe violations on the trigger", async () => {
    const { container } = render(<HoverCardExample />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("uses the shared anchored-overlay surface", () => {
    render(<HoverCardExample open />);
    const popup = document.querySelector('[data-slot="hover-card-content"]');
    expect(popup?.className).toContain("bg-(--qx-component-popover-background)");
    expect(popup?.className).toContain("border-(--qx-component-popover-border)");
    expect(popup?.className).toContain("shadow-(--qx-component-popover-elevation)");
    expect(popup?.className).toContain("max-h-(--available-height)");
  });

  it("has no axe violations when open", async () => {
    render(<HoverCardExample open />);
    // Isolated component render has no page landmarks — not a component concern.
    const results = await axe(document.body, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });
});
