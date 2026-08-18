import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { FocusTrap } from "@/components/ui/focus-trap";

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
});
