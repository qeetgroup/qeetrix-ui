"use client";

import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/Button/button";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { CarouselMessages, MessagesFor } from "@/lib/messages";
import { carouselMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import type { Direction } from "@/providers/direction-provider";
import { useDirectionalKeys } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

interface CarouselProps {
  opts?: CarouselOptions;
  /** Embla plugins, e.g. `[Autoplay()]` from `embla-carousel-autoplay`. */
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  /** Receive the embla API once initialised (for dots, autoplay control, etc.). */
  setApi?: (api: CarouselApi) => void;
  /**
   * Accessible name for each slide, stating its position. Defaults to
   * `"<n> of <total>"`. Provide a translated version for non-English UIs; a
   * slide that sets its own `aria-label` keeps it.
   *
   * @deprecated Use `messages={{ slidePosition }}`, which takes a **1-based** position
   * rather than a zero-based index and is translated alongside the arrow labels. This prop
   * still wins over `messages` and over a `MessagesProvider`, so nothing breaks.
   */
  slidePositionLabel?: (index: number, count: number) => string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"carousel">;
}

interface CarouselContextValue extends CarouselProps {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: CarouselApi;
  scrollPrev: () => void;
  scrollNext: () => void;
  /** Move to a scroll snap (a page — one slide unless several share the view). */
  scrollTo: (index: number) => void;
  /** The selected scroll snap, `0` before initialisation. */
  selectedIndex: number;
  /** How many scroll snaps there are — what an indicator counts. `0` before initialisation. */
  snapCount: number;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  /** Resolved reading direction of the carousel subtree. */
  direction: Direction;
  /** True when the user asked for reduced motion; movement becomes instant. */
  reducedMotion: boolean;
  /** Total slide count as Embla sees it (`0` before initialisation). */
  slideCount: number;
  /** Resolved strings, so every part names itself from the same catalogue. */
  resolvedMessages: CarouselMessages;
  /**
   * Indices Embla currently reports as in view. Empty means "not yet known" —
   * consumers must treat that as "everything is visible" so a server render or
   * a failed initialisation never hides content.
   */
  slidesInView: readonly number[];
}

const CarouselContext = React.createContext<CarouselContextValue | null>(null);
const ARROW_KEY_WIDGET_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="combobox"], [role="grid"], [role="listbox"], [role="menu"], [role="menubar"], [role="radiogroup"], [role="slider"], [role="spinbutton"], [role="tablist"], [role="tree"], [role="treegrid"]';

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }
  return context;
}

/**
 * Accessible carousel built on Embla. Compose with `CarouselContent`,
 * `CarouselItem`, and `CarouselPrevious` / `CarouselNext`. Arrow keys move
 * between slides. Pass `plugins={[Autoplay()]}` for autoplay.
 *
 * Slides that Embla reports as out of view are marked `inert` + `aria-hidden`,
 * so keyboard users cannot tab into content they cannot see. Each slide is
 * named with its position (`"2 of 5"`).
 *
 * Direction comes from the shared contract — a `DirectionProvider`, else the
 * nearest `dir` attribute (so `<html dir="rtl">` works), else LTR. In RTL, Embla
 * scrolls right-to-left and <kbd>ArrowLeft</kbd> means *next*. Passing
 * `opts.direction` overrides all of it, because that is Embla's own option.
 *
 * Under `prefers-reduced-motion: reduce` the scroll duration collapses to zero
 * (slides change instantly) and any plugin exposing `stop()` — notably
 * `embla-carousel-autoplay` — is stopped, since a JS-driven transform cannot be
 * neutralised by the global reduced-motion CSS.
 */
