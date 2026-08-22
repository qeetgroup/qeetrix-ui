/**
 * Collision-aware placement for surfaces that cannot use a positioning engine.
 *
 * Base UI's Positioner handles every anchored overlay in the library; the two surfaces that
 * cannot use it — Tour, which anchors to an arbitrary element it does not render, and
 * FloatingWindow, which is dragged — computed their own coordinates and never checked whether
 * the result was on screen. This module is the shared arithmetic: pure, unit-testable, and
 * unaware of React.
 *
 * @see docs/architecture/component-layers.md
 */

/** The axis-aligned box of an anchor element, in viewport coordinates. */
interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** A surface's own measured size. Zero means "not measured yet". */
interface SurfaceSize {
  width: number;
  height: number;
}

/** The visible area a surface must stay inside. */
interface Viewport {
  width: number;
  height: number;
}

/** Which side of the anchor a surface sits on. */
type AnchorSide = "top" | "bottom" | "left" | "right";

interface AnchoredPositionInput {
  /** The anchor box, or `null` when the anchor could not be found. */
  anchor: AnchorRect | null;
  /** The requested side. Flipped when the opposite side has more room. */
  side: AnchorSide;
  size: SurfaceSize;
  viewport: Viewport;
  /** Gap between the anchor and the surface. */
  offset: number;
  /** Minimum distance kept between the surface and the viewport edge. */
  margin: number;
}

interface AnchoredPosition {
  top: number;
  left: number;
  /** The side actually used, after collision flipping. */
  side: AnchorSide;
}

const OPPOSITE_SIDE: Record<AnchorSide, AnchorSide> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

/**
 * Clamp `value` into `[min, max]`, preferring `min` when the range is inverted.
 *
 * The inverted case is a surface taller or wider than the viewport: there is no position that
 * satisfies both margins, and pinning to the start edge keeps the beginning of the content
 * reachable, where honouring `max` would push the top of the surface off screen.
 */
function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/** Free space between the anchor and the viewport edge on each side, after margin and offset. */
function availableSpace(input: AnchoredPositionInput): Record<AnchorSide, number> {
  const { anchor, viewport, offset, margin } = input;
  if (!anchor) return { top: 0, bottom: 0, left: 0, right: 0 };
  return {
    top: anchor.top - offset - margin,
    bottom: viewport.height - (anchor.top + anchor.height) - offset - margin,
    left: anchor.left - offset - margin,
    right: viewport.width - (anchor.left + anchor.width) - offset - margin,
  };
}

/**
 * Place a surface next to an anchor, flipping to the opposite side when the requested one has
 * too little room and clamping the result inside the viewport.
 *
 * With no anchor the surface is centred. With an unmeasured surface (`size` zero, the state on
 * the first render before layout) the maths still runs and produces the anchor-aligned
 * position; the caller re-runs it once the size is known.
 */
function resolveAnchoredPosition(input: AnchoredPositionInput): AnchoredPosition {
  const { anchor, size, viewport, offset, margin } = input;

  const maxLeft = viewport.width - size.width - margin;
  const maxTop = viewport.height - size.height - margin;

  if (!anchor) {
    return {
      top: clamp((viewport.height - size.height) / 2, margin, maxTop),
      left: clamp((viewport.width - size.width) / 2, margin, maxLeft),
      side: input.side,
    };
  }

  const space = availableSpace(input);
  const needed = input.side === "top" || input.side === "bottom" ? size.height : size.width;
  const opposite = OPPOSITE_SIDE[input.side];
  const side =
    space[input.side] < needed && space[opposite] > space[input.side] ? opposite : input.side;

  const centreX = anchor.left + anchor.width / 2 - size.width / 2;
  const centreY = anchor.top + anchor.height / 2 - size.height / 2;

  let top: number;
  let left: number;
  switch (side) {
    case "top":
      top = anchor.top - size.height - offset;
      left = centreX;
      break;
    case "left":
      top = centreY;
      left = anchor.left - size.width - offset;
      break;
    case "right":
      top = centreY;
      left = anchor.left + anchor.width + offset;
      break;
    default:
      top = anchor.top + anchor.height + offset;
      left = centreX;
      break;
  }

  return { top: clamp(top, margin, maxTop), left: clamp(left, margin, maxLeft), side };
}

/**
 * Keep a free-floating surface inside the viewport.
 *
 * Used for dragging, where the constraint is not an anchor but "do not lose the window".
 * `keepVisible` is how much of the surface must stay on screen, so a wide panel may hang off
 * the trailing edge without becoming unreachable — and, critically, the limit is computed from
 * the surface's measured size rather than from a guessed constant. An unmeasured surface
 * (`size` zero before layout) falls back to keeping `keepVisible` on screen.
 */
function clampToViewport(
  position: { x: number; y: number },
  size: SurfaceSize,
  viewport: Viewport,
  keepVisible: number,
): { x: number; y: number } {
  const visibleWidth = size.width > 0 ? Math.min(size.width, keepVisible) : keepVisible;
  const visibleHeight = size.height > 0 ? Math.min(size.height, keepVisible) : keepVisible;
  return {
    x: clamp(position.x, 0, viewport.width - visibleWidth),
    y: clamp(position.y, 0, viewport.height - visibleHeight),
  };
}

export type { AnchoredPosition, AnchoredPositionInput, AnchorRect, AnchorSide, SurfaceSize };
export { clampToViewport, resolveAnchoredPosition };
