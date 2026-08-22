import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip/tooltip";

const a11y = (c: Element) =>
  axe(c, {
    rules: { "color-contrast": { enabled: false }, "aria-command-name": { enabled: false } },
  });

function TooltipExample({ open }: { open?: boolean }) {
  return (
    <TooltipProvider>
      <Tooltip open={open}>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Helpful hint</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

describe("Tooltip", () => {
  it("renders the trigger button", () => {
    render(<TooltipExample />);
    expect(screen.getByRole("button", { name: "Hover me" })).toBeInTheDocument();
  });

  it("shows tooltip content when open=true", () => {
    render(<TooltipExample open />);
    expect(screen.getByText("Helpful hint")).toBeInTheDocument();
  });

  it("hides tooltip content when closed", () => {
    render(<TooltipExample open={false} />);
    expect(screen.queryByText("Helpful hint")).not.toBeInTheDocument();
  });

  it("trigger has no axe violations", async () => {
    render(<TooltipExample />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});
