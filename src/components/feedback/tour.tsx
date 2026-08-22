"use client";

import { cva } from "class-variance-authority";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/actions/button";
import { useFocusTrap } from "@/components/utility/focus-trap";
import { COMPONENT } from "@/lib/token-values";
import { cn } from "@/lib/utils";
import { Portal } from "@/primitives/portal";
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
 * Base visual classes for the floating tour card.
 * Extend via `className` when embedding TourStep standalone.
 */
const tourCardVariants = cva(
  "fixed z-(--qx-z-tour) w-(--qx-component-tour-card-width) rounded-lg border bg-card p-4 text-card-foreground shadow-modal",
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
  const cardRect = card?.getBoundingClientRect();

  const { top, left, side } = resolveAnchoredPosition({
    anchor: anchor && {
      top: anchor.top,
      left: anchor.left,
      width: anchor.width,
      height: anchor.height,
    },
    side: step.placement ?? "bottom",
    size: { width: cardRect?.width || CARD_WIDTH, height: cardRect?.height ?? 0 },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    offset: CARD_OFFSET,
    margin: VIEWPORT_MARGIN,
  });

  return { top, left, side };
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
}

/**
 * Floating card anchored to the current step's target element.
 * Rendered by Tour internally; also exportable for custom layouts.
 *
 * Keyboard: Escape → dismiss · ArrowRight → next · ArrowLeft → prev
 */
function TourStep({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onDismiss,
  className,
}: TourStepProps) {
  const [coords, setCoords] = React.useState<Coords>({ top: 0, left: 0, side: "bottom" });
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;
  const { containerRef } = useFocusTrap(true);

  const reposition = React.useCallback(() => {
    const next = measurePosition(step, containerRef.current);
    // Same-value guard: reposition runs from a layout effect and from a ResizeObserver on the
    // card it measures, so returning a fresh object every time would re-render forever.
    setCoords((prev) =>
      prev.top === next.top && prev.left === next.left && prev.side === next.side ? prev : next,
    );
  }, [step, containerRef]);

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
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onNext();
    } else if (event.key === "ArrowLeft") {
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
      aria-label={step.title}
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
        <p data-slot="tour-step-title" className="text-sm font-semibold leading-snug">
          {step.title}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss tour"
          className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
        >
          <XIcon aria-hidden className="size-3.5" />
        </button>
      </div>

      {/* Content */}
      <div data-slot="tour-step-content" className="mt-2 text-sm text-muted-foreground">
        {step.content}
      </div>

      {/* Footer — counter + navigation */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <span data-slot="tour-step-counter" className="text-xs text-muted-foreground">
          {currentIndex + 1} of {totalSteps}
        </span>
        <div className="flex gap-2">
          {!isFirst && (
            <Button variant="outline" size="sm" onClick={onPrev} data-slot="tour-prev-button">
              <ChevronLeftIcon aria-hidden />
              Back
            </Button>
          )}
          <Button size="sm" onClick={onNext} data-slot="tour-next-button">
            {isLast ? "Done" : "Next"}
            {!isLast && <ChevronRightIcon aria-hidden />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tour ─────────────────────────────────────────────────────────────────────

/**
 * Step-by-step guided product onboarding overlay.
 *
 * Spotlights a target element and shows a floating card with navigation
 * controls. Supports both controlled (`open`) and uncontrolled (`defaultOpen`)
 * modes.
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
      {/* Semi-transparent backdrop — clicking it dismisses the tour */}
      <div
        data-slot="tour-backdrop"
        className="fixed inset-0 z-(--qx-z-tour-backdrop) bg-black/40"
        onClick={handleDismiss}
        aria-hidden="true"
        data-qx-overlay-root=""
      />
      {/* Floating step card */}
      <TourStep
        step={currentStep}
        currentIndex={currentIndex}
        totalSteps={steps.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onDismiss={handleDismiss}
        className={className}
      />
    </Portal>
  );
}

export type { TourProps, TourStepDef, UseTourOptions, UseTourReturn };
export { Tour, TourStep, tourCardVariants, useTour };
