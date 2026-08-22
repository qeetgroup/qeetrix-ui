import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CountryPicker } from "@/components/CountryPicker/country-picker";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("CountryPicker", () => {
  it("renders a combobox with the default aria-label", () => {
    render(<CountryPicker value="" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Country" })).toBeInTheDocument();
  });

  it("renders with a custom aria-label", () => {
    render(<CountryPicker value="" onChange={vi.fn()} ariaLabel="Nationality" />);
    expect(screen.getByRole("combobox", { name: "Nationality" })).toBeInTheDocument();
  });

  it("shows placeholder option when value is empty", () => {
    render(<CountryPicker value="" onChange={vi.fn()} placeholder="Choose country" />);
    expect(screen.getByText("Choose country")).toBeInTheDocument();
  });

  it("fires onChange with the selected alpha-2 code", () => {
    const onChange = vi.fn();
    render(<CountryPicker value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "DE" } });
    expect(onChange).toHaveBeenCalledWith("DE");
  });

  it("is disabled when disabled=true", () => {
    render(<CountryPicker value="" onChange={vi.fn()} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<CountryPicker value="US" onChange={vi.fn()} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
