import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarLink,
  ToolbarSeparator,
  ToolbarSpacer,
} from "@/components/Toolbar/toolbar";

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

describe("Toolbar structure", () => {
  it("draws a horizontal toolbar's separator as a vertical rule", () => {
    render(<SampleToolbar />);
    const sep = screen.getByRole("separator");
    // Base UI orients the separator perpendicular to the toolbar.
    expect(sep).toHaveAttribute("aria-orientation", "vertical");
    expect(sep.className).toContain("data-[orientation=vertical]:w-px");
    // It stretches to the row instead of holding a fixed 20px, so it follows density.
    expect(sep).toHaveClass("self-stretch");
  });

  it("offers a chrome-less variant for table and card headers", () => {
    render(
      <Toolbar aria-label="Table" variant="ghost">
        <ToolbarButton>Filter</ToolbarButton>
      </Toolbar>,
    );
    const toolbar = screen.getByRole("toolbar", { name: "Table" });
    expect(toolbar).toHaveAttribute("data-variant", "ghost");
    expect(toolbar).not.toHaveClass("border");
  });

  it("wraps rather than overflowing a narrow panel", () => {
    render(<SampleToolbar />);
    expect(screen.getByRole("toolbar")).toHaveClass("flex-wrap", "min-w-0");
  });

  it("pushes what follows a spacer to the inline end, without adding a stop", () => {
    const { container } = render(
      <Toolbar aria-label="Header">
        <ToolbarButton>Filter</ToolbarButton>
        <ToolbarSpacer />
        <ToolbarButton>Export</ToolbarButton>
      </Toolbar>,
    );
    const spacer = container.querySelector('[data-slot="toolbar-spacer"]');
    expect(spacer).toHaveAttribute("aria-hidden", "true");
    expect(spacer).toHaveClass("flex-1");
    expect(spacer).not.toHaveAttribute("tabindex");
  });
});

describe("ToolbarButton", () => {
  it("speaks the Button family's language: ghost by default, Button sizes and variants", () => {
    render(
      <Toolbar aria-label="Actions">
        <ToolbarButton>Insert</ToolbarButton>
        <ToolbarButton variant="default">Publish</ToolbarButton>
        <ToolbarButton size="icon" aria-label="Settings">
          <svg aria-hidden />
        </ToolbarButton>
      </Toolbar>,
    );
    const insert = screen.getByRole("button", { name: "Insert" });
    expect(insert).toHaveAttribute("data-variant", "ghost");
    expect(insert.className).toContain("focus-visible:focus-ring");
    expect(insert.className).not.toContain("ring-ring/disabled");
    expect(screen.getByRole("button", { name: "Publish" })).toHaveAttribute(
      "data-variant",
      "default",
    );
    expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("data-size", "icon");
  });

  it("marks a pressed item with the Qeet selected vocabulary", () => {
    render(
      <Toolbar aria-label="Format">
        <ToolbarButton aria-label="Bold" aria-pressed="true">
          B
        </ToolbarButton>
      </Toolbar>,
    );
    const cls = screen.getByRole("button", { name: "Bold" }).className;
    expect(cls).toContain("aria-pressed:bg-brand-subtle");
    expect(cls).toContain("aria-pressed:inset-ring-border-brand");
  });

  it("keeps a disabled item focusable, as the toolbar pattern asks", () => {
    render(
      <Toolbar aria-label="Format">
        <ToolbarButton aria-label="Bold">B</ToolbarButton>
        <ToolbarButton aria-label="Italic" disabled>
          I
        </ToolbarButton>
      </Toolbar>,
    );
    const italic = screen.getByRole("button", { name: "Italic" });
    expect(italic).toHaveAttribute("aria-disabled", "true");
    expect(italic).not.toBeDisabled();
  });

  it("styles a toolbar link as a link", () => {
    render(
      <Toolbar aria-label="Nav">
        <ToolbarLink href="/docs">Docs</ToolbarLink>
      </Toolbar>,
    );
    expect(screen.getByRole("link", { name: "Docs" })).toHaveClass("text-link");
  });
});

describe("Toolbar keyboard", () => {
  it("is one tab stop; arrows move between items and wrap", async () => {
    const user = userEvent.setup();
    render(<SampleToolbar />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Bold" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Italic" })).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("button", { name: "Bold" })).toHaveFocus();
  });

  it("jumps to the first and last item with Home and End", async () => {
    const user = userEvent.setup();
    render(<SampleToolbar />);
    await user.tab();
    await user.keyboard("{End}");
    expect(screen.getByRole("button", { name: "Underline" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("button", { name: "Bold" })).toHaveFocus();
  });

  it("leaves Home and End to a text field inside the toolbar", () => {
    render(
      <Toolbar aria-label="Search">
        <ToolbarButton>Filter</ToolbarButton>
        <input aria-label="Query" />
      </Toolbar>,
    );
    const input = screen.getByRole("textbox", { name: "Query" });
    input.focus();
    fireEvent.keyDown(input, { key: "Home" });
    expect(input).toHaveFocus();
  });
});
