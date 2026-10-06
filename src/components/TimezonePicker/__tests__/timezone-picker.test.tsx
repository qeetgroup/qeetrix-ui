import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Field, FieldError, FieldLabel } from "@/components/Input/field";
import { getTimezones, TimezonePicker } from "@/components/TimezonePicker/timezone-picker";

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

describe("getTimezones and UTC", () => {
  it("always offers UTC, even where the runtime lists only regional zones", () => {
    expect(getTimezones()).toContain("UTC");
  });
});

describe("TimezonePicker enterprise behaviour", () => {
  it("labels each zone with its current offset once mounted", () => {
    render(
      <TimezonePicker value="" onChange={() => {}} timezones={["Asia/Kolkata"]} locale="en" />,
    );
    expect(screen.getByRole("option", { name: /Asia\/Kolkata \(GMT\+5:30\)/ })).toBeInTheDocument();
  });

  it("restricts the list with `timezones`", () => {
    render(
      <TimezonePicker
        value=""
        onChange={() => {}}
        timezones={["Europe/London", "Asia/Tokyo"]}
        ariaLabel="TZ"
      />,
    );
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("works uncontrolled and submits under `name`", () => {
    render(
      <form aria-label="profile">
        <TimezonePicker defaultValue="Asia/Tokyo" name="tz" ariaLabel="TZ" />
      </form>,
    );
    const data = new FormData(screen.getByRole("form", { name: "profile" }) as HTMLFormElement);
    expect(data.get("tz")).toBe("Asia/Tokyo");
  });

  it("enforces `required` natively and takes a Field's label and error", () => {
    render(
      <Field>
        <FieldLabel>Home timezone</FieldLabel>
        <TimezonePicker value="" onChange={() => {}} required />
        <FieldError>Choose a timezone.</FieldError>
      </Field>,
    );
    const select = screen.getByRole("combobox", { name: "Home timezone" });
    expect(select).toBeRequired();
    expect(select).toHaveAttribute("aria-invalid", "true");
  });
});

describe("TimezonePicker searchable", () => {
  it("finds a zone by city, by localised name and by offset", async () => {
    render(
      <TimezonePicker
        searchable
        locale="en"
        timezones={["Asia/Kolkata", "America/New_York", "Europe/London"]}
        ariaLabel="TZ"
      />,
    );
    const input = screen.getByRole("combobox", { name: "TZ" });
    const names = () => screen.getAllByRole("option").map((o) => o.textContent ?? "");

    await userEvent.type(input, "kolkata");
    expect(names()).toHaveLength(1);
    expect(names()[0]).toMatch(/^Asia\/Kolkata/);

    await userEvent.clear(input);
    await userEvent.type(input, "India Standard");
    expect(names()[0]).toMatch(/^Asia\/Kolkata/);

    await userEvent.clear(input);
    await userEvent.type(input, "+05:30");
    expect(names()[0]).toMatch(/^Asia\/Kolkata/);
  });

  it("reports the chosen zone", async () => {
    const onChange = vi.fn();
    render(
      <TimezonePicker
        searchable
        locale="en"
        timezones={["Asia/Kolkata", "Europe/London"]}
        ariaLabel="TZ"
        onChange={onChange}
      />,
    );
    await userEvent.type(screen.getByRole("combobox", { name: "TZ" }), "london");
    fireEvent.click(screen.getByRole("option", { name: /Europe\/London/ }));
    expect(onChange).toHaveBeenCalledWith("Europe/London");
  });
});

describe("TimezonePicker legacy zone ids", () => {
  // Chromium lists CLDR's "Asia/Calcutta"; Node lists IANA's "Asia/Kolkata".
  function withSupportedZones(zones: string[], run: () => Promise<void> | void) {
    const original = Object.getOwnPropertyDescriptor(Intl, "supportedValuesOf");
    Object.defineProperty(Intl, "supportedValuesOf", { configurable: true, value: () => zones });
    const restore = () => {
      if (original) Object.defineProperty(Intl, "supportedValuesOf", original);
      else Reflect.deleteProperty(Intl, "supportedValuesOf");
    };
    return Promise.resolve(run()).finally(restore);
  }

  it("normalises CLDR legacy ids to current IANA names", () =>
    withSupportedZones(["Asia/Calcutta", "Europe/Kiev", "UTC"], () => {
      expect(getTimezones()).toEqual(["Asia/Kolkata", "Europe/Kyiv", "UTC"]);
    }));

  it("keeps the old spelling searchable", () =>
    withSupportedZones(["Asia/Calcutta", "Europe/London"], async () => {
      render(<TimezonePicker searchable locale="en" ariaLabel="TZ" />);
      await userEvent.type(screen.getByRole("combobox", { name: "TZ" }), "calcutta");
      const names = screen.getAllByRole("option").map((o) => o.textContent ?? "");
      expect(names).toHaveLength(1);
      expect(names[0]).toMatch(/^Asia\/Kolkata/);
    }));

  it("shows a stored legacy value in place of its modern entry, not beside it", () =>
    withSupportedZones(["Asia/Calcutta", "Europe/London"], () => {
      render(<TimezonePicker value="Asia/Calcutta" onChange={() => {}} ariaLabel="TZ" />);
      const values = (screen.getAllByRole("option") as HTMLOptionElement[]).map((o) => o.value);
      expect(values).toContain("Asia/Calcutta");
      expect(values).not.toContain("Asia/Kolkata");
      expect((screen.getByRole("combobox", { name: "TZ" }) as HTMLSelectElement).value).toBe(
        "Asia/Calcutta",
      );
    }));
});
