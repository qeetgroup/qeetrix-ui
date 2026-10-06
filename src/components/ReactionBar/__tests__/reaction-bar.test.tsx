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

describe("ReactionBar enterprise behaviour", () => {
  it("is a named group", () => {
    render(<ReactionBar reactions={[{ emoji: "👍", count: 1 }]} />);
    expect(screen.getByRole("group", { name: "Reactions" })).toBeInTheDocument();
  });

  it("exposes pressed state for reactions the viewer has not made", () => {
    render(<ReactionBar reactions={[{ emoji: "👍", count: 2 }]} />);
    expect(screen.getByRole("button", { name: "👍 2", pressed: false })).toBeInTheDocument();
  });

  it("uses a spoken name for the emoji when given", () => {
    render(<ReactionBar reactions={[{ emoji: "👍", count: 3, label: "thumbs up" }]} />);
    expect(screen.getByRole("button", { name: "thumbs up 3" })).toBeInTheDocument();
  });

  it("describes who reacted", () => {
    render(
      <ReactionBar
        reactions={[
          { emoji: "✅", count: 5, users: ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Mary"] },
          { emoji: "👀", count: 2, users: ["Ada Lovelace", "Grace Hopper"] },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "✅ 5" })).toHaveAccessibleDescription(
      "Ada Lovelace, Grace Hopper, Alan Turing and 2 others",
    );
    expect(screen.getByRole("button", { name: "👀 2" })).toHaveAccessibleDescription(
      "Ada Lovelace and Grace Hopper",
    );
  });

  it("formats large counts compactly but names the exact count", () => {
    render(<ReactionBar reactions={[{ emoji: "🎉", count: 1200 }]} locale="en-US" />);
    const button = screen.getByRole("button", { name: "🎉 1200" });
    expect(button).toHaveTextContent("1.2K");
  });

  it("renders read-only reactions without controls", () => {
    render(<ReactionBar readOnly reactions={[{ emoji: "👍", count: 3, reacted: true }]} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText("👍 3")).toHaveClass("sr-only");
  });

  it("disables every control", () => {
    render(<ReactionBar disabled reactions={[{ emoji: "👍", count: 3 }]} />);
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });

  it("offers a restrained default palette and reflects existing reactions in it", () => {
    const onToggle = vi.fn();
    render(
      <ReactionBar reactions={[{ emoji: "✅", count: 1, reacted: true }]} onToggle={onToggle} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add reaction" }));
    expect(screen.getByRole("dialog", { name: "Add reaction" })).toBeInTheDocument();
    const options = screen.getAllByRole("button", { name: /^React / });
    expect(options).toHaveLength(8);
    expect(screen.getByRole("button", { name: "React ✅" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "React 👀" }));
    expect(onToggle).toHaveBeenCalledWith("👀");
  });

  it("moves through the picker with the arrow keys", () => {
    render(<ReactionBar reactions={[]} choices={["👍", "👎", "✅", "👀", "🎉"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Add reaction" }));
    const first = screen.getByRole("button", { name: "React 👍" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "React 👎" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowLeft" });
    expect(first).toHaveFocus();
    // Four columns: down from the first option lands on the fifth.
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: "React 🎉" })).toHaveFocus();
    // Past the edge, focus stays put rather than wrapping somewhere surprising.
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: "React 🎉" })).toHaveFocus();
  });

  it("has no axe violations with users, reacted and read-only reactions", async () => {
    const { container } = render(
      <>
        <ReactionBar
          reactions={[{ emoji: "✅", count: 2, reacted: true, users: ["Ada", "Grace"] }]}
        />
        <ReactionBar readOnly reactions={[{ emoji: "👍", count: 1 }]} />
      </>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
