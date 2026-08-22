import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Banner } from "@/components/Alert/banner";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Banner", () => {
  it("renders a region and dismisses", () => {
    const onDismiss = vi.fn();
    render(
      <Banner variant="info" aria-label="Announcement" onDismiss={onDismiss}>
        Maintenance tonight
      </Banner>,
    );
    expect(screen.getByRole("region", { name: "Announcement" })).toHaveTextContent(
      "Maintenance tonight",
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Banner aria-label="Announcement">Heads up</Banner>);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
