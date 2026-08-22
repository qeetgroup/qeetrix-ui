import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Kbd, KbdGroup } from "@/components/utility/kbd";

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

  it("has no axe violations", async () => {
    const { container } = render(<Kbd>Esc</Kbd>);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
