import {
  act,
  fireEvent,
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Toaster, toast } from "@/components/Toast/toast";

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
  vi.useRealTimers();
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

/** Matches the visible title only — Base UI mirrors high-priority toasts into a hidden alert. */
const TITLE = { selector: '[data-slot="toast-title"]' };

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
    render(<ToastHarness title="Heads up" type="warning" />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    const root = toastFor(await screen.findByText("Heads up"));
    expect(root).toHaveAttribute("role", "dialog");
    expect(root).toHaveAttribute("tabindex", "0");
    expect(root).toHaveAttribute("data-type", "warning");
    expect(root).toHaveClass("focus-visible:focus-ring");
  });

  it("announces an error assertively (high priority) and keeps it overridable", async () => {
    render(<ToastHarness title="Payment failed" type="error" />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    const root = toastFor(await screen.findByText("Payment failed", TITLE));
    expect(root).toHaveAttribute("role", "alertdialog");
    expect(root).toHaveAttribute("data-type", "error");
    // Base UI mirrors high-priority toasts into a role="alert" node while they are unfocused.
    expect(screen.getByRole("alert")).toHaveTextContent("Payment failed");

    act(() => {
      toast.error("Quiet failure", { priority: "low" });
    });
    const quiet = toastFor(await screen.findByText("Quiet failure"));
    expect(quiet).toHaveAttribute("role", "dialog");
  });

  it("keeps errors and actionable toasts up longer than a confirmation", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Toaster />);
    act(() => {
      toast.success("Short lived");
      toast.error("Long lived");
      toast("With undo", { actionProps: { children: "Undo" } });
    });
    await screen.findByText("Long lived", TITLE);
    act(() => {
      vi.advanceTimersByTime(6_000);
    });
    const gone = (text: string) => {
      const node = screen.queryByText(text, TITLE);
      return node === null || toastFor(node).hasAttribute("data-ending-style");
    };
    expect(gone("Short lived")).toBe(true);
    expect(gone("Long lived")).toBe(false);
    expect(gone("With undo")).toBe(false);
  });

  it("promotes a title-less toast's text to its title, so the dialog is named", async () => {
    render(<Toaster />);
    act(() => {
      void toast.promise(new Promise(() => {}), {
        loading: "Uploading audit.csv",
        success: "Uploaded",
        error: "Upload failed",
      });
    });
    const text = await screen.findByText("Uploading audit.csv");
    expect(text).toHaveAttribute("data-slot", "toast-title");
    const root = toastFor(text);
    expect(root).toHaveAttribute("data-type", "loading");
    expect(root.querySelector('[data-slot="toast-description"]')).toBeNull();
    expect(screen.getByRole("dialog", { name: "Uploading audit.csv" })).toBe(root);
  });

  it("hides toasts that Base UI marks as over the limit", async () => {
    render(<Toaster limit={1} />);
    act(() => {
      toast("First toast");
      toast("Second toast");
    });
    await screen.findByText("Second toast");
    const first = toastFor(screen.getByText("First toast"));
    expect(first).toHaveAttribute("data-limited");
    expect(first).toHaveClass("data-limited:hidden");
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
    expect(close).toHaveClass("focus-visible:focus-ring");
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

  it("has no axe violations with an error toast visible", async () => {
    render(<ToastHarness title="Failed toast" description="Card declined" type="error" />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    await screen.findByText("Failed toast", TITLE);
    expect(await a11y(document.body)).toHaveNoViolations();
  });

  it("has no axe violations with a toast visible", async () => {
    render(<ToastHarness title="Accessible toast" description="With a body" />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    await screen.findByText("Accessible toast");
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});
