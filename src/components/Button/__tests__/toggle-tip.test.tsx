import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ToggleTip, ToggleTipContent, ToggleTipTrigger } from "@/components/Button/toggle-tip";

const a11y = (c: Element) =>
  axe(c, {
    rules: {
      "color-contrast": { enabled: false },
      "aria-command-name": { enabled: false },
      // Isolated component render has no page landmarks — not a component concern.
      region: { enabled: false },
    },
  });

function ToggleTipExample({ open }: { open?: boolean }) {
  return (
    <ToggleTip open={open}>
      <ToggleTipTrigger />
      <ToggleTipContent>More information about this field.</ToggleTipContent>
    </ToggleTip>
  );
}

describe("ToggleTip", () => {
  it("renders trigger button with accessible label", () => {
    render(<ToggleTipExample />);
    expect(screen.getByRole("button", { name: "More information" })).toBeInTheDocument();
  });

  it("trigger accepts a custom aria-label", () => {
    render(
      <ToggleTip>
        <ToggleTipTrigger label="Learn more" />
        <ToggleTipContent>Details</ToggleTipContent>
      </ToggleTip>,
    );
    expect(screen.getByRole("button", { name: "Learn more" })).toBeInTheDocument();
  });

  it("clicking trigger shows content", () => {
    render(<ToggleTipExample />);
    const trigger = screen.getByRole("button", { name: "More information" });
    fireEvent.click(trigger);
    expect(screen.getByText("More information about this field.")).toBeInTheDocument();
  });

  it("shows content when open=true", () => {
    render(<ToggleTipExample open />);
    expect(screen.getByText("More information about this field.")).toBeInTheDocument();
  });

  it("has no axe violations when closed", async () => {
    const { container } = render(<ToggleTipExample />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations when open", async () => {
    render(<ToggleTipExample open />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});