function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  onKeyDown: onKeyDownProp,
  slidePositionLabel,
  messages: messageOverrides,
  "aria-label": ariaLabel,
  ...props
}: React.ComponentProps<"section"> & CarouselProps) {
  const resolvedMessages = useMessages("carousel", carouselMessages, messageOverrides);
  const rootRef = React.useRef<HTMLElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  // One shared contract rather than a per-component DOM read: a provider, then
  // `<html dir>`, then LTR. `opts.direction` is Embla's own knob, so it overrides.
  const { direction, arrowKeys } = useDirectionalKeys(rootRef, orientation, opts?.direction);

  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
      direction,
      // Embla animates with JavaScript, so the global reduced-motion CSS cannot
      // reach it. A duration of 0 makes each move a jump instead of a glide.
      // Spread rather than a ternary: Embla merges by key presence, so an
      // explicit `duration: undefined` would wipe out its own default.
      ...(reducedMotion ? { duration: 0 } : null),
    },
    plugins,
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);
  const [slideCount, setSlideCount] = React.useState(0);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [snapCount, setSnapCount] = React.useState(0);
  const [slidesInView, setSlidesInView] = React.useState<readonly number[]>([]);
  // What the polite status region says. Only a move the user asked for (a control, an indicator,
  // an arrow key) is announced — never a drag settling or an autoplay tick, which would talk
  // over whatever the user is actually doing.
  const [status, setStatus] = React.useState("");
  const announceNextSelect = React.useRef(false);
  // A slide about to be inerted while it holds focus would drop focus to <body>. The index of
  // the slide that should receive it instead, applied once the inert state has committed.
  const pendingFocus = React.useRef<number | null>(null);

  const onSelect = React.useCallback(
    (api: CarouselApi, event?: string) => {
      if (!api) return;
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
      setSlideCount(api.slideNodes().length);
      const selected = api.selectedScrollSnap();
      const snaps = api.scrollSnapList().length;
      setSelectedIndex(selected);
      setSnapCount(snaps);
      if (event === "select" && announceNextSelect.current) {
        announceNextSelect.current = false;
        setStatus(resolvedMessages.slidePosition(selected + 1, snaps));
      }
      const next = api.slidesInView();
      if (next.length > 0) {
        const active = rootRef.current?.ownerDocument.activeElement;
        const holder = active ? api.slideNodes().findIndex((node) => node.contains(active)) : -1;
        if (holder >= 0 && !next.includes(holder)) pendingFocus.current = next[0] ?? null;
      }
      setSlidesInView((current) =>
        // Reference-stable when unchanged: this value feeds every slide's context.
        next.length === current.length && next.every((v, i) => v === current[i]) ? current : next,
      );
    },
    [resolvedMessages],
  );

  // Each arms the announcement only when it will actually move, so a press at either end cannot
  // leave it armed for the next drag or autoplay tick.
  const scrollPrev = React.useCallback(() => {
    announceNextSelect.current = Boolean(api?.canScrollPrev());
    api?.scrollPrev();
  }, [api]);
  const scrollNext = React.useCallback(() => {
    announceNextSelect.current = Boolean(api?.canScrollNext());
    api?.scrollNext();
  }, [api]);
  const scrollTo = React.useCallback(
    (index: number) => {
      announceNextSelect.current = Boolean(api) && index !== api?.selectedScrollSnap();
      api?.scrollTo(index);
    },
    [api],
  );

  // Focus rescue: runs after the commit that inerted the old slide, so the target is reachable.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `slidesInView` is the trigger — the commit that applied the new inert state — not a value the effect reads.
  React.useLayoutEffect(() => {
    const index = pendingFocus.current;
    if (index === null || !api) return;
    pendingFocus.current = null;
    const node = api.slideNodes()[index];
    if (!node) return;
    // Programmatically focusable only; never a tab stop.
    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1");
    node.focus({ preventScroll: true });
  }, [api, slidesInView]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      onKeyDownProp?.(event);

      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof Element &&
        target !== event.currentTarget &&
        target.closest(ARROW_KEY_WIDGET_SELECTOR)
      ) {
        return;
      }

      // `arrowKeys` already accounts for direction and orientation: in horizontal
      // RTL the previous slide sits to the right, and the block axis never mirrors.
      if (event.key === arrowKeys.previous) {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === arrowKeys.next) {
        event.preventDefault();
        scrollNext();
      }
    },
    [onKeyDownProp, arrowKeys, scrollPrev, scrollNext],
  );

  React.useEffect(() => {
    if (api && setApi) setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    // `slidesInView` fires when visibility changes without a snap change (drag,
    // resize); `slidesChanged` when slides are added or removed.
    const events = ["reInit", "select", "slidesInView", "slidesChanged", "settle"] as const;
    for (const event of events) api.on(event, onSelect);
    return () => {
      for (const event of events) api.off(event, onSelect);
    };
  }, [api, onSelect]);

  React.useEffect(() => {
    if (!api || !reducedMotion) return;
    // Autoplay is a plugin we do not own, so it is stopped by duck-typing rather
    // than by importing it. Re-stopped on the events that can restart it.
    const stopAll = () => {
      for (const plugin of Object.values(api.plugins())) {
        const stop = (plugin as { stop?: unknown }).stop;
        if (typeof stop === "function") stop.call(plugin);
      }
    };
    stopAll();
    const events = ["init", "reInit", "select", "settle", "pointerUp"] as const;
    for (const event of events) api.on(event, stopAll);
    return () => {
      for (const event of events) api.off(event, stopAll);
    };
  }, [api, reducedMotion]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api,
        opts,
        orientation,
        scrollPrev,
        scrollNext,
        scrollTo,
        selectedIndex,
        snapCount,
        canScrollPrev,
        canScrollNext,
        direction,
        reducedMotion,
        slideCount,
        slidesInView,
        slidePositionLabel,
        resolvedMessages,
      }}
    >
      <section
        ref={rootRef}
        data-slot="carousel"
        data-direction={direction}
        onKeyDown={handleKeyDown}
        className={cn("relative", className)}
        aria-roledescription={resolvedMessages.roleDescription}
        // An unnamed <section> is not exposed as a landmark at all, which is why this previously
        // needed an explicit role="region" and still announced as anonymous. Naming it makes the
        // section a real region natively, so the explicit role is redundant.
        aria-label={ariaLabel ?? resolvedMessages.label}
        {...props}
      >
        {children}
        <span data-slot="carousel-status" aria-live="polite" aria-atomic="true" className="sr-only">
          {status}
        </span>
      </section>
    </CarouselContext.Provider>
  );
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel();
  return (
    <div ref={carouselRef} data-slot="carousel-content" className="overflow-hidden">
      <div
        className={cn(
          // Embla drags along one axis; the browser keeps the other axis's scroll and pinch-zoom,
          // so a touch user can still scroll the page past a horizontal carousel.
          "flex touch-pinch-zoom",
          orientation === "horizontal" ? "-ms-4 touch-pan-y" : "-mt-4 flex-col touch-pan-x",
          className,
        )}
        {...props}
      />
    </div>
  );
}

