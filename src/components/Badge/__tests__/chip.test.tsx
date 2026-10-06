import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Chip, ChipGroup } from "@/components/Badge/chip";
import { DirectionProvider } from "@/providers/direction-provider";

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

  it("marks selection with the Qeet selected vocabulary and a check, not a solid fill", () => {
    const { container } = render(
      <ChipGroup multiple defaultValue={["a"]}>
        <Chip value="a">Alpha</Chip>
        <Chip value="b">Beta</Chip>
      </ChipGroup>,
    );
    const selected = screen.getByRole("button", { name: "Alpha", pressed: true });
    expect(selected).toHaveClass("bg-brand-subtle", "border-border-brand", "text-foreground");
    expect(selected).not.toHaveClass("bg-primary");
    // Selection has a non-colour cue: a check glyph on the selected chip only.
    const checks = container.querySelectorAll('[data-slot="chip-check"]');
    expect(checks).toHaveLength(1);
    expect(selected).toContainElement(checks[0] as HTMLElement);
  });

  it("keeps a caller's icon instead of the check", () => {
    render(
      <Chip selected icon={<svg data-testid="own" />}>
        Pinned
      </Chip>,
    );
    const chip = screen.getByRole("button", { name: "Pinned" });
    expect(screen.getByTestId("own")).toBeInTheDocument();
    expect(chip.querySelector('[data-slot="chip-check"]')).toBeNull();
  });

  it("uses the foundation focus recipe instead of the translucent ring", () => {
    render(<Chip selected={false}>Filter</Chip>);
    const chip = screen.getByRole("button", { name: "Filter" });
    expect(chip).toHaveClass("focus-visible:focus-ring");
    expect(chip.className).not.toContain("ring-ring/disabled");
  });

  it("is a single tab stop with arrow-key selection in a radio group", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ChipGroup defaultValue="b" onValueChange={onValueChange} aria-label="Range">
        <Chip value="a">24h</Chip>
        <Chip value="b">7d</Chip>
        <Chip value="c">30d</Chip>
      </ChipGroup>,
    );
    const [a, b, c] = screen.getAllByRole("radio");
    expect(screen.getByRole("radiogroup", { name: "Range" })).toBeInTheDocument();
    expect(b).toHaveAttribute("tabindex", "0");
    expect(a).toHaveAttribute("tabindex", "-1");
    expect(c).toHaveAttribute("tabindex", "-1");

    await user.tab();
    expect(b).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(c).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith("c");
    await user.keyboard("{ArrowRight}");
    expect(a).toHaveFocus();
    await user.keyboard("{End}");
    expect(c).toHaveFocus();
    await user.keyboard("{Home}");
    expect(a).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith("a");
  });

  it("mirrors the arrow keys under RTL", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider direction="rtl">
        <ChipGroup defaultValue="a">
          <Chip value="a">One</Chip>
          <Chip value="b">Two</Chip>
        </ChipGroup>
      </DirectionProvider>,
    );
    const [one, two] = screen.getAllByRole("radio");
    await user.tab();
    expect(one).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(two).toHaveFocus();
  });

  it("fires onRemove from a removable chip", () => {
    const onRemove = vi.fn();
    render(<Chip onRemove={onRemove}>Removable</Chip>);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("gives the remove glyph a 24px hit area and dims a disabled removable chip", () => {
    const { container } = render(
      <Chip disabled onRemove={() => {}}>
        Tag
      </Chip>,
    );
    const remove = screen.getByRole("button", { name: "Remove" });
    expect(remove).toHaveClass("after:-inset-1", "focus-visible:focus-ring");
    expect(remove).toBeDisabled();
    expect(container.querySelector('[data-slot="chip"]')).toHaveAttribute("data-disabled", "true");
  });

  it("does not show a hover affordance on a static chip", () => {
    render(<Chip>Static</Chip>);
    expect(screen.getByText("Static")).toHaveClass("hover:bg-transparent");
  });

  it("has no axe violations in a group", async () => {
    const { container } = render(
      <ChipGroup defaultValue="a" aria-label="Choice">
        <Chip value="a">Alpha</Chip>
        <Chip value="b">Beta</Chip>
      </ChipGroup>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations for removable and multi-select chips", async () => {
    const { container } = render(
      <>
        <ChipGroup multiple defaultValue={["a"]} aria-label="Filters">
          <Chip value="a">Alpha</Chip>
          <Chip value="b">Beta</Chip>
        </ChipGroup>
        <Chip onRemove={() => {}}>Tag</Chip>
        <Chip selected onClick={() => {}} onRemove={() => {}}>
          Both
        </Chip>
      </>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
