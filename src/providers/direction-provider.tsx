"use client";

import {
  DirectionProvider as BaseDirectionProvider,
  useDirection as useBaseDirection,
} from "@base-ui/react/direction-provider";
import * as React from "react";

import type { Direction } from "@/contracts/direction";
import type { LogicalDirection, Direction as RuntimeDirection } from "@/lib/direction";
import {
  directionForLocale,
  directionFromDom,
  logicalDirectionForKey,
  sequentialArrowKeys,
} from "@/lib/direction";
import { cn } from "@/lib/utils";

/**
 * `Direction` is declared twice on purpose: `src/contracts/direction.ts` is the vocabulary the
 * build scripts read, and `src/lib/direction.ts` is the runtime, which may not import contracts
 * (see src/contracts/layers.ts). This module can see both, so it is where the two are pinned
 * together — every assignment below crosses the boundary, and stops compiling if the unions
 * ever diverge.
 */
const asRuntime = (direction: Direction): RuntimeDirection => direction;

/**
 * `useLayoutEffect` on the client, `useEffect` on the server, which has no layout to run and
 * warns if asked to. Same shape as the copy in `src/runtime/overlay.ts`.
 */
const useIsomorphicLayoutEffect =
  typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;

interface DirectionProviderProps extends Omit<React.ComponentProps<"div">, "dir" | "lang"> {
  /**
   * Reading direction. Defaults to the direction implied by `locale`, or `"ltr"` when neither
   * is given.
   */
  direction?: Direction;
  /**
   * BCP-47 locale for the subtree, e.g. `"ar-EG"`, `"de-DE"`, `"en-IN"`.
   *
   * Two jobs. It supplies `direction` when that is not given explicitly, so
   * `<DirectionProvider locale="ar-EG">` is RTL without the caller restating it. And it is
   * published to descendants through `useLocale()`, which is how a numeric field learns which
   * decimal separator to accept and a calendar learns which day the week starts on — see
   * `parseLocaleNumber` and `localeWeekStart` in `@/lib/locale`.
   *
   * It is also set as `lang` on the wrapper, so the browser hyphenates, spell-checks and
   * speaks the subtree correctly.
   *
   * The library never *detects* a locale. Choosing one is the host application's decision.
   */
  locale?: string;
}

interface DirectionContextValue {
  direction: Direction;
  locale?: string;
}

/**
 * Qeetrix's own direction/locale context.
 *
 * Separate from Base UI's direction context — which carries only a direction, and is what makes
 * *their* menus, sliders and selects flip — for two reasons: it also carries the locale, and a
 * component needs to distinguish "nobody declared a direction" from "somebody declared ltr".
 * Base UI's hook answers `"ltr"` for both, which makes it impossible to know whether the DOM is
 * worth consulting. `null` here means unset.
 */
const DirectionContext = React.createContext<DirectionContextValue | null>(null);

/**
 * Declares the reading direction, and optionally the locale, for a subtree.
 *
 * Wraps Base UI's direction context and renders a wrapper carrying `dir`, so CSS logical
 * properties and Tailwind `rtl:` variants resolve too. Qeetrix components style with logical
 * utilities (`ps-`/`pe-`, `ms-`/`me-`, `start-`/`end-`), so most mirror with no JavaScript
 * involved at all; this provider exists for the ones whose *behaviour* has a direction — an
 * arrow key that expands a tree, a drag whose delta flips sign.
 *
 * For whole-app RTL, set `dir` on `<html>` as well. Components resolve direction from the DOM
 * when no provider is present, so that path works; a provider is what makes the value available
 * during render, before first paint, and on the server.
 *
 * `<DirectionProvider locale="ar-EG">` gives the subtree `direction: "rtl"` and
 * `locale: "ar-EG"`; `<DirectionProvider direction="rtl">` gives it a direction and no locale.
 */
function DirectionProvider({
  direction,
  locale,
  className,
  children,
  ...props
}: DirectionProviderProps) {
  const resolved: Direction = direction ?? (locale ? directionForLocale(locale) : "ltr");
  const value = React.useMemo<DirectionContextValue>(
    () => ({ direction: resolved, locale }),
    [resolved, locale],
  );

  return (
    <DirectionContext.Provider value={value}>
      <BaseDirectionProvider direction={asRuntime(resolved)}>
        <div
          data-slot="direction-provider"
          dir={resolved}
          lang={locale}
          className={cn("contents", className)}
          {...props}
        >
          {children}
        </div>
      </BaseDirectionProvider>
    </DirectionContext.Provider>
  );
}

/**
 * The locale declared by the nearest `DirectionProvider`, or `undefined`.
 *
 * `undefined` is meaningful and must be passed through rather than defaulted: every `Intl`
 * constructor reads it as "the runtime's own locale", which is the right answer when the host
 * application has not declared one. Substituting `"en-US"` would override a browser that
 * already knows better.
 */
