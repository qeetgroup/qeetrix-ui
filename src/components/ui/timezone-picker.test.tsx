import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { getTimezones, TimezonePicker } from "@/components/ui/timezone-picker";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("getTimezones", () => {
  it("returns a non-empty list of IANA zone identifiers", () => {
    const zones = getTimezones();
    expect(Array.isArray(zones)).toBe(true);
    expect(zones.length).toBeGreaterThan(0);
    expect(zones).toContain("America/New_York");
  });
});

describe("TimezonePicker", () => {
  it("renders a combobox with a default accessible name", () => {
    render(<TimezonePicker value="" onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Timezone" })).toBeInTheDocument();
  });

  it("uses the provided ariaLabel", () => {
    render(<TimezonePicker value="" onChange={() => {}} ariaLabel="Home timezone" />);
    expect(screen.getByRole("combobox", { name: "Home timezone" })).toBeInTheDocument();
  });

  it("renders a placeholder option plus one option per zone", () => {
    render(<TimezonePicker value="" onChange={() => {}} placeholder="Pick one" />);
    const options = screen.getAllByRole("option");
    expect(options.length).toBe(getTimezones().length + 1);
    expect(options[0]).toHaveTextContent("Pick one");
  });

  it("reflects the controlled value", () => {
    render(<TimezonePicker value="America/New_York" onChange={() => {}} ariaLabel="TZ" />);
    expect((screen.getByRole("combobox", { name: "TZ" }) as HTMLSelectElement).value).toBe(
      "America/New_York",
    );
  });

  it("calls onChange with the selected zone", () => {
    const onChange = vi.fn();
    render(<TimezonePicker value="" onChange={onChange} ariaLabel="TZ" />);
    fireEvent.change(screen.getByRole("combobox", { name: "TZ" }), {
      target: { value: "America/New_York" },
    });
    expect(onChange).toHaveBeenCalledWith("America/New_York");
  });

  it("respects the disabled state", () => {
    render(<TimezonePicker value="" onChange={() => {}} ariaLabel="TZ" disabled />);
    expect(screen.getByRole("combobox", { name: "TZ" })).toBeDisabled();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <TimezonePicker value="" onChange={() => {}} ariaLabel="Timezone" />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  }, 20000);
});
