import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Kbd, KbdGroup } from "@/components/Kbd/kbd";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Kbd", () => {
  it("renders shortcut glyphs", () => {
    render(
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );
    expect(screen.getByText("⌘")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("nests the keys of a combination inside an outer <kbd>, as HTML specifies", () => {
    const { container } = render(
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );
    const group = container.querySelector('[data-slot="kbd-group"]');
    expect(group?.tagName).toBe("KBD");
    expect(group?.querySelectorAll('kbd[data-slot="kbd"]')).toHaveLength(2);
  });

  it("gives a symbol key a spoken name and hides the glyph from assistive technology", () => {
    render(<Kbd label="Command">⌘</Kbd>);
    expect(screen.getByText("⌘")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Command")).toHaveClass("sr-only");
  });

  it("renders a word key as plain text when no label is given", () => {
    render(<Kbd>Esc</Kbd>);
    const key = screen.getByText("Esc");
    expect(key).toHaveAttribute("data-slot", "kbd");
    expect(key.querySelector("[aria-hidden]")).toBeNull();
  });

  it("keeps the micro type size when a consumer recolours the key", () => {
    // Regression guard: the size must survive `cn()` next to a text colour.
    render(<Kbd className="text-foreground">K</Kbd>);
    const key = screen.getByText("K");
    expect(key).toHaveClass("text-(length:--qx-component-kbd-font-size)", "text-foreground");
    expect(key).toHaveClass("font-ui");
  });

  it("paints the cap from its component tokens", () => {
    render(<Kbd>K</Kbd>);
    expect(screen.getByText("K")).toHaveClass(
      "bg-(--qx-component-kbd-background)",
      "border-(--qx-component-kbd-border)",
      "text-(--qx-component-kbd-foreground)",
      "shadow-(--qx-component-kbd-elevation)",
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(<Kbd>Esc</Kbd>);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations for a labelled combination", async () => {
    const { container } = render(
      <p>
        Press{" "}
        <KbdGroup>
          <Kbd label="Command">⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>{" "}
        to search.
      </p>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
