import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ButtonGroup, ButtonGroupItem } from "@/components/Button/button-group";

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

describe("ButtonGroup layout", () => {
  it("overlaps borders on the inline-start side, so the seam mirrors under RTL", () => {
    render(
      <ButtonGroup aria-label="Split">
        <ButtonGroupItem>Save</ButtonGroupItem>
        <ButtonGroupItem>More</ButtonGroupItem>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group", { name: "Split" });
    expect(group.className).toContain("[&>*:not(:first-child)]:-ms-px");
    expect(group.className).not.toContain("-ml-px");
  });

  it("splits filled items with a hairline and lifts a focused item above its neighbours", () => {
    render(
      <ButtonGroup aria-label="Split">
        <ButtonGroupItem>Save</ButtonGroupItem>
        <ButtonGroupItem>More</ButtonGroupItem>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group", { name: "Split" });
    expect(group.className).toContain("border-s-current/20");
    expect(group.className).toContain("*:focus-visible:z-10");
    // The divider keys off the item's variant.
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("data-variant", "default");
  });
});
