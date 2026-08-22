"use client";

/**
 * Overlay runtime — the mechanics every modal surface needs and none of them should own.
 *
 * Base UI-backed overlays (Dialog, Sheet, Popover, the menus) already get inerting, scroll
 * locking and focus containment from the primitive. The bespoke surfaces — Tour, and any
 * consumer overlay built on the public `FocusTrap` — had none of it, and each near-miss
 * reimplementation is a different set of bugs. This module is the one implementation they
 * share: a focus-layer stack, a refcounted scroll lock, and background inerting.
 *
 * Deliberately headless and framework-level: it manipulates `document` and nothing else. No
 * markup, no styling, no component knowledge.
 *
 * @see docs/architecture/component-layers.md
 * @see docs/standards/focus-management.md
 */

import * as React from "react";

/* ── Overlay roots ─────────────────────────────────────────────────────────────────────────
 * Background inerting works by attribute, not by element identity, so an overlay does not
 * have to thread refs through its own tree to be recognised. Anything carrying this
 * attribute is overlay chrome: it is never inerted, and it is not counted as background.
 */

/** Marks an element as overlay chrome, exempting it from background inerting. */
const OVERLAY_ROOT_ATTRIBUTE = "data-qx-overlay-root";

/** Elements that are never rendered, so inerting them would be noise. */
const NON_RENDERED_TAGS = new Set([
  "BASE",
  "LINK",
  "META",
  "NOSCRIPT",
  "SCRIPT",
  "STYLE",
  "TEMPLATE",
  "TITLE",
]);

/* ── Focus layer stack ─────────────────────────────────────────────────────────────────────
 * Nested traps are the reason this exists. Two active traps both listening for Tab and both
 * pulling focus back would fight; the stack decides which one is in charge — the last one to
 * activate. Registration is imperative (no re-render) because containment is enforced from
 * event handlers, which read the stack at event time.
 */

const focusLayers: object[] = [];

/** Register a focus layer. Returns the deregistration function. */
function registerFocusLayer(id: object): () => void {
  focusLayers.push(id);
  return () => {
    const index = focusLayers.lastIndexOf(id);
    if (index !== -1) focusLayers.splice(index, 1);
  };
}

/** Whether `id` is the innermost registered focus layer, and so the one that owns focus. */
function isTopFocusLayer(id: object): boolean {
  return focusLayers.length > 0 && focusLayers[focusLayers.length - 1] === id;
}

/* ── Scroll lock ───────────────────────────────────────────────────────────────────────────
 * Refcounted, because a dialog opening over a tour must not unlock the page when it closes.
 * The gutter compensation replaces the width of the scrollbar that `overflow: hidden`
 * removes, so locking does not shift the page sideways.
 */

let scrollLockCount = 0;
let scrollLockRestore: { overflow: string; paddingInlineEnd: string } | null = null;

function lockScroll(): void {
  scrollLockCount += 1;
  if (scrollLockCount > 1) return;

  const { body, documentElement } = document;
  scrollLockRestore = {
    overflow: body.style.overflow,
    paddingInlineEnd: body.style.paddingInlineEnd,
  };

  // jsdom performs no layout, so clientWidth is 0 there and the gutter stays 0 — a real
  // browser is needed to observe the compensation.
  const clientWidth = documentElement.clientWidth;
  const gutter = clientWidth > 0 ? Math.max(0, window.innerWidth - clientWidth) : 0;

  body.style.overflow = "hidden";
  if (gutter > 0) body.style.paddingInlineEnd = `${gutter}px`;
}

function unlockScroll(): void {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount > 0 || !scrollLockRestore) return;

  document.body.style.overflow = scrollLockRestore.overflow;
  document.body.style.paddingInlineEnd = scrollLockRestore.paddingInlineEnd;
  scrollLockRestore = null;
}

