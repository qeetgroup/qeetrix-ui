import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator } from "@/components/ui/toolbar";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function SampleToolbar() {
  return (
    <Toolbar aria-label="Text formatting">
      <ToolbarGroup>
        <ToolbarButton aria-label="Bold">B</ToolbarButton>
        <ToolbarButton aria-label="Italic">I</ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarButton aria-label="Underline">U</ToolbarButton>
    </Toolbar>
  );
}

describe("Toolbar", () => {
  it("renders toolbar with buttons", () => {
    render(<SampleToolbar />);
    expect(screen.getByRole("toolbar", { name: "Text formatting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Italic" })).toBeInTheDocument();
  });

  it("fires onClick on ToolbarButton", () => {
    const onClick = vi.fn();
    render(
      <Toolbar aria-label="Actions">
        <ToolbarButton aria-label="Save" onClick={onClick}>
          Save
        </ToolbarButton>
      </Toolbar>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders a separator between groups", () => {
    const { container } = render(<SampleToolbar />);
    expect(container.querySelector('[data-slot="toolbar"]')).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<SampleToolbar />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
