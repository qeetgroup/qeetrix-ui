"use client";

import { cva } from "class-variance-authority";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/Button/button";
import { useFocusTrap } from "@/components/FocusTrap/focus-trap";
import { Portal } from "@/internal/portal";
import { VisuallyHidden } from "@/internal/visually-hidden";
import { logicalDirectionForKey } from "@/lib/direction";
import type { MessagesFor } from "@/lib/messages";
import { tourMessages } from "@/lib/messages";
import { COMPONENT } from "@/lib/token-values";
import { cn } from "@/lib/utils";
import { useResolvedDirection } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";
import { useModalOverlay } from "@/runtime/overlay";
import { type AnchorSide, resolveAnchoredPosition } from "@/runtime/overlay-position";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TourStepDef {
  /** CSS selector for the element to spotlight. */
  target: string;
  title: string;
  content: React.ReactNode;
  /**
   * Preferred side of the target. Flipped to the opposite side when there is not enough room,
   * then clamped inside the viewport; the side actually used is exposed as `data-side`.
   */
  placement?: AnchorSide;
}

interface UseTourOptions {
  onComplete?: () => void;
  onDismiss?: () => void;
}

interface UseTourReturn {
  isOpen: boolean;
  currentStep: TourStepDef | undefined;
  currentIndex: number;
  totalSteps: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  goTo: (n: number) => void;
}

interface TourProps {
  steps: TourStepDef[];
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state in uncontrolled mode (default false). */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onComplete?: () => void;
  onDismiss?: () => void;
  /** Extra classes forwarded to the step card. */
  className?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"tour">;
}

// ─── useTour hook ─────────────────────────────────────────────────────────────

/**
 * Manages tour state when you need full programmatic control outside of the
 * Tour component (e.g. triggered by a "Start tour" button elsewhere in the UI).
 */
function useTour(steps: TourStepDef[], options: UseTourOptions = {}): UseTourReturn {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const { onComplete, onDismiss } = options;

  const start = React.useCallback(() => {
    setCurrentIndex(0);
    setIsOpen(true);
  }, []);

  const stop = React.useCallback(() => {
    setIsOpen(false);
    onDismiss?.();
  }, [onDismiss]);

  const next = React.useCallback(() => {
    setCurrentIndex((prev) => {
      const nextIdx = prev + 1;
      if (nextIdx >= steps.length) {
        setIsOpen(false);
        onComplete?.();
        return prev;
      }
      return nextIdx;
    });
  }, [steps.length, onComplete]);

  const prev = React.useCallback(() => {
    setCurrentIndex((prevIdx) => Math.max(0, prevIdx - 1));
  }, []);

  const goTo = React.useCallback(
    (n: number) => {
      if (n >= 0 && n < steps.length) setCurrentIndex(n);
    },
    [steps.length],
  );

  return {
    isOpen,
    currentStep: steps[currentIndex],
    currentIndex,
    totalSteps: steps.length,
    start,
    next,
    prev,
    stop,
    goTo,
  };
}

// ─── tourCardVariants ─────────────────────────────────────────────────────────

/**
 * Base visual classes for the floating tour card: the Qeet overlay surface at the modal
 * elevation, because the card is a modal dialog (the page behind it is inert).
 * Extend via `className` when embedding TourStep standalone.
 */
const tourCardVariants = cva(
  "fixed z-(--qx-z-tour) w-(--qx-component-tour-card-width) max-w-[calc(100vw-1rem)] rounded-(--qx-corner-overlay) border border-border bg-popover bg-clip-padding p-4 text-popover-foreground shadow-modal outline-none duration-normal ease-enter animate-in fade-in-0 zoom-in-97",
);

// ─── Position helpers ─────────────────────────────────────────────────────────

const CARD_WIDTH = Number.parseFloat(COMPONENT.tour.cardWidth);
const CARD_OFFSET = Number.parseFloat(COMPONENT.tour.offset);

/** Distance kept between the card and the viewport edge when a position has to be clamped. */
const VIEWPORT_MARGIN = 8;

interface Coords {
  top: number;
  left: number;
  side: AnchorSide;
}

