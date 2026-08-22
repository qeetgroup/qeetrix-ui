import { act, fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/data-display/carousel";
import { DirectionProvider } from "@/providers/direction-provider";

/*
 * ── Fake Embla ─────────────────────────────────────────────────────────────────────────────
 *
 * Embla derives `slidesInView()` from an IntersectionObserver and from its own
 * measurements, neither of which produces anything useful in jsdom (no layout,
 * stubbed observer). The visibility state machine therefore cannot be driven
 * through the real library here.
 *
 * `embla-carousel-react` is mocked so that it is the *real* hook by default —
 * every test above this point exercises the genuine integration — and a
 * test-driven fake when `fake.enabled` is set. Nothing switches mid-test, so the
 * hook order stays stable.
 */
const fake = vi.hoisted(() => ({
  enabled: false,
  inView: [] as number[],
  options: undefined as Record<string, unknown> | undefined,
  withAutoplay: false,
  container: null as HTMLElement | null,
  listeners: new Map<string, Set<(api: unknown, event: string) => void>>(),
  api: null as ReturnType<() => unknown> | null,
  scrollPrev: vi.fn(),
  scrollNext: vi.fn(),
  autoplayStop: vi.fn(),
  autoplayPlay: vi.fn(),
}));

vi.mock("embla-carousel-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("embla-carousel-react")>();

  // No React hooks in here: the fake keeps its identity in `fake` (reset per
  // test) so the mock can stay a plain function. A conditionally-called hook
  // would be a rules-of-hooks violation even in a test double.
  const emblaRef = (node: HTMLElement | null) => {
    fake.container = node;
  };
  const makeApi = () => {
    const self = {
      slideNodes: () => [
        ...(fake.container?.querySelectorAll<HTMLElement>("[data-slot='carousel-item']") ?? []),
      ],
      slidesInView: () => fake.inView,
      canScrollPrev: () => true,
      canScrollNext: () => true,
      scrollPrev: fake.scrollPrev,
      scrollNext: fake.scrollNext,
      selectedScrollSnap: () => 0,
      plugins: () =>
        fake.withAutoplay ? { autoplay: { stop: fake.autoplayStop, play: fake.autoplayPlay } } : {},
      on: (event: string, cb: (api: unknown, event: string) => void) => {
        if (!fake.listeners.has(event)) fake.listeners.set(event, new Set());
        fake.listeners.get(event)?.add(cb);
        return self;
      },
      off: (event: string, cb: (api: unknown, event: string) => void) => {
        fake.listeners.get(event)?.delete(cb);
        return self;
      },
    };
    return self;
  };

  return {
    ...actual,
    default: (...args: Parameters<typeof actual.default>) => {
      if (!fake.enabled) return actual.default(...args);
      fake.options = args[0] as Record<string, unknown>;
      // Stable across renders within a test: Carousel's effects key off it.
      fake.api ??= makeApi();
      return [emblaRef, fake.api] as unknown as ReturnType<typeof actual.default>;
    },
  };
});

/** Emit an Embla event to everything currently subscribed to the fake. */
function emit(event: string) {
  const api = fake.api;
  if (!api) return;
  act(() => {
    for (const cb of [...(fake.listeners.get(event) ?? [])]) cb(api, event);
  });
}

function setMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const originalMatchMedia = window.matchMedia;

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

