import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { NativeSelect } from "@/components/Select/native-select";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("NativeSelect", () => {
  it("renders a select element", () => {
    render(
      <label htmlFor="ns-color">
        Color
        <NativeSelect id="ns-color">
          <option value="red">Red</option>
        </NativeSelect>
      </label>,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders options", () => {
    render(
      <label htmlFor="ns-fruit">
        Fruit
        <NativeSelect id="ns-fruit">
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
        </NativeSelect>
      </label>,
    );
    expect(screen.getByRole("option", { name: "Apple" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Banana" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <label htmlFor="ns-size">
        Size
        <NativeSelect id="ns-size">
          <option value="sm">Small</option>
          <option value="lg">Large</option>
        </NativeSelect>
      </label>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("NativeSelect parity with SelectTrigger", () => {
  const hasClass = (el: Element | null, token: string) =>
    Boolean(el?.getAttribute("class")?.split(/\s+/).includes(token));

  it("draws the select from Input's field tokens and focus recipe", () => {
    render(
      <NativeSelect aria-label="Fruit">
        <option>Apple</option>
      </NativeSelect>,
    );
    const select = screen.getByRole("combobox", { name: "Fruit" });
    expect(hasClass(select, "[--field-edge:var(--qx-component-input-border)]")).toBe(true);
    expect(hasClass(select, "h-(--qx-component-input-height)")).toBe(true);
    expect(hasClass(select, "focus-visible:focus-ring-field")).toBe(true);
    expect(select.className).not.toMatch(/ring-offset-2|dark:bg-input/);
  });

  it("uses 16px text on small screens, so iOS does not zoom on focus", () => {
    render(
      <NativeSelect aria-label="Fruit">
        <option>Apple</option>
      </NativeSelect>,
    );
    const select = screen.getByRole("combobox", { name: "Fruit" });
    expect(hasClass(select, "text-base")).toBe(true);
    expect(hasClass(select, "md:text-sm")).toBe(true);
  });

  // The wrapper used to be full-width whatever the select's width, so `className="w-56"` left
  // the chevron stranded at the far end of the row.
  it("lets a sized select shrink its wrapper, so the chevron stays at the select's end", () => {
    const { container } = render(
      <NativeSelect aria-label="Sized" className="w-56">
        <option>Apple</option>
      </NativeSelect>,
    );
    const select = screen.getByRole("combobox", { name: "Sized" });
    expect(hasClass(select, "w-56")).toBe(true);
    expect(hasClass(select, "w-full")).toBe(false);
    const wrapper = container.querySelector("[data-slot=native-select-wrapper]");
    expect(hasClass(wrapper, "has-[select:not(.w-full)]:w-fit")).toBe(true);
  });

  it("keeps the chevron decorative and dims it with the select", () => {
    const { container } = render(
      <NativeSelect aria-label="Off" disabled>
        <option>Apple</option>
      </NativeSelect>,
    );
    const icon = container.querySelector("[data-slot=native-select-icon]");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(hasClass(icon, "peer-disabled:opacity-disabled")).toBe(true);
    expect(screen.getByRole("combobox", { name: "Off" })).toBeDisabled();
  });

  it("forwards aria-invalid and required", () => {
    render(
      <NativeSelect aria-label="Region" aria-invalid required defaultValue="">
        <option value="">Select a region</option>
        <option value="in">India</option>
      </NativeSelect>,
    );
    const select = screen.getByRole("combobox", { name: "Region" });
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toBeRequired();
    expect(select).toBeInvalid();
  });
});
