import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Notification } from "@/components/Notification/notification";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Notification", () => {
  it("renders title and description", () => {
    render(<Notification title="Saved" description="Your changes were saved." />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Your changes were saved.")).toBeInTheDocument();
  });

  it("uses role=alert for error and role=status otherwise", () => {
    const { rerender } = render(<Notification variant="error" title="Failed" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    rerender(<Notification variant="success" title="Done" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("announces `destructive` exactly like its `error` alias", () => {
    // Regression: `destructive` got role=alert but aria-live=polite, a contradiction.
    render(<Notification variant="destructive" title="Failed" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });

  it("lets a feed opt each card out of being a live region", () => {
    // A feed passes these through to drop the live-region semantics from every card.
    const quiet = { role: undefined, "aria-live": undefined };
    render(<Notification {...quiet} title="Quiet" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("is a neutral card with the status carried by the icon tile", () => {
    const { container } = render(<Notification variant="warning" title="Quota at 90%" />);
    expect(container.querySelector('[data-slot="notification"]')).toHaveClass("bg-card");
    expect(container.querySelector('[data-slot="notification-icon"]')).toHaveClass(
      "bg-warning-subtle",
      "text-warning-text",
    );
  });

  it("renders time and the unread mark", () => {
    const { container } = render(<Notification title="Invoice paid" time="2m ago" unread />);
    expect(screen.getByText("2m ago")).toHaveAttribute("data-slot", "notification-time");
    expect(screen.getByText("Invoice paid")).toHaveClass("font-semibold");
    expect(container.querySelector('[data-slot="notification-unread"]')).toHaveAttribute(
      "aria-hidden",
    );
    expect(container.querySelector('[data-slot="notification"]')).toHaveAttribute(
      "data-unread",
      "true",
    );
  });

  it("marks a loading card busy", () => {
    render(<Notification title="Exporting" loading />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("has a compact size for dense streams", () => {
    const { container } = render(<Notification size="sm" title="Domain verified" />);
    expect(container.querySelector('[data-slot="notification"]')).toHaveClass("py-2.5");
    expect(container.querySelector('[data-slot="notification-icon"]')).toHaveClass("size-6");
  });

  it("fires onClose", () => {
    const onClose = vi.fn();
    render(<Notification title="Hi" onClose={onClose} />);
    const button = screen.getByRole("button", { name: "Dismiss" });
    expect(button).toHaveClass("focus-visible:focus-ring");
    fireEvent.click(button);
    expect(onClose).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <>
        <Notification
          variant="info"
          title="Heads up"
          description="Trial ends soon."
          time="2m"
          unread
          onClose={() => {}}
          action={<button type="button">Upgrade</button>}
        />
        <Notification variant="destructive" title="Payment failed" size="sm" />
      </>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
