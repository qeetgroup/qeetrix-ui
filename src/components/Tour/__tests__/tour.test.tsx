import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Tour } from "@/components/Tour/tour";
import { DirectionProvider } from "@/providers/direction-provider";
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
    // Focus starts on the primary action, so Enter advances rather than dismissing.
    expect(screen.getByRole("button", { name: /next/i })).toHaveFocus();

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

  // ── Names, progression and announcements ─────────────────────────────────────────────────

  it("names the step from its title and describes it with its content and position", () => {
    render(<Tour steps={steps} open />);
    const dialog = screen.getByRole("dialog", { name: "Welcome to the product" });
    expect(dialog).toHaveAccessibleDescription("This is the first step of the tour. 1 of 2");
  });

  it("announces the new step politely when moving on, without moving focus", async () => {
    const user = userEvent.setup();
    render(<Tour steps={steps} open />);
    const next = screen.getByRole("button", { name: /next/i });
    await user.click(next);
    const status = document.querySelector('[data-slot="tour-step-status"]');
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Explore features, 2 of 2");
    // The same button is now "Done" and still holds focus.
    expect(screen.getByRole("button", { name: /done/i })).toHaveFocus();
  });

  it("follows the reading direction for the arrow keys", () => {
    render(
      <DirectionProvider direction="rtl">
        <Tour steps={steps} open />
      </DirectionProvider>,
    );
    // In RTL the inline-end direction is leftwards, so ArrowLeft advances.
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(screen.getByRole("dialog", { name: "Explore features" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByRole("dialog", { name: "Welcome to the product" })).toBeInTheDocument();
  });

  it("leaves arrow keys typed into a field in the step to the field", () => {
    render(
      <Tour
        steps={[{ ...steps[0], content: <input aria-label="Workspace name" /> }, steps[1]]}
        open
      />,
    );
    const field = screen.getByRole("textbox", { name: "Workspace name" });
    fireEvent.keyDown(field, { key: "ArrowRight" });
    expect(screen.getByRole("dialog", { name: "Welcome to the product" })).toBeInTheDocument();
  });

  it("uses the tour message catalogue and accepts overrides", () => {
    render(<Tour steps={steps} open messages={{ dismiss: "Skip tour", back: "Previous" }} />);
    expect(screen.getByRole("button", { name: "Skip tour" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
  });

  it("gives the dismiss control a 28px target", () => {
    render(<Tour steps={steps} open />);
    expect(screen.getByRole("button", { name: "Dismiss tour" })).toHaveAttribute(
      "data-size",
      "icon-sm",
    );
  });

  // ── Spotlight ────────────────────────────────────────────────────────────────────────────
  // jsdom measures every box as zero and implements neither clip-path nor scrolling, so these
  // assert that a present target is spotlighted, that the scrim is the token, and that an
  // off-screen target is asked to scroll into view.

  it("cuts a spotlight out of the scrim when the target exists", () => {
    render(
      <>
        <button type="button" id="step-one">
          Search
        </button>
        <Tour steps={steps} open />
      </>,
    );
    const backdrop = document.querySelector('[data-slot="tour-backdrop"]');
    expect(backdrop).toHaveAttribute("data-spotlight");
    expect(backdrop?.className).toContain("bg-(--qx-component-tour-scrim)");
    expect(backdrop?.className).not.toMatch(/bg-black/);
  });

  it("dims the whole page when the target is missing", () => {
    render(<Tour steps={steps} open />);
    expect(document.querySelector('[data-slot="tour-backdrop"]')).not.toHaveAttribute(
      "data-spotlight",
    );
  });

  it("scrolls an off-screen target into view, since the page itself cannot scroll", () => {
    const target = document.createElement("div");
    target.id = "step-one";
    document.body.appendChild(target);
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    target.getBoundingClientRect = () =>
      ({ top: 2000, left: 0, bottom: 2040, right: 100, width: 100, height: 40 }) as DOMRect;
    try {
      render(<Tour steps={steps} open />);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", inline: "nearest" });
    } finally {
      target.remove();
    }
  });

  it("does not scroll a target that is already visible", () => {
    const target = document.createElement("div");
    target.id = "step-one";
    document.body.appendChild(target);
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    try {
      render(<Tour steps={steps} open />);
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      target.remove();
    }
  });
});
