import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Notification } from "@/components/feedback/notification";

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

  it("fires onClose", () => {
    const onClose = vi.fn();
    render(<Notification title="Hi" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Notification
        variant="info"
        title="Heads up"
        description="Trial ends soon."
        onClose={() => {}}
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
