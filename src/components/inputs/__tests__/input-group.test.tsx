import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/inputs/input-group";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function Example() {
  return (
    <InputGroup>
      <InputGroupAddon>https://</InputGroupAddon>
      <InputGroupInput aria-label="Site URL" placeholder="example.com" />
    </InputGroup>
  );
}

describe("InputGroup", () => {
  it("renders an addon alongside an editable input", () => {
    render(<Example />);
    expect(screen.getByText("https://")).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "Site URL" });
    fireEvent.change(input, { target: { value: "qeet.in" } });
    expect(input).toHaveValue("qeet.in");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Example />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
