import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/Input/input-group";

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

  it("defaults addons to inline and supports a segment variant", () => {
    render(
      <InputGroup>
        <InputGroupAddon variant="segment">https://</InputGroupAddon>
        <InputGroupInput aria-label="Site" />
        <InputGroupAddon align="end">.qeet.in</InputGroupAddon>
      </InputGroup>,
    );
    expect(screen.getByText("https://")).toHaveAttribute("data-variant", "segment");
    expect(screen.getByText(".qeet.in")).toHaveAttribute("data-variant", "inline");
    expect(screen.getByText(".qeet.in")).toHaveAttribute("data-align", "end");
  });

  it("renders actions as non-submitting, named buttons", () => {
    let submitted = false;
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitted = true;
        }}
      >
        <InputGroup>
          <InputGroupInput aria-label="Search" />
          <InputGroupAddon align="end">
            <InputGroupButton aria-label="Clear search">×</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Clear search" });
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(submitted).toBe(false);
  });

  it("does not clip its children, so an action's focus indicator is never cut off", () => {
    const { container } = render(<Example />);
    expect(container.querySelector("[data-slot=input-group]")?.className).not.toMatch(
      /overflow-hidden/,
    );
  });

  it("has no axe violations with icon, segment and action addons", async () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon variant="segment">https://</InputGroupAddon>
        <InputGroupInput aria-label="Site URL" />
        <InputGroupAddon align="end">
          <InputGroupButton aria-label="Copy URL">⧉</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
