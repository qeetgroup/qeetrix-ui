import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

const a11y = (c: Element) =>
  axe(c, {
    rules: { "color-contrast": { enabled: false }, "aria-command-name": { enabled: false } },
  });

function PopoverExample({ open }: { open?: boolean }) {
  return (
    <Popover open={open}>
      <PopoverTrigger>Open popover</PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Filter options</PopoverTitle>
        <p>Popover body content</p>
      </PopoverContent>
    </Popover>
  );
}

describe("Popover", () => {
  it("renders the trigger button", () => {
    render(<PopoverExample />);
    expect(screen.getByRole("button", { name: "Open popover" })).toBeInTheDocument();
  });

  it("shows popover content when open=true", () => {
    render(<PopoverExample open />);
    expect(screen.getByText("Filter options")).toBeInTheDocument();
    expect(screen.getByText("Popover body content")).toBeInTheDocument();
  });

  it("does not show content when closed", () => {
    render(<PopoverExample open={false} />);
    expect(screen.queryByText("Filter options")).not.toBeInTheDocument();
  });

  it("opens on trigger click (uncontrolled)", () => {
    render(<PopoverExample />);
    fireEvent.click(screen.getByRole("button", { name: "Open popover" }));
    expect(screen.getByText("Filter options")).toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    render(<PopoverExample open />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});
