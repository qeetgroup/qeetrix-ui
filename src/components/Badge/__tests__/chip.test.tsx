import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Chip, ChipGroup } from "@/components/Badge/chip";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Chip", () => {
  it("selects within a single-select group (radio semantics)", () => {
    const onValueChange = vi.fn();
    render(
      <ChipGroup onValueChange={onValueChange}>
        <Chip value="a">Alpha</Chip>
        <Chip value="b">Beta</Chip>
      </ChipGroup>,
    );
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    fireEvent.click(radios[1]);
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("multi-select toggles with pressed semantics", () => {
    const onValueChange = vi.fn();
    render(
      <ChipGroup multiple onValueChange={onValueChange}>
        <Chip value="a">Alpha</Chip>
        <Chip value="b">Beta</Chip>
      </ChipGroup>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Alpha", pressed: false }));
    expect(onValueChange).toHaveBeenCalledWith(["a"]);
  });

  it("fires onRemove from a removable chip", () => {
    const onRemove = vi.fn();
    render(<Chip onRemove={onRemove}>Removable</Chip>);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("has no axe violations in a group", async () => {
    const { container } = render(
      <ChipGroup defaultValue="a">
        <Chip value="a">Alpha</Chip>
        <Chip value="b">Beta</Chip>
      </ChipGroup>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
