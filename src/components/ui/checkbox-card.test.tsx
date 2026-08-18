import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CheckboxCard, CheckboxCardGroup } from "@/components/ui/checkbox-card";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("CheckboxCard", () => {
  it("renders children", () => {
    render(
      <CheckboxCardGroup>
        <CheckboxCard value="plan-pro">Pro plan</CheckboxCard>
      </CheckboxCardGroup>,
    );
    expect(screen.getByText("Pro plan")).toBeInTheDocument();
  });

  it("clicking fires onCheckedChange", () => {
    const onCheckedChange = vi.fn();
    render(
      <CheckboxCard value="feature-x" onCheckedChange={onCheckedChange}>
        Feature X
      </CheckboxCard>,
    );
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <CheckboxCardGroup>
        <CheckboxCard value="option-a">Option A</CheckboxCard>
        <CheckboxCard value="option-b">Option B</CheckboxCard>
      </CheckboxCardGroup>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
