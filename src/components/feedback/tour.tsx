"use client";

import { cva } from "class-variance-authority";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/actions/button";
import { useFocusTrap } from "@/components/utility/focus-trap";
import { COMPONENT } from "@/lib/token-values";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TourStepDef {
  /** CSS selector for the element to spotlight. */
  target: string;
  title: string;
  content: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
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

interface Coords {
  top: number;
  left: number;
}

function computePosition(
  target: Element | null,
  placement: TourStepDef["placement"] = "bottom",
): Coords {
  if (!target) {
    // Target not found — center the card on screen
    return {
      top: window.innerHeight / 2 - 100,
      left: window.innerWidth / 2 - CARD_WIDTH / 2,
    };
  }

  const rect = target.getBoundingClientRect();

  switch (placement) {
    case "top":
      return {
        top: rect.top - CARD_OFFSET - 200,
        left: rect.left + rect.width / 2 - CARD_WIDTH / 2,
      };
    case "left":
      return {
        top: rect.top + rect.height / 2 - 80,
        left: rect.left - CARD_WIDTH - CARD_OFFSET,
      };
    case "right":
      return {
        top: rect.top + rect.height / 2 - 80,
        left: rect.right + CARD_OFFSET,
      };
    default: // "bottom"
      return {
        top: rect.bottom + CARD_OFFSET,
        left: rect.left + rect.width / 2 - CARD_WIDTH / 2,
      };
  }
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
  const [coords, setCoords] = React.useState<Coords>({ top: 0, left: 0 });
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;
  const { containerRef } = useFocusTrap(true);

  // Recompute position whenever the target or placement changes
  React.useLayoutEffect(() => {
    const el = document.querySelector(step.target);
    setCoords(computePosition(el, step.placement));
  }, [step.target, step.placement]);

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
      role="dialog"
      aria-label={step.title}
      aria-modal="true"
      onKeyDown={handleKeyDown}
      className={cn(tourCardVariants(), className)}
      style={{ top: coords.top, left: coords.left }}
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

  return createPortal(
    <>
      {/* Semi-transparent backdrop — clicking it dismisses the tour */}
      <div
        data-slot="tour-backdrop"
        className="fixed inset-0 z-(--qx-z-tour-backdrop) bg-black/40"
        onClick={handleDismiss}
        aria-hidden="true"
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
    </>,
    document.body,
  );
}

export type { TourProps, TourStepDef, UseTourOptions, UseTourReturn };
export { Tour, TourStep, tourCardVariants, useTour };