/**
 * One slide. Resolves its own index from Embla's slide list, so the visibility
 * state always matches what Embla reports rather than a mount-order guess.
 *
 * Out-of-view slides get `inert` (removes their content from the tab order and
 * from hit-testing) plus `aria-hidden`. `inert` is a browser behaviour — jsdom
 * only stores the attribute, so the *effect* of inerting needs a real browser to
 * verify; the attribute contract is what the tests pin.
 *
 * If focus is inside a slide when it leaves the view (an arrow key pressed on a link in the
 * slide), focus moves to the slide that replaced it rather than falling to `<body>`.
 */
function CarouselItem({
  className,
  ref: forwardedRef,
  ...props
}: React.ComponentProps<"fieldset">) {
  const { orientation, api, slidesInView, slideCount, slidePositionLabel, resolvedMessages } =
    useCarousel();
  const nodeRef = React.useRef<HTMLFieldSetElement | null>(null);
  const [index, setIndex] = React.useState(-1);

  React.useEffect(() => {
    const node = nodeRef.current;
    if (!api || !node) return;
    const sync = () => setIndex(api.slideNodes().indexOf(node));
    sync();
    const events = ["reInit", "slidesChanged"] as const;
    for (const event of events) api.on(event, sync);
    return () => {
      for (const event of events) api.off(event, sync);
    };
  }, [api]);

  // Fail open: until Embla has reported visibility, nothing is hidden. A server
  // render, a failed init, or a single-slide carousel all stay fully operable.
  const offscreen = index >= 0 && slidesInView.length > 0 && !slidesInView.includes(index);
  const named = props["aria-label"] !== undefined || props["aria-labelledby"] !== undefined;
  const positionLabel =
    named || index < 0 || slideCount === 0
      ? undefined
      : slidePositionLabel
        ? slidePositionLabel(index, slideCount)
        : // The catalogue speaks in positions, not indices: `index + 1` is what a user hears.
          resolvedMessages.slidePosition(index + 1, slideCount);

  return (
    <fieldset
      ref={(node) => {
        nodeRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      data-slot="carousel-item"
      data-index={index >= 0 ? index : undefined}
      data-in-view={offscreen ? undefined : ""}
      aria-roledescription={resolvedMessages.slideRoleDescription}
      aria-label={positionLabel}
      aria-hidden={offscreen || undefined}
      inert={offscreen || undefined}
      className={cn(
        // A slide only takes focus when focus is rescued into it; the inset ring marks where.
        "min-w-0 shrink-0 grow-0 basis-full border-0 p-0 outline-none focus-visible:focus-ring-inset",
        orientation === "horizontal" ? "ps-4" : "pt-4",
        className,
      )}
      {...props}
    />
  );
}

/** Lets Previous/Next know they sit in a `CarouselControls` row rather than over the slides. */
const CarouselControlsContext = React.createContext(false);

/**
 * A row for the carousel's controls, below the slides: Previous, the indicators, Next.
 *
 * The overlay placement — round arrows floating outside the slides' edges — is the default for
 * Previous/Next on their own, and it assumes the page has room for them on either side. Inside
 * this row they render in flow, so the carousel fits a narrow panel, a card or a drawer.
 */
function CarouselControls({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <CarouselControlsContext.Provider value={true}>
      <div
        data-slot="carousel-controls"
        className={cn("mt-3 flex items-center justify-center gap-2", className)}
        {...props}
      />
    </CarouselControlsContext.Provider>
  );
}

/** Shared by Previous/Next: where the button sits, and how it looks when it cannot move. */
function navigationClassName(
  inControls: boolean,
  orientation: "horizontal" | "vertical",
  edge: "start" | "end",
) {
  return cn(
    // Disabled stays focusable (see below), so the dimmed look is keyed off aria-disabled too.
    "aria-disabled:pointer-events-none aria-disabled:opacity-disabled",
    !inControls && [
      // Centred with `inset-* + margin: auto` rather than a translate, so Button's own 1px
      // press nudge does not fight a -50% centring transform (the old arrows jumped on press).
      "absolute rounded-full",
      orientation === "horizontal"
        ? ["inset-y-0 my-auto", edge === "start" ? "-start-12" : "-end-12"]
        : ["inset-x-0 mx-auto", edge === "start" ? "-top-12" : "-bottom-12"],
    ],
    orientation === "vertical" && "rotate-90",
  );
}

/*
 * Previous/Next stay focusable when there is nowhere to go (`focusableWhenDisabled`): pressing
 * Next onto the last slide would otherwise disable the very button that has focus, and focus
 * would fall to <body>. They announce `aria-disabled` instead and ignore activation.
 */
function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev, resolvedMessages } = useCarousel();
  const inControls = React.useContext(CarouselControlsContext);
  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        navigationClassName(inControls, orientation ?? "horizontal", "start"),
        className,
      )}
      disabled={!canScrollPrev}
      focusableWhenDisabled
      onClick={scrollPrev}
      aria-label={resolvedMessages.previousSlide}
      {...props}
    >
      {/* The button position flips via logical `-start`/`-end`; the glyph needs
          an explicit flip so it still points *away* from the current slide. */}
      <ChevronLeftIcon
        aria-hidden
        className={orientation === "horizontal" ? "rtl:rotate-180" : ""}
      />
    </Button>
  );
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext, resolvedMessages } = useCarousel();
  const inControls = React.useContext(CarouselControlsContext);
  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(navigationClassName(inControls, orientation ?? "horizontal", "end"), className)}
      disabled={!canScrollNext}
      focusableWhenDisabled
      onClick={scrollNext}
      aria-label={resolvedMessages.nextSlide}
      {...props}
    >
      <ChevronRightIcon
        aria-hidden
        className={orientation === "horizontal" ? "rtl:rotate-180" : ""}
      />
    </Button>
  );
}

