/**
 * Real-browser proof for the modality mechanics.
 *
 * The jsdom suite (src/components/feedback/__tests__/tour.test.tsx) asserts that `inert` is
 * applied to the background and that `body.style.overflow` becomes `hidden`. Both are claims
 * about attributes. jsdom does not implement `inert` and does not scroll, so the *effect* —
 * background content genuinely unreachable, page genuinely not scrollable — has never been
 * asserted anywhere in this repository. That is what this file does.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { Tour } from "@/components/feedback/tour";

const steps = [
  { target: "#step-one", title: "Welcome", content: "First step of the tour." },
  { target: "#step-two", title: "Explore", content: "Second step of the tour." },
];

/** Page content behind the overlay, plus enough height for the document to scroll. */
function Background() {
  return (
    <div id="step-one">
      <input aria-label="Underlying input" />
      <a href="#step-two">Underlying link</a>
      <div style={{ height: "300vh" }} />
    </div>
  );
}

describe("modal overlay — real inert and real scroll lock", () => {
  it("refuses focus to background controls, which jsdom cannot show", () => {
    render(
      <>
        <Background />
        <Tour steps={steps} open />
      </>,
    );

    const input = screen.getByRole("textbox", { name: "Underlying input" });
    const link = screen.getByRole("link", { name: "Underlying link" });
    expect(input.closest("[inert]")).not.toBeNull();

    // A browser ignores focus() inside an inert subtree. jsdom honours it, so this assertion
    // would pass in jsdom whether inerting worked or not.
    input.focus();
    expect(document.activeElement).not.toBe(input);
    link.focus();
    expect(document.activeElement).not.toBe(link);

    // The overlay itself must stay operable — the marker exempting it is only useful if the
    // browser agrees.
    const dismiss = screen.getByRole("button", { name: "Dismiss tour" });
    dismiss.focus();
    expect(document.activeElement).toBe(dismiss);
  });

  it("restores focusability to the background when the overlay closes", () => {
    const { rerender } = render(
      <>
        <Background />
        <Tour steps={steps} open />
      </>,
    );
    const input = screen.getByRole("textbox", { name: "Underlying input" });
    input.focus();
    expect(document.activeElement).not.toBe(input);

    rerender(
      <>
        <Background />
        <Tour steps={steps} open={false} />
      </>,
    );
    input.focus();
    expect(document.activeElement).toBe(input);
  });

  it("actually prevents a wheel gesture from scrolling the page while open", async () => {
    const { rerender } = render(
      <>
        <Background />
        <Tour steps={steps} open={false} />
      </>,
    );

    // `window.scrollTo` is not a proof: programmatic scrolling still works on an
    // `overflow: hidden` scroll container. Only a real wheel gesture distinguishes a locked
    // page from an unlocked one, and only a real browser can deliver one.
    await userEvent.wheel(document.body, { delta: { y: 400 } });
    const unlocked = window.scrollY;
    expect(unlocked).toBeGreaterThan(0);
    window.scrollTo(0, 0);

    rerender(
      <>
        <Background />
        <Tour steps={steps} open />
      </>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.wheel(document.body, { delta: { y: 400 } });
    expect(window.scrollY).toBe(0);

    rerender(
      <>
        <Background />
        <Tour steps={steps} open={false} />
      </>,
    );
    await userEvent.wheel(document.body, { delta: { y: 400 } });
    expect(window.scrollY).toBeGreaterThan(0);
    window.scrollTo(0, 0);
  });
});
