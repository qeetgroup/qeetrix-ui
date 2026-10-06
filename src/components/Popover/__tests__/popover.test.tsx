import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/Popover/popover";

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

  it("sits on the named popover layer, above the modal band", () => {
    render(<PopoverExample open />);
    const popup = document.querySelector('[data-slot="popover-content"]');
    expect(popup?.className).toContain("z-(--qx-z-popover)");
  });

  // jsdom does not paint; these assert the declarations behind the overlay recipe.
  it("draws its edge with a real border, which forced-colors mode keeps", () => {
    render(<PopoverExample open />);
    const popup = document.querySelector('[data-slot="popover-content"]');
    expect(popup?.className).toContain("border-(--qx-component-popover-border)");
    // A box-shadow ring is stripped in forced-colors mode, leaving Canvas on Canvas.
    expect(popup?.className).not.toMatch(/(^|\s)ring-1(\s|$)/);
    expect(popup?.className).toContain("shadow-(--qx-component-popover-elevation)");
    expect(popup?.className).toContain("rounded-(--qx-component-popover-corner)");
  });

  it("bounds long content to the space available on its side and scrolls it", () => {
    render(<PopoverExample open />);
    const popup = document.querySelector('[data-slot="popover-content"]');
    expect(popup?.className).toContain("max-h-(--available-height)");
    expect(popup?.className).toContain("max-w-(--available-width)");
    expect(popup?.className).toContain("overflow-y-auto");
  });

  it("returns focus to its trigger when dismissed with Escape", async () => {
    const user = userEvent.setup();
    render(<PopoverExample />);
    const trigger = screen.getByRole("button", { name: "Open popover" });
    await user.click(trigger);
    await screen.findByText("Popover body content");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Popover body content")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe("Popover logical sides", () => {
  it("honours <html dir='rtl'> for an inline-start popover without a DirectionProvider", () => {
    document.documentElement.setAttribute("dir", "rtl");
    try {
      render(
        <Popover open>
          <PopoverTrigger>Open popover</PopoverTrigger>
          <PopoverContent side="inline-start">Body</PopoverContent>
        </Popover>,
      );
      expect(document.querySelector('[data-slot="popover-content"]')).toHaveAttribute(
        "data-side",
        "right",
      );
    } finally {
      document.documentElement.removeAttribute("dir");
    }
  });
});