/**
 * One button per scroll snap, the current one marked `aria-current` and drawn as a wider brand
 * pill — shape, not hue alone, carries "current". Each is named with its position from the
 * message catalogue ("2 of 5"). Renders nothing until there are two snaps to choose between.
 *
 * One tab stop: only the current indicator is in the tab order, and while focus is on the
 * indicators the carousel's arrow keys move both the slide and the focus — the APG picker
 * model, without a wall of tab stops on a long carousel. Each indicator keeps a 24px target
 * (WCAG 2.5.8) however small the visible mark.
 */
function CarouselIndicators({ className, ...props }: React.ComponentProps<"div">) {
  const { snapCount, selectedIndex, scrollTo, resolvedMessages } = useCarousel();
  const groupRef = React.useRef<HTMLDivElement>(null);

  // Keep focus with the current indicator when the selection moves under it.
  React.useEffect(() => {
    const group = groupRef.current;
    if (!group?.contains(group.ownerDocument.activeElement)) return;
    group.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)?.focus();
  }, [selectedIndex]);

  if (snapCount < 2) return null;
  return (
    // biome-ignore lint/a11y/useSemanticElements: a group of slide pickers; <fieldset> would add form semantics.
    <div
      ref={groupRef}
      role="group"
      data-slot="carousel-indicators"
      className={cn("flex items-center", className)}
      {...props}
    >
      {Array.from({ length: snapCount }, (_, index) => {
        const current = index === selectedIndex;
        return (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: a snap *is* its index.
            key={index}
            type="button"
            data-slot="carousel-indicator"
            data-index={index}
            aria-label={resolvedMessages.slidePosition(index + 1, snapCount)}
            aria-current={current ? "true" : undefined}
            tabIndex={current ? 0 : -1}
            onClick={() => scrollTo(index)}
            className="group/indicator inline-flex size-6 items-center justify-center rounded-full outline-none focus-visible:focus-ring"
          >
            <span
              aria-hidden
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-(--qx-motion-duration-fast) ease-standard",
                current
                  ? "w-4 bg-border-brand forced-colors:bg-[Highlight]"
                  : "w-1.5 bg-control group-hover/indicator:bg-control-hover forced-colors:bg-[CanvasText]",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export type { CarouselApi };
export {
  Carousel,
  CarouselContent,
  CarouselControls,
  CarouselIndicators,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
};
