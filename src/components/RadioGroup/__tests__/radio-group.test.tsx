import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Radio, RadioGroup } from "@/components/RadioGroup/radio-group";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const hasClass = (el: Element, token: string) => el.className.split(/\s+/).includes(token);

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

describe("Radio states", () => {
  it("dims a disabled radio through data-disabled, the attribute Base UI sets on its <span>", () => {
    render(
      <RadioGroup aria-label="Plan" defaultValue="a">
        <Radio value="a" aria-label="A" />
        <Radio value="b" aria-label="B" disabled />
      </RadioGroup>,
    );
    const b = screen.getByRole("radio", { name: "B" });
    expect(b).toHaveAttribute("data-disabled");
    expect(hasClass(b, "data-disabled:opacity-disabled")).toBe(true);
    expect(b.className).not.toMatch(/(^|\s)disabled:/);
    fireEvent.click(b);
    expect(b).toHaveAttribute("aria-checked", "false");
  });

  it("draws checked as a filled Ember disc with a graphite dot and a ≥3:1 brand edge", () => {
    const { container } = render(<Example />);
    const free = screen.getByRole("radio", { name: "Free" });
    expect(hasClass(free, "data-checked:bg-primary")).toBe(true);
    expect(hasClass(free, "data-checked:border-border-brand")).toBe(true);
    const dot = container.querySelector("[data-slot=radio-indicator] > span");
    expect(dot?.className).toMatch(/(^|\s)bg-primary-foreground(\s|$)/);
    // The ~3:1 Ember dot in an empty ring is gone: it fell to 2.6:1 on tinted surfaces.
    expect(free.className).not.toMatch(/(^|\s)text-primary(\s|$)/);
  });

  it("forwards aria-invalid and uses the foundation focus ring", () => {
    render(
      <RadioGroup aria-label="Plan">
        <Radio value="a" aria-label="A" aria-invalid />
      </RadioGroup>,
    );
    const a = screen.getByRole("radio", { name: "A" });
    expect(a).toHaveAttribute("aria-invalid", "true");
    expect(hasClass(a, "focus-visible:focus-ring")).toBe(true);
  });

  it("disables every radio from the group", () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup aria-label="Plan" disabled onValueChange={onValueChange}>
        <Radio value="a" aria-label="A" />
      </RadioGroup>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "A" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
