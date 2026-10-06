import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CountryPicker } from "@/components/CountryPicker/country-picker";
import { Field, FieldError, FieldLabel } from "@/components/Input/field";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

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

describe("CountryPicker enterprise behaviour", () => {
  const optionValues = () =>
    (screen.getAllByRole("option") as HTMLOptionElement[]).map((o) => o.value);

  it("works uncontrolled from defaultValue", () => {
    render(<CountryPicker defaultValue="IN" locale="en" />);
    const select = screen.getByRole("combobox", { name: "Country" }) as HTMLSelectElement;
    expect(select.value).toBe("IN");
    fireEvent.change(select, { target: { value: "FR" } });
    expect(select.value).toBe("FR");
  });

  it("submits the code under `name`, offers autofill, and enforces `required` natively", () => {
    render(
      <form aria-label="billing">
        <CountryPicker name="country" required defaultValue="DE" locale="en" />
      </form>,
    );
    const select = screen.getByRole("combobox", { name: "Country" });
    expect(select).toHaveAttribute("autocomplete", "country");
    expect(select).toBeRequired();
    const data = new FormData(screen.getByRole("form", { name: "billing" }) as HTMLFormElement);
    expect(data.get("country")).toBe("DE");
  });

  it("restricts the list with `countries` and pins `priority` codes first", () => {
    render(
      <CountryPicker value="" locale="en" countries={["US", "IN", "GB", "AE"]} priority={["IN"]} />,
    );
    // Placeholder, then the pinned code, then the rest by localised name.
    expect(optionValues()).toEqual(["", "IN", "AE", "GB", "US"]);
  });

  it("sorts by the display locale's collation", () => {
    render(<CountryPicker value="" locale="de" countries={["AT", "DE", "US"]} />);
    // Deutschland, Österreich, Vereinigte Staaten — Ö sorts with O in German.
    expect(optionValues()).toEqual(["", "DE", "AT", "US"]);
  });

  it("still shows a value that is outside the list", () => {
    render(<CountryPicker value="JP" locale="en" countries={["US"]} />);
    expect((screen.getByRole("combobox", { name: "Country" }) as HTMLSelectElement).value).toBe(
      "JP",
    );
  });

  it("takes its label and invalid state from a Field", () => {
    render(
      <Field>
        <FieldLabel>Country of residence</FieldLabel>
        <CountryPicker value="" locale="en" />
        <FieldError>Choose a country.</FieldError>
      </Field>,
    );
    const select = screen.getByRole("combobox", { name: "Country of residence" });
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).not.toHaveAttribute("aria-label");
  });

  it("matches SelectTrigger: drawn as a Qeet field", () => {
    render(<CountryPicker value="" locale="en" />);
    const select = screen.getByRole("combobox", { name: "Country" });
    expect(select.className.split(/\s+/)).toEqual(
      expect.arrayContaining([
        "[--field-edge:var(--qx-component-input-border)]",
        "focus-visible:focus-ring-field",
      ]),
    );
  });
});

describe("CountryPicker searchable", () => {
  it("renders a combobox you can type into, matching localised name, English name and code", async () => {
    const onChange = vi.fn();
    render(
      <CountryPicker searchable locale="de" onChange={onChange} countries={["DE", "IN", "FR"]} />,
    );
    const input = screen.getByRole("combobox", { name: "Country" });
    expect(input.tagName).toBe("INPUT");

    await userEvent.type(input, "Germany");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["DeutschlandDE"]);

    await userEvent.clear(input);
    await userEvent.type(input, "fr");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toContain("FrankreichFR");

    fireEvent.click(screen.getByRole("option", { name: /Frankreich/ }));
    expect(onChange).toHaveBeenCalledWith("FR");
  });

  it("has no axe violations", async () => {
    const { container } = render(<CountryPicker searchable value="IN" locale="en" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
