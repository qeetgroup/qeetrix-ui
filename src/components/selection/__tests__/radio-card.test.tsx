import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { RadioCard, RadioCardGroup } from "@/components/selection/radio-card";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("RadioCardGroup / RadioCard", () => {
  it("renders with radiogroup role", () => {
    render(
      <RadioCardGroup aria-label="Plan selection">
        <RadioCard value="starter">Starter</RadioCard>
        <RadioCard value="pro">Pro</RadioCard>
      </RadioCardGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Plan selection" })).toBeInTheDocument();
  });

  it("selecting a card fires onValueChange", () => {
    const onValueChange = vi.fn();
    render(
      <RadioCardGroup onValueChange={onValueChange}>
        <RadioCard value="starter">Starter</RadioCard>
        <RadioCard value="pro">Pro</RadioCard>
      </RadioCardGroup>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Pro" }));
    expect(onValueChange).toHaveBeenCalledWith("pro");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <RadioCardGroup aria-label="Role assignment">
        <RadioCard value="viewer">Viewer</RadioCard>
        <RadioCard value="editor">Editor</RadioCard>
      </RadioCardGroup>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
