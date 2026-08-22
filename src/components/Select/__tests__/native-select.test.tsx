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
