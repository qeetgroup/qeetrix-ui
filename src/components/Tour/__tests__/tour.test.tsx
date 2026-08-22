import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Tour } from "@/components/Tour/tour";
import { OVERLAY_ROOT_ATTRIBUTE } from "@/runtime/overlay";

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

  // ── Modality ─────────────────────────────────────────────────────────────────────────────
  // `aria-modal="true"` is a claim about the rest of the page. These assert the mechanisms
  // that make the claim true. jsdom implements neither `inert` nor scrolling, so they check
  // that the mechanism is installed and released — a real browser is needed to observe that
  // background content is genuinely unreachable.

  it("inerts the page behind it while open and releases it on close", () => {
    const { rerender } = render(
      <>
        <input aria-label="Underlying input" />
        <Tour steps={steps} open />
      </>,
    );

    const page = document.body.firstElementChild;
    expect(page).toHaveAttribute("inert");

    rerender(
      <>
        <input aria-label="Underlying input" />
        <Tour steps={steps} open={false} />
      </>,
    );
    expect(page).not.toHaveAttribute("inert");
  });

  it("leaves its own backdrop and card operable", () => {
    render(<Tour steps={steps} open />);

    const backdrop = document.querySelector('[data-slot="tour-backdrop"]');
    expect(backdrop).not.toHaveAttribute("inert");
    expect(screen.getByRole("dialog")).not.toHaveAttribute("inert");

    // Tour writes the overlay-root marker literally; this keeps it in step with the runtime.
    expect(backdrop).toHaveAttribute(OVERLAY_ROOT_ATTRIBUTE);
    expect(screen.getByRole("dialog")).toHaveAttribute(OVERLAY_ROOT_ATTRIBUTE);
  });

  it("locks page scroll while open and restores it on close", () => {
    const { rerender } = render(<Tour steps={steps} open />);
    expect(document.body.style.overflow).toBe("hidden");

    rerender(<Tour steps={steps} open={false} />);
    expect(document.body.style.overflow).toBe("");
  });

  it("releases the background before restoring focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<TourHarness />);
    const trigger = screen.getByRole("button", { name: "Start tour" });

    // The ordering contract between useModalOverlay (layout effect) and useFocusTrap (passive
    // effect): a browser ignores focus() on an element inside an inert subtree, so the page has
    // to be released first. jsdom ignores `inert`, so the only way to see the order is to look
    // at the DOM from inside the restore itself.
    let inertWhenFocused: boolean | null = null;
    trigger.addEventListener("focus", () => {
      inertWhenFocused = trigger.closest("[inert]") !== null;
    });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(trigger).toHaveFocus();
    expect(inertWhenFocused).toBe(false);
  });

  it("reports the side the card was placed on", () => {
    render(<Tour steps={[{ ...steps[0], placement: "right" }]} open />);
    // jsdom measures every box as zero, so the anchor is at the origin and there is room on
    // the requested side; the point of the assertion is that the resolved side is exposed.
    expect(screen.getByRole("dialog")).toHaveAttribute("data-side", "right");
  });
});
