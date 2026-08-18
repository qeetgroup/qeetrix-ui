import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Tour } from "@/components/ui/tour";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

const steps = [
  {
    target: "#step-one",
    title: "Welcome to the product",
    content: "This is the first step of the tour.",
  },
  {
    target: "#step-two",
    title: "Explore features",
    content: "Discover what you can do here.",
  },
];

function TourHarness() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Start tour
      </button>
      <Tour steps={steps} open={open} onOpenChange={setOpen} />
    </>
  );
}

describe("Tour", () => {
  it("renders nothing when open=false", () => {
    render(<Tour steps={steps} open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog with step title when open=true", () => {
    render(<Tour steps={steps} open />);
    expect(screen.getByRole("dialog", { name: "Welcome to the product" })).toBeInTheDocument();
    expect(screen.getByText("Welcome to the product")).toBeInTheDocument();
    expect(screen.getByText("This is the first step of the tour.")).toBeInTheDocument();
    // Step counter
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
  });

  it("Next button advances to next step", () => {
    render(<Tour steps={steps} open />);
    expect(screen.getByRole("dialog", { name: "Welcome to the product" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByRole("dialog", { name: "Explore features" })).toBeInTheDocument();
    expect(screen.getByText("Explore features")).toBeInTheDocument();
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    // Last step shows "Done" instead of "Next"
    expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
  });

  it("Escape key closes the tour", () => {
    const onOpenChange = vi.fn();
    render(<Tour steps={steps} open onOpenChange={onOpenChange} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Dismiss button calls onDismiss and onOpenChange", () => {
    const onDismiss = vi.fn();
    const onOpenChange = vi.fn();
    render(<Tour steps={steps} open onDismiss={onDismiss} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss tour" }));
    expect(onDismiss).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("moves focus into the modal tour and restores it on dismiss", async () => {
    const user = userEvent.setup();
    render(<TourHarness />);

    const trigger = screen.getByRole("button", { name: "Start tour" });
    await user.click(trigger);

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Dismiss tour" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("ignores navigation keys dispatched outside the tour", () => {
    render(
      <>
        <input aria-label="Underlying input" />
        <Tour steps={steps} open />
      </>,
    );

    const input = screen.getByRole("textbox", { name: "Underlying input" });
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowRight" });

    expect(screen.getByRole("dialog", { name: "Welcome to the product" })).toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    render(<Tour steps={steps} open />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});