/* ── Background inerting ───────────────────────────────────────────────────────────────────
 * `inert` rather than `aria-hidden`: it removes the subtree from the tab order, from hit
 * testing and from the accessibility tree in one attribute, and unlike `aria-hidden` it does
 * not create an "aria-hidden element contains focusable content" violation on the way.
 *
 * Per-element refcounting means nested overlays compose: the second overlay inerts the
 * first, and closing it restores exactly what it changed. Elements that were already inert
 * before any overlay opened are left alone on the way out.
 */

const inertCounts = new WeakMap<Element, number>();
const preExistingInert = new WeakSet<Element>();

/**
 * Inert every background sibling of the overlay in `document.body`. Returns the restore
 * function.
 *
 * Background is decided when the overlay opens: elements that appear afterwards (the
 * overlay's own portal, a toast, an overlay opened on top) are left operable.
 */
function inertBackground(): () => void {
  const marked: Element[] = [];

  for (const child of Array.from(document.body.children)) {
    if (NON_RENDERED_TAGS.has(child.tagName)) continue;
    if (child.hasAttribute(OVERLAY_ROOT_ATTRIBUTE)) continue;
    // Live regions stay announceable: a toast raised while a modal is open still reaches
    // assistive technology, which is the whole point of a live region.
    if (child.hasAttribute("aria-live") || child.querySelector("[aria-live]")) continue;

    const count = (inertCounts.get(child) ?? 0) + 1;
    inertCounts.set(child, count);
    marked.push(child);

    if (count === 1 && child.hasAttribute("inert")) {
      preExistingInert.add(child);
    }
    if (!child.hasAttribute("inert")) child.setAttribute("inert", "");
  }

  return () => {
    for (const element of marked) {
      const count = (inertCounts.get(element) ?? 1) - 1;
      inertCounts.set(element, count);
      if (count > 0) continue;
      if (!preExistingInert.has(element)) element.removeAttribute("inert");
      preExistingInert.delete(element);
    }
  };
}

/* ── useModalOverlay ───────────────────────────────────────────────────────────────────────*/

/**
 * `useLayoutEffect` on the client, `useEffect` on the server, which has no layout to run and
 * warns if asked to.
 */
const useIsomorphicLayoutEffect =
  typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;

interface UseModalOverlayOptions {
  /** Lock page scroll while the overlay is open. Defaults to `true`. */
  scrollLock?: boolean;
  /** Inert the background while the overlay is open. Defaults to `true`. */
  inertBackground?: boolean;
}

/**
 * Applies the non-focus half of modal behaviour: page scroll lock and background inerting,
 * both refcounted so nested overlays compose.
 *
 * Pair it with `useFocusTrap` for containment. Mark the overlay's own portal roots with
 * `OVERLAY_ROOT_ATTRIBUTE` so they are not inerted as background.
 *
 * **This runs as a layout effect on purpose, and `useFocusTrap` runs as a passive one.** The
 * two have to be released in that order: focus cannot be restored to a trigger that is still
 * inside an inert subtree, and React always runs layout cleanups before passive ones, whether
 * the overlay closed by a state change or by unmounting. Moving either to the other kind of
 * effect silently breaks focus restoration in browsers — and not in jsdom, which ignores
 * `inert` and would keep the tests green.
 *
 * `inert` is not implemented by jsdom, so tests can assert that the attribute is applied but
 * not that focus is actually excluded — that needs a real browser.
 */
function useModalOverlay(active: boolean, options: UseModalOverlayOptions = {}): void {
  const { scrollLock = true, inertBackground: inert = true } = options;

  useIsomorphicLayoutEffect(() => {
    if (!active) return;

    if (scrollLock) lockScroll();
    const restoreInert = inert ? inertBackground() : null;

    return () => {
      restoreInert?.();
      if (scrollLock) unlockScroll();
    };
  }, [active, scrollLock, inert]);
}

export type { UseModalOverlayOptions };
export { isTopFocusLayer, OVERLAY_ROOT_ATTRIBUTE, registerFocusLayer, useModalOverlay };