function useLocale(): string | undefined {
  return React.useContext(DirectionContext)?.locale;
}

/**
 * The direction declared by the nearest provider — Qeetrix's or Base UI's — without consulting
 * the DOM. `"ltr"` when nothing declared one.
 *
 * Re-exported under Base UI's name for compatibility. Prefer `useResolvedDirection` inside a
 * component: this hook cannot see `<html dir="rtl">`, which is how most applications set
 * direction, and reports `"ltr"` inside one.
 */
function useDirection(): Direction {
  const own = React.useContext(DirectionContext);
  const base = useBaseDirection();
  return own?.direction ?? base;
}

/**
 * Resolved reading direction for a real subtree — the value a component should branch
 * *behaviour* on.
 *
 * Resolution order, first hit wins:
 *
 * 1. `override`: an explicit prop on the component. Always wins.
 * 2. The nearest `DirectionProvider`, Qeetrix's or Base UI's.
 * 3. The DOM: the nearest ancestor carrying `dir`, then the computed `direction`. This is what
 *    picks up `<html dir="rtl">`, a bare `<div dir>`, and `dir="auto"` (whose value only the
 *    browser knows, since it depends on the content).
 * 4. `"ltr"`.
 *
 * Steps 1 and 2 are available during render, including on the server. Step 3 is not — there is
 * no node yet and possibly no `document` — so a subtree that relies on it renders LTR for
 * exactly one commit and a layout effect corrects it before paint. That is deliberate: server
 * and client agree on the first pass, so hydration is clean, and behaviour only runs after
 * paint. A component whose *layout* depends on the value should be given a provider.
 *
 * **Known limit:** the DOM is read once per mount. Toggling `document.documentElement.dir`
 * afterwards does not re-run it, because observing every ancestor's attributes for every
 * direction-aware widget is not worth the cost. Applications that switch direction at runtime
 * should drive it through `DirectionProvider`, which is reactive.
 *
 * ```tsx
 * const rootRef = React.useRef<HTMLDivElement>(null);
 * const direction = useResolvedDirection(rootRef);
 * ```
 */
function useResolvedDirection(ref: DirectionRef, override?: Direction): Direction {
  const declared = React.useContext(DirectionContext)?.direction;
  const base = useBaseDirection();

  // `null` means "not read yet", which is distinct from a DOM that says "ltr".
  const [fromDom, setFromDom] = React.useState<Direction | null>(null);

  useIsomorphicLayoutEffect(() => {
    // Nothing to read: an override or a declared provider outranks the DOM anyway.
    if (override || declared) {
      setFromDom(null);
      return;
    }
    setFromDom(directionFromDom(ref.current) ?? null);
  }, [ref, override, declared]);

  if (override) return override;
  // A provider outranks the DOM: it is the more specific statement, and a provider nested
  // inside `<html dir="rtl">` has to be able to declare an LTR island.
  if (declared) return declared;
  return fromDom ?? base;
}

/**
 * A ref to the subtree root, accepted structurally rather than as `React.RefObject<Element>`.
 *
 * `RefObject<T>` has a mutable `current`, which makes it invariant in `T`: a
 * `RefObject<HTMLDivElement | null>` is *not* assignable to `RefObject<Element | null>`, so
 * every caller would need a cast. A readonly property is covariant, and these hooks only read.
 */
interface DirectionRef {
  readonly current: Element | null;
}

/** What `useDirectionalKeys` returns. */
interface DirectionalKeys {
  /** Resolved direction, as `useResolvedDirection` reports it. */
  direction: Direction;
  /** Previous/next physical arrow keys for a one-dimensional widget of this orientation. */
  arrowKeys: { previous: string; next: string };
  /** Direction-independent meaning of a `KeyboardEvent.key`, or `undefined` if not an arrow. */
  logical: (key: string) => LogicalDirection | undefined;
}

/**
 * `useResolvedDirection` plus the two derived values a keyboard handler actually wants.
 *
 * `logical(key)` turns a `KeyboardEvent.key` into direction-independent intent, so a handler
 * switches on `"inline-end"` instead of re-deriving which arrow that is; `arrowKeys` gives the
 * previous/next pair for widgets that compare against key names directly. Both delegate to
 * `@/lib/direction`, so a non-React caller gets identical answers.
 */
function useDirectionalKeys(
  ref: DirectionRef,
  orientation: "horizontal" | "vertical" = "horizontal",
  override?: Direction,
): DirectionalKeys {
  const direction = useResolvedDirection(ref, override);
  return React.useMemo(
    () => ({
      direction,
      arrowKeys: sequentialArrowKeys(asRuntime(direction), orientation),
      logical: (key: string) => logicalDirectionForKey(key, asRuntime(direction)),
    }),
    [direction, orientation],
  );
}

export type { Direction, DirectionalKeys, DirectionProviderProps, DirectionRef, LogicalDirection };
export { DirectionProvider, useDirection, useDirectionalKeys, useLocale, useResolvedDirection };
