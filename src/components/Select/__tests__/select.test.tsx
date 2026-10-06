import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/Select/select";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function SelectExample({
  value,
  onValueChange,
}: {
  value?: string;
  onValueChange?: (value: string | null) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label="Fruit">
        <SelectValue placeholder="Pick a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("renders the trigger combobox", () => {
    render(<SelectExample />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows placeholder when no value is selected", () => {
    render(<SelectExample />);
    expect(screen.getByText("Pick a fruit")).toBeInTheDocument();
  });

  it("shows options in the listbox when open=true", () => {
    render(
      <Select open>
        <SelectTrigger aria-label="Color">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="red">Red</SelectItem>
          <SelectItem value="blue">Blue</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
  });

  it("renders in disabled state", () => {
    render(
      <Select disabled>
        <SelectTrigger aria-label="Disabled select">
          <SelectValue placeholder="Disabled" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("has no axe violations on the trigger", async () => {
    const { container } = render(<SelectExample />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  // Regression coverage for qeetgroup/qeetrix#30: the closed trigger must render
  // the selected option's label, not its raw value, without any call-site changes.
  describe("selected-label resolution in the closed trigger (#30)", () => {
    it("shows the option's label, not its raw value", () => {
      render(
        <Select value="ap-south-1">
          <SelectTrigger aria-label="Region">
            <SelectValue placeholder="Select a region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ap-south-1">Asia Pacific (Mumbai)</SelectItem>
            <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
          </SelectContent>
        </Select>,
      );
      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveTextContent("Asia Pacific (Mumbai)");
      expect(trigger).not.toHaveTextContent("ap-south-1");
    });

    it("resolves labels for `.map()`-rendered items", () => {
      const languages = [
        { value: "en", label: "English" },
        { value: "fr", label: "Français" },
      ];
      render(
        <Select value="fr">
          <SelectTrigger aria-label="Language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      );
      expect(screen.getByRole("combobox")).toHaveTextContent("Français");
    });

    it("resolves labels for grouped items", () => {
      render(
        <Select value="lion">
          <SelectTrigger aria-label="Animal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Pets</SelectLabel>
              <SelectItem value="cat">Cat</SelectItem>
              <SelectItem value="dog">Dog</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Wild</SelectLabel>
              <SelectItem value="lion">Lion</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>,
      );
      expect(screen.getByRole("combobox")).toHaveTextContent("Lion");
    });

    it("resolves labels made of non-string nodes (icon + text)", () => {
      render(
        <Select value="en">
          <SelectTrigger aria-label="Language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">
              <span aria-hidden>🇬🇧</span>English
            </SelectItem>
          </SelectContent>
        </Select>,
      );
      expect(screen.getByRole("combobox")).toHaveTextContent("English");
    });

    it("lets an explicit `items` prop win over the derived map", () => {
      render(
        <Select value="en" items={{ en: "Explicit English" }}>
          <SelectTrigger aria-label="Language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">Derived English</SelectItem>
          </SelectContent>
        </Select>,
      );
      expect(screen.getByRole("combobox")).toHaveTextContent("Explicit English");
    });

    it("lets a `SelectValue` function child win over the derived map", () => {
      render(
        <Select value="en">
          <SelectTrigger aria-label="Language">
            <SelectValue>{(value) => (value === "en" ? "Via function child" : "?")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">Derived English</SelectItem>
          </SelectContent>
        </Select>,
      );
      expect(screen.getByRole("combobox")).toHaveTextContent("Via function child");
    });
  });
});

describe("Select styling contract", () => {
  const hasClass = (el: Element | null, token: string) =>
    Boolean(el?.className.split(/\s+/).includes(token));

  it("draws the trigger from Input's field tokens and focus recipe", () => {
    render(<SelectExample />);
    const trigger = screen.getByRole("combobox");
    expect(hasClass(trigger, "[--field-edge:var(--qx-component-input-border)]")).toBe(true);
    expect(hasClass(trigger, "bg-(--qx-component-input-background)")).toBe(true);
    expect(hasClass(trigger, "rounded-(--qx-component-input-corner)")).toBe(true);
    expect(hasClass(trigger, "focus-visible:focus-ring-field")).toBe(true);
    expect(trigger.className).not.toMatch(/ring-ring\/disabled|dark:bg-input/);
  });

  it("follows density at both sizes — sm is one step under the control height, not 28px", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Small" size="sm">
          <SelectValue placeholder="Small" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox");
    expect(
      hasClass(trigger, "data-[size=sm]:h-[calc(var(--qx-component-input-height)-0.25rem)]"),
    ).toBe(true);
    expect(trigger.className).not.toMatch(/data-\[size=sm\]:h-7/);
  });

  it("forwards aria-invalid to the trigger", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Region" aria-invalid>
          <SelectValue placeholder="Required" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
  });

  it("marks the selected option and draws its check", () => {
    render(
      <Select open value="banana">
        <SelectTrigger aria-label="Fruit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>,
    );
    const banana = screen.getByRole("option", { name: "Banana" });
    expect(banana).toHaveAttribute("aria-selected", "true");
    expect(banana).toHaveAttribute("data-selected");
    expect(banana.querySelector("[data-slot=select-item-indicator]")).not.toBeNull();
    expect(screen.getByRole("option", { name: "Apple" })).not.toHaveAttribute("data-selected");
  });

  // Base UI writes `data-selected=""`; shadcn's `data-selected` custom variant matches only
  // `="true"`. Written the short way, the selected tint would silently never apply.
  it("styles selection with the attribute-presence variant Base UI's markup matches", () => {
    render(
      <Select open value="a">
        <SelectTrigger aria-label="Pick">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    const option = screen.getByRole("option", { name: "A" });
    expect(hasClass(option, "data-[selected]:bg-brand-subtle")).toBe(true);
    expect(option.className).not.toMatch(/(^|\s)data-selected:/);
  });

  it("has no axe violations when open with a selection and a disabled option", async () => {
    render(
      <Select open value="a">
        <SelectTrigger aria-label="Pick">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Letters</SelectLabel>
            <SelectItem value="a">A</SelectItem>
            <SelectItem value="b" disabled>
              B
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );
    expect(
      await axe(document.body, {
        rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
      }),
    ).toHaveNoViolations();
  });
});
