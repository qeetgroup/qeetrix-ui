import { CheckIcon } from "@qeetrix/icons/icons/check";
import { MinusIcon } from "@qeetrix/icons/icons/minus";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { findIcon } from "@/__tests__/icon-match";
import { Checkbox } from "@/components/Checkbox/checkbox";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const hasClass = (el: Element, token: string) => el.className.split(/\s+/).includes(token);

describe("Checkbox", () => {
  it("toggles and reports the change", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Accept terms" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Accept terms" });
    expect(box).toHaveAttribute("aria-checked", "false");
    fireEvent.click(box);
    expect(onCheckedChange).toHaveBeenCalled();
    expect(box).toHaveAttribute("aria-checked", "true");
  });

  it("respects the disabled state", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Accept terms" disabled onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Accept terms" }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Checkbox aria-label="Accept terms" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Checkbox states", () => {
  it("reports the mixed state and draws a minus, not a check", () => {
    const { container } = render(<Checkbox aria-label="Select all" indeterminate />);
    const box = screen.getByRole("checkbox", { name: "Select all" });
    expect(box).toHaveAttribute("aria-checked", "mixed");
    expect(box).toHaveAttribute("data-indeterminate");
    expect(findIcon(container, MinusIcon)).not.toBeNull();
    expect(findIcon(container, CheckIcon)).toBeNull();
  });

  it("keeps the check glyph as the checked indicator", () => {
    const { container } = render(<Checkbox aria-label="On" defaultChecked />);
    expect(
      findIcon(container.querySelector("[data-slot=checkbox-indicator]"), CheckIcon),
    ).not.toBeNull();
  });

  it("forwards aria-invalid", () => {
    render(<Checkbox aria-label="Consent" aria-invalid />);
    expect(screen.getByRole("checkbox", { name: "Consent" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("is named by a <label htmlFor> and toggles from it", () => {
    const onCheckedChange = vi.fn();
    render(
      <>
        <label htmlFor="marketing">Send me product news</label>
        <Checkbox id="marketing" onCheckedChange={onCheckedChange} />
      </>,
    );
    expect(screen.getByRole("checkbox", { name: "Send me product news" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Send me product news"));
    expect(onCheckedChange).toHaveBeenCalled();
  });

  it("ignores changes when read-only", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Locked" readOnly onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Locked" }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe("Checkbox styling contract", () => {
  // Base UI renders <span role="checkbox">, which `:disabled` never matches. The dimming used to
  // be written as `disabled:opacity-disabled`, so a disabled checkbox looked enabled.
  it("dims through data-disabled, the attribute Base UI actually sets", () => {
    render(<Checkbox aria-label="Off" disabled />);
    const box = screen.getByRole("checkbox", { name: "Off" });
    expect(box.tagName).toBe("SPAN");
    expect(box).toHaveAttribute("data-disabled");
    expect(hasClass(box, "data-disabled:opacity-disabled")).toBe(true);
    expect(box.className).not.toMatch(/(^|\s)disabled:/);
  });

  it("uses the foundation focus ring rather than the legacy translucent halo", () => {
    render(<Checkbox aria-label="Focus" />);
    const box = screen.getByRole("checkbox", { name: "Focus" });
    expect(hasClass(box, "focus-visible:focus-ring")).toBe(true);
    expect(box.className).not.toMatch(/ring-ring\/disabled|ring-3/);
  });

  it("gives the checked state the ≥3:1 brand edge and never colours text with text-primary", () => {
    render(<Checkbox aria-label="Edge" defaultChecked />);
    const box = screen.getByRole("checkbox", { name: "Edge" });
    expect(hasClass(box, "data-checked:border-border-brand")).toBe(true);
    expect(box.className).not.toMatch(/(^|\s)text-primary(\s|$)/);
  });

  it("draws its rest state from the field tokens", () => {
    render(<Checkbox aria-label="Field" />);
    const box = screen.getByRole("checkbox", { name: "Field" });
    expect(hasClass(box, "border-(--qx-component-input-border)")).toBe(true);
    expect(hasClass(box, "bg-(--qx-component-input-background)")).toBe(true);
    expect(box.className).not.toMatch(/dark:bg-input/);
  });
});

describe("Checkbox group parent (integration pass)", () => {
  it("draws a minus while only some children are checked — mixed by group state, not a prop", async () => {
    const { CheckboxGroup } = await import("@/components/Checkbox/checkbox");
    const { container } = render(
      <CheckboxGroup allValues={["read", "write"]} defaultValue={["read"]} aria-label="Scopes">
        <Checkbox parent aria-label="All scopes" />
        <Checkbox value="read" aria-label="Read" />
        <Checkbox value="write" aria-label="Write" />
      </CheckboxGroup>,
    );
    const parent = screen.getByRole("checkbox", { name: "All scopes" });
    expect(parent).toHaveAttribute("aria-checked", "mixed");
    const indicator = parent.querySelector("[data-slot=checkbox-indicator]");
    expect(findIcon(indicator, MinusIcon)).not.toBeNull();
    expect(findIcon(indicator, CheckIcon)).toBeNull();
    expect(container).toBeTruthy();
  });
});