/**
 * Resolve the card's position from the current DOM.
 *
 * The card measures itself rather than assuming a height: the previous implementation
 * subtracted literal 80/100/200px estimates, which put the card off screen whenever the
 * content was taller than the guess. Collision flipping and viewport clamping live in
 * `@/runtime/overlay-position` so they can be tested with real numbers — jsdom reports every
 * box as zero, so a rendered assertion cannot see a placement decision at all.
 */
function measurePosition(step: TourStepDef, card: HTMLElement | null): Coords {
  const anchor = document.querySelector(step.target)?.getBoundingClientRect() ?? null;
  // Layout size, not getBoundingClientRect: the card's entry animation scales it, and a rect
  // measured mid-animation is a few pixels short, which pushed the clamped card past its margin.
  const cardSize = card ? { width: card.offsetWidth, height: card.offsetHeight } : null;

  const { top, left, side } = resolveAnchoredPosition({
    anchor: anchor && {
      top: anchor.top,
      left: anchor.left,
      width: anchor.width,
      height: anchor.height,
    },
    side: step.placement ?? "bottom",
    size: { width: cardSize?.width || CARD_WIDTH, height: cardSize?.height ?? 0 },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    offset: CARD_OFFSET,
    margin: VIEWPORT_MARGIN,
  });

  return { top, left, side };
}

/**
 * Bring a step's target on screen before it is spotlighted. The tour locks page scroll, so a
 * target below the fold could otherwise never be seen. Instant rather than smooth: nothing is
 * animated from script, so there is no motion to reduce.
 */
function revealTarget(selector: string) {
  const target = document.querySelector(selector);
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const visible =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth;
  if (!visible) target.scrollIntoView?.({ block: "center", inline: "nearest" });
}

/** Whether a key event belongs to a text-entry control inside the step content. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

// ─── Spotlight ────────────────────────────────────────────────────────────────

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function readPixels(name: string, fallback: number): number {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name),
  );
  return Number.isFinite(value) ? value : fallback;
}

/**
 * An even-odd clip path: everything, minus a rounded rectangle around the target. A clip-path
 * rather than a giant box-shadow because forced-colors mode removes every shadow — the
 * base stylesheet turns this backdrop into a Canvas veil there, and the hole survives.
 */
