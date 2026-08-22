import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ReactionBar } from "@/components/ReactionBar/reaction-bar";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("ReactionBar", () => {
  it("renders reaction pills with a pressed state", () => {
    render(<ReactionBar reactions={[{ emoji: "👍", count: 3, reacted: true }]} />);
    expect(screen.getByRole("button", { name: "👍 3", pressed: true })).toBeInTheDocument();
  });

  it("toggles a reaction", () => {
    const onToggle = vi.fn();
    render(<ReactionBar reactions={[{ emoji: "❤️", count: 1 }]} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "❤️ 1" }));
    expect(onToggle).toHaveBeenCalledWith("❤️");
  });

  it("has no axe violations", async () => {
    const { container } = render(<ReactionBar reactions={[{ emoji: "🎉", count: 2 }]} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
