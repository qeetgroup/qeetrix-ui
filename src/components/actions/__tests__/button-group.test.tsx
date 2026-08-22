import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ButtonGroup, ButtonGroupItem } from "@/components/actions/button-group";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("ButtonGroup", () => {
  it("renders with role='group'", () => {
    render(
      <ButtonGroup aria-label="Alignment">
        <ButtonGroupItem>Left</ButtonGroupItem>
        <ButtonGroupItem>Right</ButtonGroupItem>
      </ButtonGroup>,
    );
    expect(screen.getByRole("group", { name: "Alignment" })).toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <ButtonGroup>
        <ButtonGroupItem>One</ButtonGroupItem>
        <ButtonGroupItem>Two</ButtonGroupItem>
      </ButtonGroup>,
    );
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <ButtonGroup aria-label="View options">
        <ButtonGroupItem>Grid</ButtonGroupItem>
        <ButtonGroupItem>List</ButtonGroupItem>
      </ButtonGroup>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
