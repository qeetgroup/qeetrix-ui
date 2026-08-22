/**
 * Real-browser proof for Rating's half-star pointer split in RTL (RTL-001).
 *
 * This assertion was declined twice for being unprovable, and the reason was correct at the
 * time. `valueFromPointer` measured the half-star split from the star's physical left edge,
 * which is its inline *end* under `dir="rtl"`, so a click on the visually-first star returned
 * the wrong half. In jsdom `getBoundingClientRect` is all zeros and `direction: rtl` reorders
 * nothing, so the mirrored arithmetic and the unmirrored arithmetic return the same number for
 * every input — a jsdom test could not tell them apart, and one that appeared to would be
 * asserting its own mock.
 *
 * Three real-browser facts hold this together, and each is asserted here rather than assumed:
 *   1. `direction: rtl` reverses the flex line, so star 0 is the *rightmost* box.
 *   2. `inset-0` plus an explicit width is over-constrained, so the partial fill anchors to the
 *      right edge in an RTL containing block — the fill grows from the inline start, and the
 *      pointer split has to agree with what the user sees filled.
 *   3. Playwright's click `position` is measured from the element's physical top-left, so
 *      `x = width * 0.75` lands in the right half of a mirrored star.
 *
 * Every click below is a real pointer event at a real coordinate, so each one also proves that
 * hit-testing lands on the star the test names.
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { Rating } from "@/components/inputs/rating";
import { DirectionProvider } from "@/providers/direction-provider";

/** The star boxes in DOM order — index 0 first, whichever side of the screen that lands on. */
const stars = () => [...document.querySelectorAll<HTMLElement>("[data-rating-index]")];

/** The overlay that paints the filled portion of a star. */
const fillOf = (star: HTMLElement) => star.querySelector("span") as HTMLElement;

const slider = () => document.querySelector("[data-slot='rating']") as HTMLElement;

/**
 * Click a star at a fraction of its width, measured from its **physical** left edge.
 *
 * Physical on purpose: that is what a pointer does, and mirroring the fraction here would hide
 * the transform under test inside the test itself.
 */
async function clickAtFraction(star: HTMLElement, fraction: number) {
  const rect = star.getBoundingClientRect();
  expect(rect.width).toBeGreaterThan(0);
  await userEvent.click(star, { position: { x: rect.width * fraction, y: rect.height / 2 } });
}

function renderRating(direction: "ltr" | "rtl", onChange: (value: number) => void) {
  render(
    <DirectionProvider direction={direction}>
      <Rating allowHalf max={5} defaultValue={0} onChange={onChange} aria-label="Rate" />
    </DirectionProvider>,
  );
  return stars();
}

describe("Rating half-star pointer split — real layout", () => {
  it("lays the stars out right-to-left in rtl, which is what the split has to mirror", () => {
    const lefts = renderRating("rtl", () => {}).map((star) => star.getBoundingClientRect().left);

    // Star 0 is the rightmost box: the visually-first star sits at the far end of the X axis,
    // and every following index steps leftward. In jsdom every one of these is 0.
    expect(lefts[0]).toBeGreaterThan(lefts[4]);
    expect([...lefts].sort((a, b) => b - a)).toEqual(lefts);
  });

  it("anchors the partial fill to the inline-start edge, which is the right edge in rtl", () => {
    render(
      <DirectionProvider direction="rtl">
        <Rating allowHalf max={5} value={2.5} onChange={() => {}} aria-label="Rate" />
      </DirectionProvider>,
    );
    const half = stars()[2];
    const box = half.getBoundingClientRect();
    const fill = fillOf(half).getBoundingClientRect();

    expect(fill.right).toBeCloseTo(box.right, 0);
    expect(fill.width).toBeCloseTo(box.width / 2, 0);
    // Not flush with the left edge — the assertion that fails if the fill stops mirroring and
    // the pointer split silently starts disagreeing with the paint.
    expect(fill.left).toBeGreaterThan(box.left);
  });

  it("reads the right half of the visually-first star as its first half in rtl", async () => {
    const onChange = vi.fn();
    const first = renderRating("rtl", onChange)[0];

    // The inline-start half — the half the fill occupies at 0.5. This returned 1 before the
    // fix: a user aiming at half a star got a whole one.
    await clickAtFraction(first, 0.75);
    expect(onChange).toHaveBeenLastCalledWith(0.5);

    // The inline-end half of the same star.
    await clickAtFraction(first, 0.25);
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("keeps the physical reading in ltr, so the change is a mirror and not a swap", async () => {
    const onChange = vi.fn();
    const first = renderRating("ltr", onChange)[0];

    await clickAtFraction(first, 0.25);
    expect(onChange).toHaveBeenLastCalledWith(0.5);
    await clickAtFraction(first, 0.75);
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("splits a star further along the mirrored line the same way", async () => {
    const onChange = vi.fn();
    const third = renderRating("rtl", onChange)[2];

    await clickAtFraction(third, 0.75);
    expect(onChange).toHaveBeenLastCalledWith(2.5);
    await clickAtFraction(third, 0.25);
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it("agrees with the keyboard about which direction is more", async () => {
    const onChange = vi.fn();
    const boxes = renderRating("rtl", onChange);
    expect(slider()).toHaveAttribute("data-direction", "rtl");
    // The premise of the comparison: increasing index runs leftward.
    expect(boxes[3].getBoundingClientRect().right).toBeLessThanOrEqual(
      boxes[2].getBoundingClientRect().left,
    );

    await clickAtFraction(boxes[2], 0.75);
    expect(onChange).toHaveBeenLastCalledWith(2.5);

    // ArrowLeft is the inline-end key in RTL, so it raises: 2.5 → 3.
    slider().focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith(3);

    // The coordinate that continues in that same direction is further left — the inline-start
    // half of the next box along — and it must produce the next half step, 3.5. Before the fix
    // it produced 4: the pointer skipped a step the keyboard did not, and landed on a value
    // whose fill was on the other side of the star.
    await clickAtFraction(boxes[3], 0.75);
    expect(onChange).toHaveBeenLastCalledWith(3.5);

    // Rightward is less, on both paths.
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(3);
    await clickAtFraction(boxes[1], 0.25);
    expect(onChange).toHaveBeenLastCalledWith(2);
  });
});
