/**
 * Real-browser proof for carousel slide isolation (A11Y-004).
 *
 * The jsdom suite has to mock `embla-carousel-react` entirely: Embla derives `slidesInView()`
 * from an IntersectionObserver and its own measurements, and jsdom supplies neither. So the
 * jsdom tests prove that the component reacts correctly to a *fake* visibility report, and say
 * in a comment that whether the offscreen button is really unreachable "needs a real browser to
 * confirm". This file is that confirmation, with the real library and real layout.
 *
 * The assertion is the invariant rather than a fixed set of indices: which slides Embla counts
 * as in view depends on its measurement threshold and on sub-pixel widths, and pinning that
 * would be testing Embla's arithmetic instead of Qeetrix's isolation.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/data-display/carousel";

const LABELS = ["one", "two", "three", "four", "five"];

function Gallery() {
  return (
    // A width is required: Embla decides what is in view by measuring, and an unsized
    // container has nothing to measure.
    <div style={{ width: "320px" }}>
      <Carousel aria-label="Featured products">
        <CarouselContent>
          {LABELS.map((label) => (
            <CarouselItem key={label} className="min-w-0 shrink-0 grow-0 basis-full">
              <button type="button">Buy {label}</button>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

const slides = () => [...document.querySelectorAll<HTMLElement>("[data-slot='carousel-item']")];
/** Indices Embla currently reports as visible, as a stable string for polling. */
const inViewKey = () =>
  slides()
    .map((slide, index) => (slide.hasAttribute("data-in-view") ? index : null))
    .filter((index) => index !== null)
    .join(",");

/**
 * The contract, checked against whatever Embla currently reports: content in a visible slide
 * is operable, content in a slide outside the window is not reachable by focus at all.
 *
 * In jsdom both halves would pass regardless of the implementation, because `focus()` succeeds
 * on an inert element there. That is the whole reason this file exists.
 */
function assertOperabilityFollowsVisibility() {
  const partitioned = slides().map((slide) => ({
    control: slide.querySelector("button"),
    visible: slide.hasAttribute("data-in-view"),
    inert: slide.hasAttribute("inert"),
  }));

  expect(partitioned.some((slide) => slide.visible)).toBe(true);
  expect(partitioned.some((slide) => !slide.visible)).toBe(true);

  for (const { control, visible, inert } of partitioned) {
    expect(inert).toBe(!visible);
    document.body.focus();
    control?.focus();
    if (visible) expect(document.activeElement).toBe(control);
    else expect(document.activeElement).not.toBe(control);
  }
}

/**
 * Wait for Embla to have narrowed the window. Its IntersectionObserver has not reported yet at
 * mount, and until it does `slidesInView()` names every slide — a state the component correctly
 * treats as "hide nothing", and which would make the assertions below vacuous.
 */
const settled = () => expect.poll(() => inViewKey() !== LABELS.map((_, i) => i).join(","));

describe("Carousel — real Embla visibility and real inert", () => {
  it("makes offscreen slide content genuinely unfocusable", async () => {
    render(<Gallery />);
    await settled().toBe(true);
    assertOperabilityFollowsVisibility();
  });

  it("moves operability with the visible window when the carousel scrolls", async () => {
    render(<Gallery />);
    await settled().toBe(true);
    const before = inViewKey();

    screen.getByRole("button", { name: "Next slide" }).click();
    await expect.poll(inViewKey).not.toBe(before);

    assertOperabilityFollowsVisibility();
  });
});
