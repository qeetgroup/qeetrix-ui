import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip/tooltip";
import { DirectionProvider } from "@/providers/direction-provider";

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

  it("is a restrained inverse chip, not a card", () => {
    render(<TooltipExample open />);
    const popup = document.querySelector('[data-slot="tooltip-content"]');
    const className = popup?.className ?? "";
    expect(className).toContain("bg-(--qx-component-tooltip-background)");
    expect(className).toContain("text-(--qx-component-tooltip-foreground)");
    // The caption type role survives beside a text colour now that cn() knows the type roles.
    expect(className).toContain("text-caption");
    expect(className).not.toMatch(/(^|\s)shadow-/);
    // Invisible normally; the tooltip's only edge in forced-colors mode.
    expect(className).toContain("border-transparent");
  });

  it("carries no dead Radix state selectors", () => {
    render(<TooltipExample open />);
    expect(document.querySelector('[data-slot="tooltip-content"]')?.className).not.toContain(
      "data-[state=",
    );
  });
});

describe("TooltipProvider delay", () => {
  it("waits before showing on hover instead of flashing up instantly", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Helpful hint</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.hover(screen.getByRole("button", { name: "Hover me" }));
    // Still closed well inside the delay…
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(screen.queryByText("Helpful hint")).not.toBeInTheDocument();
    // …and open once it has elapsed.
    expect(await screen.findByText("Helpful hint", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("opens immediately on keyboard focus, which needs no delay", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Helpful hint</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Hover me" })).toHaveFocus();
    expect(await screen.findByText("Helpful hint", {}, { timeout: 300 })).toBeInTheDocument();
  });
});

describe("Tooltip logical sides", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("dir");
  });

  function Logical() {
    return (
      <Tooltip open>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent side="inline-end">Helpful hint</TooltipContent>
      </Tooltip>
    );
  }

  it("resolves inline-end to the right in an LTR document", () => {
    render(<Logical />);
    expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveAttribute(
      "data-side",
      "right",
    );
  });

  it("honours <html dir='rtl'> without a DirectionProvider", () => {
    document.documentElement.setAttribute("dir", "rtl");
    render(<Logical />);
    expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveAttribute(
      "data-side",
      "left",
    );
  });

  it("follows a DirectionProvider that declares RTL", () => {
    render(
      <DirectionProvider direction="rtl">
        <Logical />
      </DirectionProvider>,
    );
    expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveAttribute(
      "data-side",
      "left",
    );
  });
});
