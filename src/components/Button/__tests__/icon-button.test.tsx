import { render, screen } from "@testing-library/react";
import { BellIcon } from "lucide-react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { IconButton } from "@/components/Button/icon-button";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("IconButton", () => {
  it("renders button with the given aria-label", () => {
    render(<IconButton icon={BellIcon} aria-label="Notifications" />);
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("contains an icon element", () => {
    render(<IconButton icon={BellIcon} aria-label="Notifications" />);
    const button = screen.getByRole("button", { name: "Notifications" });
    expect(button.querySelector("svg")).toBeTruthy();
  });

  it("has no axe violations", async () => {
    const { container } = render(<IconButton icon={BellIcon} aria-label="Notifications" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
