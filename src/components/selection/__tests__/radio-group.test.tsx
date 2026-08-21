import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Radio, RadioGroup } from "@/components/selection/radio-group";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function Example({ onValueChange }: { onValueChange?: (v: unknown) => void }) {
  return (
    <RadioGroup aria-label="Plan" defaultValue="free" onValueChange={onValueChange}>
      <Radio value="free" aria-label="Free" />
      <Radio value="pro" aria-label="Pro" />
    </RadioGroup>
  );
}

describe("RadioGroup", () => {
  it("renders radiogroup semantics and selects on click", () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    expect(screen.getByRole("radiogroup", { name: "Plan" })).toBeInTheDocument();

    const pro = screen.getByRole("radio", { name: "Pro" });
    fireEvent.click(pro);
    expect(onValueChange).toHaveBeenCalled();
    expect(pro).toHaveAttribute("aria-checked", "true");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Example />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
