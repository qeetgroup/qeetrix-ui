import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FloatingWindow } from "@/components/FloatingWindow/floating-window";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("FloatingWindow", () => {
  it("renders a non-modal labelled dialog", () => {
    render(<FloatingWindow title="Helper">Body</FloatingWindow>);
    const dialog = screen.getByRole("dialog", { name: "Helper" });
    expect(dialog).toHaveAttribute("aria-modal", "false");
  });

  it("hides when open is false", () => {
    render(
      <FloatingWindow title="Helper" open={false}>
        Body
      </FloatingWindow>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fires onClose", () => {
    const onClose = vi.fn();
    render(
      <FloatingWindow title="Helper" onClose={onClose}>
        Body
      </FloatingWindow>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<FloatingWindow title="Helper">Body</FloatingWindow>);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("FloatingWindow interaction", () => {
  const panel = () => screen.getByRole("dialog");
  const header = () => panel().querySelector('[data-slot="floating-window-header"]') as HTMLElement;
  const title = () => screen.getByText("Helper");

  function drag(from: Element, to: { x: number; y: number }, init: { button?: number } = {}) {
    fireEvent.pointerDown(from, { button: 0, clientX: 0, clientY: 0, pointerId: 1, ...init });
    fireEvent.pointerMove(header(), { clientX: to.x, clientY: to.y, pointerId: 1 });
  }

  it("moves when dragged by its header", () => {
    render(<FloatingWindow title="Helper">Body</FloatingWindow>);
    expect(panel()).toHaveStyle({ left: "24px", top: "24px" });
    drag(title(), { x: 40, y: 30 });
    expect(panel()).toHaveStyle({ left: "64px", top: "54px" });
  });

  it("does not start a drag from the close button, so its click is never lost", () => {
    const onClose = vi.fn();
    render(
      <FloatingWindow title="Helper" onClose={onClose}>
        Body
      </FloatingWindow>,
    );
    const close = screen.getByRole("button", { name: "Close" });
    drag(close, { x: 40, y: 30 });
    expect(panel()).toHaveStyle({ left: "24px", top: "24px" });
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores a secondary-button press", () => {
    render(<FloatingWindow title="Helper">Body</FloatingWindow>);
    drag(title(), { x: 40, y: 30 }, { button: 2 });
    expect(panel()).toHaveStyle({ left: "24px", top: "24px" });
  });

  it("lets go when the browser cancels the pointer", () => {
    render(<FloatingWindow title="Helper">Body</FloatingWindow>);
    drag(title(), { x: 10, y: 10 });
    fireEvent.pointerCancel(header(), { pointerId: 1 });
    fireEvent.pointerMove(header(), { clientX: 200, clientY: 200, pointerId: 1 });
    expect(panel()).toHaveStyle({ left: "34px", top: "34px" });
  });

  it("closes on Escape while focus is inside it", () => {
    const onClose = vi.fn();
    render(
      <FloatingWindow title="Helper" onClose={onClose}>
        <button type="button">Inside</button>
      </FloatingWindow>,
    );
    const inside = screen.getByRole("button", { name: "Inside" });
    inside.focus();
    fireEvent.keyDown(inside, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("leaves Escape alone when a consumer handler has already claimed it", () => {
    const onClose = vi.fn();
    render(
      <FloatingWindow title="Helper" onClose={onClose} onKeyDown={(e) => e.preventDefault()}>
        Body
      </FloatingWindow>,
    );
    fireEvent.keyDown(panel(), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("brings the window that was last pressed or focused in front of the others", () => {
    render(
      <>
        <FloatingWindow title="First">One</FloatingWindow>
        <FloatingWindow title="Second">Two</FloatingWindow>
      </>,
    );
    const first = screen.getByRole("dialog", { name: "First" });
    const second = screen.getByRole("dialog", { name: "Second" });
    // The window that opened last starts in front.
    expect(second).toHaveAttribute("data-active");
    expect(first).not.toHaveAttribute("data-active");

    fireEvent.pointerDown(first, { button: 0 });
    expect(first).toHaveAttribute("data-active");
    expect(second).not.toHaveAttribute("data-active");
    expect(first.className).toContain("data-[active]:z-[calc(var(--qx-z-fixed)+1)]");
    expect(first.className).toContain("data-[active]:shadow-modal");
  });

  it("is resizable only when asked", () => {
    const { rerender } = render(<FloatingWindow title="Helper">Body</FloatingWindow>);
    expect(panel().className).not.toMatch(/(^|\s)resize(\s|$)/);
    rerender(
      <FloatingWindow title="Helper" resizable>
        Body
      </FloatingWindow>,
    );
    expect(panel().className).toMatch(/(^|\s)resize(\s|$)/);
  });

  it("merges a consumer style instead of replacing its position", () => {
    render(
      <FloatingWindow title="Helper" style={{ zIndex: 5 }}>
        Body
      </FloatingWindow>,
    );
    expect(panel()).toHaveStyle({ left: "24px", top: "24px", zIndex: "5" });
  });
});

describe("FloatingWindow keyboard move (WCAG 2.1.1)", () => {
  const panel = () => screen.getByRole("dialog");
  const handle = () => screen.getByRole("button", { name: "Move window" });

  it("has a named, described move handle in the title bar", () => {
    render(<FloatingWindow title="Helper">Body</FloatingWindow>);
    expect(handle()).toHaveAccessibleDescription(
      "Use the arrow keys to move the window. Hold Shift to move it further.",
    );
    expect(handle().closest('[data-slot="floating-window-header"]')).not.toBeNull();
  });

  it("moves with the arrow keys, further with Shift", () => {
    render(<FloatingWindow title="Helper">Body</FloatingWindow>);
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(panel()).toHaveStyle({ left: "32px", top: "24px" });
    fireEvent.keyDown(handle(), { key: "ArrowDown", shiftKey: true });
    expect(panel()).toHaveStyle({ left: "32px", top: "64px" });
    fireEvent.keyDown(handle(), { key: "ArrowLeft" });
    fireEvent.keyDown(handle(), { key: "ArrowUp" });
    expect(panel()).toHaveStyle({ left: "24px", top: "56px" });
  });

  it("stays on screen, as a pointer drag does", () => {
    render(<FloatingWindow title="Helper">Body</FloatingWindow>);
    for (let i = 0; i < 10; i++) fireEvent.keyDown(handle(), { key: "ArrowUp", shiftKey: true });
    expect(panel()).toHaveStyle({ top: "0px" });
  });

  it("leaves modified arrows and other keys alone", () => {
    render(<FloatingWindow title="Helper">Body</FloatingWindow>);
    fireEvent.keyDown(handle(), { key: "ArrowRight", altKey: true });
    fireEvent.keyDown(handle(), { key: "Enter" });
    expect(panel()).toHaveStyle({ left: "24px", top: "24px" });
  });

  it("drags from the handle with a pointer too", () => {
    render(<FloatingWindow title="Helper">Body</FloatingWindow>);
    const header = panel().querySelector('[data-slot="floating-window-header"]') as HTMLElement;
    fireEvent.pointerDown(handle(), { button: 0, clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(header, { clientX: 16, clientY: 8, pointerId: 1 });
    expect(panel()).toHaveStyle({ left: "40px", top: "32px" });
  });

  it("takes its strings from the floatingWindow message group", () => {
    render(
      <FloatingWindow title="Helper" messages={{ move: "Fenster verschieben", close: "Schließen" }}>
        Body
      </FloatingWindow>,
    );
    expect(screen.getByRole("button", { name: "Fenster verschieben" })).toBeInTheDocument();
  });
});
