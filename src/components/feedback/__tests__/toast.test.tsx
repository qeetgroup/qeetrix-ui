import {
  act,
  fireEvent,
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Toaster, toast } from "@/components/feedback/toast";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

// The `toast()` API drives a module-level manager shared by every <Toaster />,
// so toasts outlive a single render. Best-effort clear between tests; queries
// below are also scoped to the specific toast under test (via unique titles)
// so any lingering exit-animation node from a prior test can't confuse them.
afterEach(() => {
  act(() => {
    toast.dismiss();
  });
});

function ToastHarness({
  title = "Saved!",
  description,
  type = "success",
}: {
  title?: string;
  description?: string;
  type?: "info" | "success" | "warning" | "error";
}) {
  return (
    <>
      <button type="button" onClick={() => toast[type](title, { description })}>
        Notify
      </button>
      <Toaster />
    </>
  );
}

/** The toast root element that contains the given title text. */
function toastFor(title: HTMLElement): HTMLElement {
  return title.closest('[data-slot="toast"]') as HTMLElement;
}

describe("Toast", () => {
  it("renders a labelled, polite live region viewport", () => {
    render(<Toaster />);
    const region = screen.getByRole("region", { name: "Notifications" });
    expect(region).toBeInTheDocument();
    // Toasts must be announced without interrupting the user (WCAG 4.1.3).
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("shows a triggered toast's title and description", async () => {
    render(<ToastHarness title="File saved" description="Your changes are safe" />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    const title = await screen.findByText("File saved");
    const root = toastFor(title);
    expect(within(root).getByText("Your changes are safe")).toBeInTheDocument();
  });

  it("exposes each toast as a focusable dialog carrying its intent", async () => {
    render(<ToastHarness title="Deleted" type="error" />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    const root = toastFor(await screen.findByText("Deleted"));
    expect(root).toHaveAttribute("role", "dialog");
    expect(root).toHaveAttribute("tabindex", "0");
    expect(root).toHaveAttribute("data-type", "error");
  });

  it("renders a labelled close control", async () => {
    render(<ToastHarness title="Uploaded" />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    const root = toastFor(await screen.findByText("Uploaded"));
    // Base UI marks the visible X control aria-hidden and instead lets screen
    // reader users dismiss via the focusable toast dialog itself, so it is not
    // exposed as a role=button in the accessibility tree. We assert the visible
    // control exists and carries a label (for pointer users / tooltips).
    const close = root.querySelector('[data-slot="toast-close"]');
    if (!close) throw new Error('expected a [data-slot="toast-close"] element');
    expect(close.tagName).toBe("BUTTON");
    expect(close).toHaveAttribute("aria-label", "Close");
  });

  it("dismisses a toast programmatically", async () => {
    render(<ToastHarness title="Temporary" />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    await screen.findByText("Temporary");
    act(() => {
      toast.dismiss();
    });
    await waitForElementToBeRemoved(() => screen.queryByText("Temporary"));
    expect(screen.queryByText("Temporary")).not.toBeInTheDocument();
  });

  it("has no axe violations with a toast visible", async () => {
    render(<ToastHarness title="Accessible toast" description="With a body" />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    await screen.findByText("Accessible toast");
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});
