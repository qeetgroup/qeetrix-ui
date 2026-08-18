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
} from "@/components/ui/select";

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