function CarouselExample() {
  return (
    <Carousel aria-label="Featured products">
      <CarouselContent>
        <CarouselItem>Slide one</CarouselItem>
        <CarouselItem>Slide two</CarouselItem>
        <CarouselItem>Slide three</CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}

describe("Carousel", () => {
  it("exposes a labelled carousel region", () => {
    render(<CarouselExample />);
    const region = screen.getByRole("region", { name: "Featured products" });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
  });

  it("renders each slide as a group with the slide roledescription", () => {
    render(<CarouselExample />);
    const slides = screen.getAllByRole("group");
    expect(slides).toHaveLength(3);
    for (const slide of slides) {
      expect(slide).toHaveAttribute("aria-roledescription", "slide");
    }
  });

  it("gives the previous/next controls accessible names", () => {
    render(<CarouselExample />);
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeInTheDocument();
  });

  it("disables the previous control at the start", () => {
    render(<CarouselExample />);
    // No slides scrolled past yet, so there is nothing to go back to.
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled();
  });

  it("moves the real Embla carousel with the arrow keys", () => {
    // The fake-Embla suite below proves the key *mapping*; this proves the wiring reaches
    // the genuine library, by spying on the API the component was handed.
    let api: CarouselApi;
    render(
      <Carousel aria-label="Featured products" setApi={(a) => (api = a)}>
        <CarouselContent>
          <CarouselItem>Slide one</CarouselItem>
          <CarouselItem>Slide two</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    const scrollNext = vi.spyOn(api as NonNullable<CarouselApi>, "scrollNext");
    const scrollPrev = vi.spyOn(api as NonNullable<CarouselApi>, "scrollPrev");
    const region = screen.getByRole("region", { name: "Featured products" });

    // `fireEvent` returns false when the handler called preventDefault, so this asserts the
    // key was *claimed* as well as acted on.
    expect(fireEvent.keyDown(region, { key: "ArrowRight" })).toBe(false);
    expect(scrollNext).toHaveBeenCalledTimes(1);
    expect(fireEvent.keyDown(region, { key: "ArrowLeft" })).toBe(false);
    expect(scrollPrev).toHaveBeenCalledTimes(1);
  });

  it("leaves keys it does not own alone, and respects a modifier", () => {
    render(<CarouselExample />);
    const region = screen.getByRole("region", { name: "Featured products" });
    for (const event of [
      { key: "Home" },
      { key: "Tab" },
      { key: "a" },
      // Browser and OS shortcuts live on the modified arrows; claiming them would break
      // "back" and word-wise caret movement.
      { key: "ArrowRight", altKey: true },
      { key: "ArrowRight", ctrlKey: true },
      { key: "ArrowRight", metaKey: true },
      { key: "ArrowRight", shiftKey: true },
    ]) {
      expect(fireEvent.keyDown(region, event)).toBe(true);
    }
  });

  it("lets a caller's onKeyDown pre-empt the carousel by preventing default", () => {
    const onKeyDown = vi.fn((e: React.KeyboardEvent) => e.preventDefault());
    render(
      <Carousel aria-label="Guarded" onKeyDown={onKeyDown}>
        <CarouselContent>
          <CarouselItem>One</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    const region = screen.getByRole("region", { name: "Guarded" });
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    // Nothing to assert on the API here — the point is that the handler bailed rather than
    // scrolling on top of the caller's own handling.
    expect(region).toBeInTheDocument();
  });

  it("maps vertical navigation to ArrowUp and ArrowDown", () => {
    render(
      <Carousel orientation="vertical" aria-label="Vertical gallery">
        <CarouselContent>
          <CarouselItem>Slide one</CarouselItem>
          <CarouselItem>Slide two</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    const region = screen.getByRole("region", { name: "Vertical gallery" });

    expect(fireEvent.keyDown(region, { key: "ArrowUp" })).toBe(false);
    expect(fireEvent.keyDown(region, { key: "ArrowDown" })).toBe(false);
    expect(fireEvent.keyDown(region, { key: "ArrowLeft" })).toBe(true);
    expect(fireEvent.keyDown(region, { key: "ArrowRight" })).toBe(true);
  });

  it("does not claim arrow keys from descendant editing controls", () => {
    render(
      <Carousel aria-label="Editable gallery">
        <input aria-label="Slide title" />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Slide zoom"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={50}
        />
      </Carousel>,
    );

    expect(
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Slide title" }), {
        key: "ArrowRight",
      }),
    ).toBe(true);
    expect(
      fireEvent.keyDown(screen.getByRole("slider", { name: "Slide zoom" }), {
        key: "ArrowLeft",
      }),
    ).toBe(true);
  });

  it("has no axe violations", async () => {
    const { container } = render(<CarouselExample />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/* ── Fake-Embla behaviour: slide visibility, direction, reduced motion ───────────────────── */

/** Scoped so the real-Embla suite above never sees `fake.enabled`. */
function withFakeEmbla() {
  beforeEach(() => {
    fake.enabled = true;
    fake.inView = [];
    fake.options = undefined;
    fake.withAutoplay = false;
    fake.container = null;
    fake.listeners = new Map();
    fake.api = null;
    fake.scrollPrev.mockClear();
    fake.scrollNext.mockClear();
    fake.autoplayStop.mockClear();
    fake.autoplayPlay.mockClear();
    window.matchMedia = originalMatchMedia;
  });
  afterEach(() => {
    fake.enabled = false;
  });
}

function Gallery({ dir }: { dir?: "ltr" | "rtl" } = {}) {
  return (
    <div dir={dir}>
      <Carousel aria-label="Featured products">
        <CarouselContent>
          <CarouselItem>
            <button type="button">Buy one</button>
          </CarouselItem>
          <CarouselItem>
            <button type="button">Buy two</button>
          </CarouselItem>
          <CarouselItem>
            <button type="button">Buy three</button>
          </CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

const items = () => [...document.querySelectorAll<HTMLElement>("[data-slot='carousel-item']")];

describe("Carousel slide visibility", () => {
  withFakeEmbla();

  it("inerts and hides every slide Embla does not report as in view", () => {
    render(<Gallery />);
    fake.inView = [0];
    emit("slidesInView");

    const [first, second, third] = items();
    expect(first).not.toHaveAttribute("inert");
    expect(first).not.toHaveAttribute("aria-hidden");
    expect(first).toHaveAttribute("data-in-view", "");

    for (const offscreen of [second, third]) {
      // jsdom stores `inert` but does not implement its behaviour — that the
      // inner button is really unreachable needs a real browser to confirm.
      expect(offscreen).toHaveAttribute("inert");
      expect(offscreen).toHaveAttribute("aria-hidden", "true");
      expect(offscreen).not.toHaveAttribute("data-in-view");
    }
  });

  it("moves the inert state as the visible window changes", () => {
    render(<Gallery />);
    fake.inView = [0];
    emit("slidesInView");
    expect(items()[0]).not.toHaveAttribute("inert");

    fake.inView = [2];
    emit("slidesInView");
    const [first, second, third] = items();
    expect(first).toHaveAttribute("inert");
    expect(second).toHaveAttribute("inert");
    expect(third).not.toHaveAttribute("inert");
    expect(third).not.toHaveAttribute("aria-hidden");
  });

  it("keeps every slide operable while visibility is still unknown", () => {
    render(<Gallery />);
    // No slidesInView event yet: fail open rather than hide everything.
    for (const item of items()) {
      expect(item).not.toHaveAttribute("inert");
      expect(item).not.toHaveAttribute("aria-hidden");
    }
    expect(screen.getByRole("button", { name: "Buy three" })).toBeInTheDocument();
  });

  it("keeps several visible slides operable when more than one is in view", () => {
    render(<Gallery />);
    fake.inView = [0, 1];
    emit("slidesInView");
    const [first, second, third] = items();
    expect(first).not.toHaveAttribute("inert");
    expect(second).not.toHaveAttribute("inert");
    expect(third).toHaveAttribute("inert");
  });

  it("names each slide with its position", () => {
    render(<Gallery />);
    fake.inView = [0];
    emit("slidesInView");
    expect(items().map((s) => s.getAttribute("aria-label"))).toEqual([
      "1 of 3",
      "2 of 3",
      "3 of 3",
    ]);
    expect(items()[0]).toHaveAttribute("aria-roledescription", "slide");
  });

  it("removes offscreen slides from the accessibility tree", () => {
    render(<Gallery />);
    fake.inView = [1];
    emit("slidesInView");
    // Role queries walk the a11y tree, so only the visible slide is reachable.
    const exposed = screen.getAllByRole("group");
    expect(exposed).toHaveLength(1);
    expect(exposed[0]).toHaveAttribute("aria-label", "2 of 3");
    expect(screen.queryByRole("button", { name: "Buy one" })).toBeNull();
    expect(screen.getByRole("button", { name: "Buy two" })).toBeInTheDocument();
  });

  it("lets a slide keep its own accessible name", () => {
    render(
      <Carousel aria-label="Named">
        <CarouselContent>
          <CarouselItem aria-label="Autumn collection">One</CarouselItem>
          <CarouselItem>Two</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    emit("slidesChanged");
    const slides = screen.getAllByRole("group");
    expect(slides[0]).toHaveAttribute("aria-label", "Autumn collection");
    expect(slides[1]).toHaveAttribute("aria-label", "2 of 2");
  });

  it("accepts a translated position label", () => {
    render(
      <Carousel aria-label="Traduit" slidePositionLabel={(i, n) => `Diapositive ${i + 1} sur ${n}`}>
        <CarouselContent>
          <CarouselItem>Un</CarouselItem>
          <CarouselItem>Deux</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    emit("slidesChanged");
    expect(screen.getAllByRole("group")[1]).toHaveAttribute("aria-label", "Diapositive 2 sur 2");
  });

  it("has no axe violations with focusable content inside an inert slide", async () => {
    const { container } = render(<Gallery />);
    fake.inView = [0];
    emit("slidesInView");
    expect(
      await axe(container, {
        rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
      }),
    ).toHaveNoViolations();
  });
});

describe("Carousel direction", () => {
  withFakeEmbla();

  it("passes ltr to Embla and keeps ArrowRight as next", () => {
    render(<Gallery />);
    expect(fake.options?.direction).toBe("ltr");
    const region = screen.getByRole("region", { name: "Featured products" });
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(fake.scrollPrev).toHaveBeenCalledTimes(1);
  });

  it("reads rtl from the nearest dir attribute and flips the arrow keys", () => {
    render(<Gallery dir="rtl" />);
    expect(fake.options?.direction).toBe("rtl");
    expect(screen.getByRole("region", { name: "Featured products" })).toHaveAttribute(
      "data-direction",
      "rtl",
    );

    const region = screen.getByRole("region", { name: "Featured products" });
    // In RTL the next slide is to the *left*.
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);
    expect(fake.scrollPrev).not.toHaveBeenCalled();

    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(fake.scrollPrev).toHaveBeenCalledTimes(1);
  });

  it("does not flip vertical carousels in rtl", () => {
    render(
      <div dir="rtl">
        <Carousel orientation="vertical" aria-label="Vertical">
          <CarouselContent>
            <CarouselItem>One</CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>,
    );
    const region = screen.getByRole("region", { name: "Vertical" });
    fireEvent.keyDown(region, { key: "ArrowDown" });
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(region, { key: "ArrowUp" });
    expect(fake.scrollPrev).toHaveBeenCalledTimes(1);
  });

  it("takes direction from a DirectionProvider, with no dir attribute in between", () => {
    // The contract path: a provider answers during render, so the value is right on the
    // first commit rather than after a layout effect.
    render(
      <DirectionProvider direction="rtl">
        <Carousel aria-label="Provided">
          <CarouselContent>
            <CarouselItem>One</CarouselItem>
          </CarouselContent>
        </Carousel>
      </DirectionProvider>,
    );
    expect(fake.options?.direction).toBe("rtl");
    const region = screen.getByRole("region", { name: "Provided" });
    expect(region).toHaveAttribute("data-direction", "rtl");
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);
  });

  it("takes direction from a locale-only provider", () => {
    render(
      <DirectionProvider locale="he-IL">
        <Carousel aria-label="Hebrew">
          <CarouselContent>
            <CarouselItem>One</CarouselItem>
          </CarouselContent>
        </Carousel>
      </DirectionProvider>,
    );
    expect(fake.options?.direction).toBe("rtl");
  });

  it("lets a nested provider hold an ltr carousel inside an rtl page", () => {
    render(
      <div dir="rtl">
        <DirectionProvider direction="ltr">
          <Carousel aria-label="Island">
            <CarouselContent>
              <CarouselItem>One</CarouselItem>
            </CarouselContent>
          </Carousel>
        </DirectionProvider>
      </div>,
    );
    expect(fake.options?.direction).toBe("ltr");
    const region = screen.getByRole("region", { name: "Island" });
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);
  });

  it("lets an explicit opts.direction win over the DOM", () => {
    render(
      <div dir="rtl">
        <Carousel opts={{ direction: "ltr" }} aria-label="Forced">
          <CarouselContent>
            <CarouselItem>One</CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>,
    );
    expect(fake.options?.direction).toBe("ltr");
  });
});

describe("Carousel reduced motion", () => {
  withFakeEmbla();

  it("leaves Embla's own scroll duration alone by default", () => {
    setMatchMedia(false);
    render(<Gallery />);
    // Absent, not `undefined`: Embla merges by key presence, so sending the key
    // at all would overwrite its default duration.
    expect(fake.options && "duration" in fake.options).toBe(false);
  });

  it("collapses the scroll duration to zero when reduced motion is requested", () => {
    setMatchMedia(true);
    render(<Gallery />);
    expect(fake.options?.duration).toBe(0);
  });

  it("keeps a caller's duration when motion is allowed", () => {
    setMatchMedia(false);
    render(
      <Carousel opts={{ duration: 40 }} aria-label="Slow">
        <CarouselContent>
          <CarouselItem>One</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    expect(fake.options?.duration).toBe(40);
  });

  it("overrides a caller's duration under reduced motion", () => {
    setMatchMedia(true);
    render(
      <Carousel opts={{ duration: 40 }} aria-label="Slow">
        <CarouselContent>
          <CarouselItem>One</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    expect(fake.options?.duration).toBe(0);
  });

  it("stops an autoplay plugin under reduced motion, and again when it could restart", () => {
    setMatchMedia(true);
    fake.withAutoplay = true;
    render(<Gallery />);
    expect(fake.autoplayStop).toHaveBeenCalled();

    const callsAfterMount = fake.autoplayStop.mock.calls.length;
    emit("settle");
    expect(fake.autoplayStop.mock.calls.length).toBeGreaterThan(callsAfterMount);
  });

  it("does not touch autoplay when motion is allowed", () => {
    setMatchMedia(false);
    fake.withAutoplay = true;
    render(<Gallery />);
    emit("settle");
    expect(fake.autoplayStop).not.toHaveBeenCalled();
  });

  it("ignores plugins that expose no stop()", () => {
    setMatchMedia(true);
    fake.withAutoplay = false;
    expect(() => render(<Gallery />)).not.toThrow();
  });

  it("exposes the buttons regardless of motion preference", () => {
    setMatchMedia(true);
    render(<Gallery />);
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeInTheDocument();
  });
});
