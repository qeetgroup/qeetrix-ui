/**
 * Real-browser proof for focus containment (FOCUS-001).
 *
 * jsdom does not implement sequential focus navigation: pressing Tab moves nothing, so every
 * Tab assertion in this repository runs through `@testing-library/user-event`, which computes
 * the next element itself from its own idea of the tab order. That is a test of user-event, not
 * of the trap. Here the browser computes the tab order and the trap has to beat it.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { FocusTrap } from "@/components/FocusTrap/focus-trap";

function Scene({ active }: { active: boolean }) {
  return (
    <>
      <button type="button">Before</button>
      <FocusTrap active={active}>
        <button type="button">First</button>
        <button type="button">Middle</button>
        <button type="button">Last</button>
      </FocusTrap>
      <button type="button">After</button>
    </>
  );
}

const button = (name: string) => screen.getByRole("button", { name });

describe("FocusTrap — real sequential focus navigation", () => {
  it("wraps a real Tab from the last element back to the first", async () => {
    render(<Scene active />);

    button("Last").focus();
    expect(document.activeElement).toBe(button("Last"));

    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(button("First"));
    expect(document.activeElement).not.toBe(button("After"));
  });

  it("wraps a real Shift+Tab from the first element to the last", async () => {
    render(<Scene active />);

    button("First").focus();
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    expect(document.activeElement).toBe(button("Last"));
  });

  it("lets the browser take focus out when the trap is inactive", async () => {
    // The control case. Without it, the two assertions above could be describing a browser
    // that never moves focus on Tab rather than a trap that puts it back.
    render(<Scene active={false} />);

    button("Last").focus();
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(button("After"));
  });
});
