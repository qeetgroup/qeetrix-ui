import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { NotificationPreferenceMatrix } from "@/components/ui/notification-preference-matrix";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const CHANNELS = [
  { key: "email", label: "Email" },
  { key: "push", label: "Push" },
];
const CATEGORIES = [
  { key: "security", label: "Security" },
  { key: "billing", label: "Billing" },
];

describe("NotificationPreferenceMatrix", () => {
  it("renders a switch per category × channel", () => {
    render(
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={CATEGORIES}
        value={{}}
        onValueChange={() => {}}
      />,
    );
    expect(screen.getAllByRole("switch")).toHaveLength(4);
  });

  it("toggles a cell", () => {
    const onValueChange = vi.fn();
    render(
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={CATEGORIES}
        value={{}}
        onValueChange={onValueChange}
      />,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Security via Email" }));
    expect(onValueChange).toHaveBeenCalledWith({ security: { email: true } });
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={CATEGORIES}
        value={{}}
        onValueChange={() => {}}
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
