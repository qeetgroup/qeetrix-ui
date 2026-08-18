import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Autocomplete } from "@/components/ui/autocomplete";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Autocomplete", () => {
  it("renders an input with an accessible name", () => {
    render(<Autocomplete aria-label="Search fruit" items={["Apple", "Banana"]} />);
    expect(screen.getByLabelText("Search fruit")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Autocomplete aria-label="Search" items={["Apple"]} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