function spotlightClipPath(rect: Rect | null): string | undefined {
  if (!rect) return undefined;
  const pad = readPixels("--qx-component-tour-spotlight-padding", 6);
  const corner = readPixels("--qx-component-tour-spotlight-corner", 8);
  const x = rect.left - pad;
  const y = rect.top - pad;
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;
  const r = Math.max(0, Math.min(corner, w / 2, h / 2));
  const outer = "M-1 -1H100000V100000H-1Z";
  const hole =
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
    `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  return `path(evenodd, "${outer} ${hole}")`;
}

/** The target's viewport rect, kept current through resize, any scroll and size changes. */
function useTargetRect(selector: string): Rect | null {
  const [rect, setRect] = React.useState<Rect | null>(null);

  React.useLayoutEffect(() => {
    const target = document.querySelector(selector);
    if (!target) {
      setRect(null);
      return;
    }
    const measure = () => {
      const r = target.getBoundingClientRect();
      setRect((prev) =>
        prev &&
        prev.top === r.top &&
        prev.left === r.left &&
        prev.width === r.width &&
        prev.height === r.height
          ? prev
          : { top: r.top, left: r.left, width: r.width, height: r.height },
      );
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
      observer.disconnect();
    };
  }, [selector]);

  return rect;
}

/** The dimmed backdrop with a cut-out over the current target. Clicking it dismisses. */
function TourSpotlight({ selector, onDismiss }: { selector: string; onDismiss: () => void }) {
  const rect = useTargetRect(selector);
  return (
    <div
      data-slot="tour-backdrop"
      data-spotlight={rect ? "" : undefined}
      className="fixed inset-0 z-(--qx-z-tour-backdrop) bg-(--qx-component-tour-scrim) duration-normal ease-standard animate-in fade-in-0"
      style={{ clipPath: spotlightClipPath(rect) }}
      onClick={onDismiss}
      aria-hidden="true"
      // OVERLAY_ROOT_ATTRIBUTE from @/runtime/overlay — written literally, see TourStep.
      data-qx-overlay-root=""
    />
  );
}

// ─── TourStep ─────────────────────────────────────────────────────────────────

interface TourStepProps {
  step: TourStepDef;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onDismiss: () => void;
  className?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"tour">;
}

/**
 * Floating card anchored to the current step's target element.
 * Rendered by Tour internally; also exportable for custom layouts.
 *
 * Keyboard: Escape → dismiss · the inline-end arrow → next · the inline-start arrow → prev
 * (ArrowRight / ArrowLeft in English, mirrored in RTL). Arrows typed into a field inside the
 * step content stay with the field.
 *
 * Focus starts on the primary action, so Enter advances. Moving between steps keeps focus
 * where it is and announces the new step politely instead of re-reading the whole card.
 */
function TourStep({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onDismiss,
  className,
  messages: messageOverrides,
}: TourStepProps) {
  const messages = useMessages("tour", tourMessages, messageOverrides);
  const [coords, setCoords] = React.useState<Coords>({ top: 0, left: 0, side: "bottom" });
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;
  const nextRef = React.useRef<HTMLButtonElement | null>(null);
  const { containerRef } = useFocusTrap(true, { initialFocusRef: nextRef });
  const direction = useResolvedDirection(containerRef);
  const titleId = React.useId();
  const contentId = React.useId();
  const counterId = React.useId();
  const counter = messages.progress(currentIndex + 1, totalSteps);

  const reposition = React.useCallback(() => {
    const next = measurePosition(step, containerRef.current);
    // Same-value guard: reposition runs from a layout effect and from a ResizeObserver on the
    // card it measures, so returning a fresh object every time would re-render forever.
    setCoords((prev) =>
      prev.top === next.top && prev.left === next.left && prev.side === next.side ? prev : next,
    );
  }, [step, containerRef]);

  // Declared before the positioning effect so it runs first: the card is placed against where
  // the target is after it has been scrolled into view.
  React.useLayoutEffect(() => {
    revealTarget(step.target);
  }, [step.target]);

  // Position follows the target: recompute on step change, on viewport resize, when anything
  // scrolls (capture, so scroll containers count) and when the card's own size changes.
  React.useLayoutEffect(() => {
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, { capture: true, passive: true });
    const observer = new ResizeObserver(reposition);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, { capture: true });
      observer.disconnect();
    };
  }, [reposition, containerRef]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.defaultPrevented) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onDismiss();
      return;
    }
    if (isEditableTarget(event.target)) return;
    const logical = logicalDirectionForKey(event.key, direction);
    if (logical === "inline-end") {
      event.preventDefault();
      onNext();
    } else if (logical === "inline-start") {
      event.preventDefault();
      onPrev();
    }
  }

  return (
    <div
      ref={containerRef}
      data-slot="tour-step"
      data-side={coords.side}
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={`${contentId} ${counterId}`}
      aria-modal="true"
      onKeyDown={handleKeyDown}
      className={cn(tourCardVariants(), className)}
      style={{ top: coords.top, left: coords.left }}
      // OVERLAY_ROOT_ATTRIBUTE from @/runtime/overlay: this is the tour's own chrome, so
      // background inerting must skip it. Written literally rather than spread from the
      // constant, because a spread hides the element's other attributes from lint analysis;
      // the tour tests assert the two stay in step.
      data-qx-overlay-root=""
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p
          // Re-keyed per step so the new title fades in: the motion marks the progression.
          key={`title-${currentIndex}`}
          id={titleId}
          data-slot="tour-step-title"
          className="min-w-0 pt-1 font-heading text-base leading-snug font-semibold text-pretty text-foreground duration-normal ease-enter animate-in fade-in-0"
        >
          {step.title}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          aria-label={messages.dismiss}
          data-slot="tour-dismiss-button"
          className="-me-1.5 -mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <XIcon aria-hidden />
        </Button>
      </div>

      {/* Content */}
      <div
        key={`content-${currentIndex}`}
        id={contentId}
        data-slot="tour-step-content"
        className="mt-1.5 text-sm text-pretty text-muted-foreground duration-normal ease-enter animate-in fade-in-0"
      >
        {step.content}
      </div>

      {/* Footer — counter + navigation */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <span
          id={counterId}
          data-slot="tour-step-counter"
          className="font-ui text-xs text-muted-foreground tabular-nums"
        >
          {counter}
        </span>
        <div className="flex gap-2">
          {!isFirst && (
            <Button variant="outline" size="sm" onClick={onPrev} data-slot="tour-prev-button">
              <ChevronLeftIcon aria-hidden className="rtl:rotate-180" />
              {messages.back}
            </Button>
          )}
          <Button ref={nextRef} size="sm" onClick={onNext} data-slot="tour-next-button">
            {isLast ? messages.done : messages.next}
            {!isLast && <ChevronRightIcon aria-hidden className="rtl:rotate-180" />}
          </Button>
        </div>
      </div>

      {/* Focus stays on the button that was pressed, so the new step is announced here. */}
      <VisuallyHidden role="status" aria-live="polite" data-slot="tour-step-status">
        {messages.stepStatus(step.title, counter)}
      </VisuallyHidden>
    </div>
  );
}

// ─── Tour ─────────────────────────────────────────────────────────────────────

/**
 * Step-by-step guided product onboarding overlay.
 *
 * Spotlights a target element — the page is dimmed with the overlay scrim and the target shows
 * through a rounded cut-out — and shows a floating card with navigation controls. The page
 * behind is inert and does not scroll; each step scrolls its own target into view. Supports
 * both controlled (`open`) and uncontrolled (`defaultOpen`) modes.
 *
 * ```tsx
 * <Tour
 *   steps={[
 *     { target: "#nav-search", title: "Search", content: "Find anything fast." },
 *     { target: "#sidebar",    title: "Sidebar", content: "Navigate sections." },
 *   ]}
 *   defaultOpen
 *   onComplete={() => console.log("tour done")}
 * />
 * ```
 */
function Tour({
  steps,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  onComplete,
  onDismiss,
  className,
  messages,
}: TourProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const isOpen = isControlled ? controlledOpen : internalOpen;
  const isModal = isOpen && steps.length > 0;

  // `aria-modal="true"` is a promise about the rest of the page, not a decoration: while the
  // tour is open the background is inert and the page cannot scroll, so keyboard, pointer and
  // virtual-cursor users all see the same boundary the attribute advertises.
  useModalOverlay(isModal);

  // Reset to step 0 each time the tour becomes open
  React.useEffect(() => {
    if (isOpen) setCurrentIndex(0);
  }, [isOpen]);

  const handleNext = React.useCallback(() => {
    if (currentIndex + 1 >= steps.length) {
      if (!isControlled) setInternalOpen(false);
      onOpenChange?.(false);
      onComplete?.();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, steps.length, isControlled, onOpenChange, onComplete]);

  const handlePrev = React.useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleDismiss = React.useCallback(() => {
    if (!isControlled) setInternalOpen(false);
    onOpenChange?.(false);
    onDismiss?.();
  }, [isControlled, onOpenChange, onDismiss]);

  if (!isOpen || steps.length === 0) return null;

  const currentStep = steps[currentIndex];
  if (!currentStep) return null;

  // Portal, not createPortal: `createPortal(..., document.body)` during render throws on the
  // server for the perfectly valid initial state `defaultOpen`. Portal defers mounting to an
  // effect, so the server emits nothing, the first client render matches it, and the overlay
  // appears once there is a document to attach it to.
  return (
    <Portal>
      <TourSpotlight selector={currentStep.target} onDismiss={handleDismiss} />
      {/* Floating step card */}
      <TourStep
        step={currentStep}
        currentIndex={currentIndex}
        totalSteps={steps.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onDismiss={handleDismiss}
        className={className}
        messages={messages}
      />
    </Portal>
  );
}

export type { TourProps, TourStepDef, TourStepProps, UseTourOptions, UseTourReturn };
export { Tour, TourStep, tourCardVariants, useTour };
