import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { FocusTrap } from "@/components/utility/focus-trap";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ThreeButtons() {
  return (
    <FocusTrap active>
      <button type="button">First</button>
      <button type="button">Middle</button>
      <button type="button">Last</button>
    </FocusTrap>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FocusTrap", () => {
  it("Tab from the last focusable wraps to the first when active", async () => {
    const user = userEvent.setup();
    render(<ThreeButtons />);

    const [first, , last] = screen.getAllByRole("button");

    // Move focus to the last button manually.
    last.focus();
    expect(document.activeElement).toBe(last);

    // Tab should be intercepted and wrap around to the first button.
    await user.tab();
    expect(document.activeElement).toBe(first);
  });

  it("Shift+Tab from the first focusable wraps to the last when active", async () => {
    const user = userEvent.setup();
    render(<ThreeButtons />);

    const [first, , last] = screen.getAllByRole("button");

    // The trap auto-focuses the first element on mount; make that explicit.
    first.focus();
    expect(document.activeElement).toBe(first);

    // Shift+Tab should wrap from first → last.
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });

  it("does not trap Tab when active=false — focus moves past the container", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <FocusTrap active={false}>
          <button type="button">First</button>
          <button type="button">Last</button>
        </FocusTrap>
        <button type="button">Outside</button>
      </div>,
    );

    const [, last, outside] = screen.getAllByRole("button");

    // Focus the last button inside the inactive trap.
    last.focus();
    expect(document.activeElement).toBe(last);

    // Tab should advance to the button outside the container, not wrap inside.
    await user.tab();
    expect(document.activeElement).toBe(outside);
  });

  it("does not trap Shift+Tab when active=false — focus moves backwards past the container", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Outside</button>
        <FocusTrap active={false}>
          <button type="button">First</button>
          <button type="button">Last</button>
        </FocusTrap>
      </div>,
    );

    const [outside, first] = screen.getAllByRole("button");

    // Focus the first button inside the inactive trap.
    first.focus();
    expect(document.activeElement).toBe(first);

    // Shift+Tab should move backwards to the button outside, not wrap inside.
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(outside);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <FocusTrap>
        <button type="button">Confirm</button>
        <button type="button">Cancel</button>
      </FocusTrap>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  // ── Containment: the boundary, not just the Tab key ──────────────────────────────────────
  // A trap is reached three ways — the keyboard, a script calling focus(), and the browser
  // moving focus after the focused node is removed. All three have to end up inside.

  it("pulls focus back when a script focuses something behind the trap", () => {
    render(
      <div>
        <button type="button">Behind</button>
        <FocusTrap active>
          <button type="button">Inside</button>
        </FocusTrap>
      </div>,
    );

    const behind = screen.getByRole("button", { name: "Behind" });
    behind.focus();

    expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus();
  });

  it("contains Tab pressed while focus is already outside the trap", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <FocusTrap active>
          <button type="button">First</button>
          <button type="button">Last</button>
        </FocusTrap>
      </div>,
    );

    // Take focus out without going through the DOM, the way a stray script would.
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.body).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("focuses the container itself when the trap holds nothing focusable", () => {
    const { container } = render(
      <FocusTrap active>
        <p>Loading…</p>
      </FocusTrap>,
    );

    const trap = container.querySelector('[data-slot="focus-trap"]');
    expect(trap).toHaveAttribute("tabindex", "-1");
    expect(trap).toHaveFocus();
  });

  it("recovers focus when the focused control is removed from the trap", async () => {
    function Dynamic() {
      const [showFirst, setShowFirst] = React.useState(true);
      return (
        <FocusTrap active>
          {showFirst && (
            <button type="button" onClick={() => setShowFirst(false)}>
              Remove me
            </button>
          )}
          <button type="button">Survivor</button>
        </FocusTrap>
      );
    }
    render(<Dynamic />);

    fireEvent.click(screen.getByRole("button", { name: "Remove me" }));

    // The browser drops focus to <body> when the focused element goes away, without firing a
    // focus event, so the trap notices via a mutation and takes it back rather than leaving
    // the page behind the overlay focusable.
    await waitFor(() => expect(screen.getByRole("button", { name: "Survivor" })).toHaveFocus());
  });

  it("cycles over controls that appear after activation", async () => {
    const user = userEvent.setup();
    function Growing() {
      const [expanded, setExpanded] = React.useState(false);
      return (
        <FocusTrap active>
          <button type="button" onClick={() => setExpanded(true)}>
            Expand
          </button>
          {expanded && <button type="button">Added</button>}
        </FocusTrap>
      );
    }
    render(<Growing />);

    await user.click(screen.getByRole("button", { name: "Expand" }));
    const added = screen.getByRole("button", { name: "Added" });

    added.focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Expand" })).toHaveFocus();
  });

  it("skips hidden inputs and inert subtrees when choosing where to enter", () => {
    render(
      <FocusTrap active>
        <input type="hidden" value="csrf" />
        <div inert>
          <button type="button">Disabled area</button>
        </div>
        <button type="button">Real target</button>
      </FocusTrap>,
    );

    expect(screen.getByRole("button", { name: "Real target" })).toHaveFocus();
  });

  it("hands containment to the innermost trap and gives it back on unmount", async () => {
    const user = userEvent.setup();
    function Nested() {
      const [inner, setInner] = React.useState(false);
      return (
        <FocusTrap active>
          <button type="button" onClick={() => setInner(true)}>
            Open inner
          </button>
          <button type="button">Outer tail</button>
          {inner && (
            <FocusTrap active>
              <button type="button" onClick={() => setInner(false)}>
                Inner only
              </button>
            </FocusTrap>
          )}
        </FocusTrap>
      );
    }
    render(<Nested />);

    await user.click(screen.getByRole("button", { name: "Open inner" }));
    const innerOnly = screen.getByRole("button", { name: "Inner only" });
    expect(innerOnly).toHaveFocus();

    // While the inner trap is on top it owns the cycle: Tab stays on its single control.
    await user.tab();
    expect(innerOnly).toHaveFocus();

    // Closing it restores focus to its trigger and hands the cycle back to the outer trap.
    await user.click(innerOnly);
    expect(screen.getByRole("button", { name: "Open inner" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Outer tail" })).toHaveFocus();
  });

  it("does not restore focus to a trigger that was removed while the trap was open", () => {
    function Disappearing() {
      const [trapped, setTrapped] = React.useState(false);
      return (
        <div>
          {!trapped && (
            <button type="button" onClick={() => setTrapped(true)}>
              Open
            </button>
          )}
          {trapped && (
            <FocusTrap active>
              <button type="button" onClick={() => setTrapped(false)}>
                Close
              </button>
            </FocusTrap>
          )}
        </div>
      );
    }
    const { container } = render(<Disappearing />);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    // The trigger no longer exists, so there is nothing to restore to. The trap must unmount
    // without throwing and without focusing a detached node.
    expect(() => fireEvent.click(screen.getByRole("button", { name: "Close" }))).not.toThrow();
    expect(container.contains(document.activeElement)).toBe(false);
  });
});
