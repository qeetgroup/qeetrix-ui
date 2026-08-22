"use client";

/**
 * Focus containment, headless.
 *
 * The `runtime` layer holds framework-level behaviour with no markup: this module decides what
 * is focusable and how Tab cycles, and knows nothing about how a trap looks. The component
 * wrapper lives at src/components/utility/focus-trap.tsx and re-exports these.
 *
 * A trap is a containment *boundary*, not a Tab handler. Focus reaches a boundary three ways —
 * the keyboard, a script calling `.focus()`, and the browser moving focus after the focused
 * element is removed — so all three are handled. Only the innermost active trap enforces,
 * which is what makes nesting work.
 *
 * @see docs/architecture/component-layers.md
 * @see docs/standards/focus-management.md
 */

import * as React from "react";
import { isTopFocusLayer, registerFocusLayer } from "@/runtime/overlay";

/**
 * CSS selector that enumerates every natively-focusable element type.
 *
 * Disabled controls, `tabindex="-1"` (and any other negative value) and hidden inputs are
 * excluded: they are focusable programmatically but never by Tab, so they must not be the
 * first or last stop of a cycle. `details > summary` and `[contenteditable]` are included
 * because they are tabbable without carrying a tabindex.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "audio[controls]",
  "button:not([disabled])",
  "details > summary:first-of-type",
  "iframe",
  'input:not([disabled]):not([type="hidden"])',
  "object",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex^="-"])',
].join(", ");

/**
 * Whether a matched element can really be reached by Tab.
 *
 * The selector cannot express containment rules, so they are applied here. Geometry is
 * deliberately not consulted: a zero-size or `display: none` element is untabbable in a
 * browser, but jsdom reports every box as empty, so filtering on it would make the trap
 * behave differently in tests than in production.
 */
function isTabbable(element: HTMLElement): boolean {
  if (element.closest("[inert]")) return false;
  if (element.closest("[hidden]")) return false;
  if (element.closest("fieldset[disabled]")) return false;
  return element.getAttribute("aria-hidden") !== "true";
}

/** Every element inside `container` that Tab can reach, in document order. */
function getTabbables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isTabbable);
}

/** The `document.body` child that `node` lives under, or `null` if it is not in the body. */
function bodyLevelAncestor(node: Node): Element | null {
  const body = node.ownerDocument?.body ?? document.body;
  let current: Node | null = node;
  while (current?.parentNode && current.parentNode !== body) {
    current = current.parentNode;
  }
  return current?.parentNode === body ? (current as Element) : null;
}

/**
 * Whether focus landing on `target` outside `container` should be left alone.
 *
 * A menu, select or dialog opened from inside the trap is portalled to `document.body`, so it
 * is legitimately outside the trap's DOM subtree while being conceptually inside it. Portals
 * append, so such a surface is always a *later* `body` child than the trap's own root, while
 * the obscured page content the trap exists to protect is an earlier one. That ordering is
 * the test — it needs no cooperation from the nested surface, which may come from Base UI or
 * from consumer code.
 */
function isPortalledAboveTrap(container: HTMLElement, target: HTMLElement): boolean {
  const containerRoot = bodyLevelAncestor(container);
  const targetRoot = bodyLevelAncestor(target);
  if (!containerRoot || !targetRoot || containerRoot === targetRoot) return false;
  const position = containerRoot.compareDocumentPosition(targetRoot);
  return (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

interface UseFocusTrapOptions {
  /** Restore focus to the previously-focused element on deactivation. Defaults to `true`. */
  restoreFocus?: boolean;
  /** Element to focus on activation instead of the first focusable in the container. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Hook that constrains keyboard focus inside a container element.
 *
 * When `active` is `true`:
 * - Focuses `initialFocusRef.current`, else the first tabbable child, else the container
 *   itself — a trap whose content has not rendered yet still holds focus rather than leaving
 *   it on the element behind the overlay.
 * - Intercepts `Tab` / `Shift+Tab` anywhere in the document, so focus that is already outside
 *   is pulled back in rather than continuing through the page.
 * - Returns focus that arrives from a script, or from the browser after the focused element is
 *   removed, to the container.
 * - Yields to overlays portalled from inside it (a Select, a menu, a nested dialog) and to any
 *   trap activated on top of it.
 * - Restores focus to the previously-focused element on cleanup, if it is still in the
 *   document (if the trigger was removed while the trap was open, focus is left where the
 *   browser put it).
 *
 * Returns `{ containerRef }` — attach to the wrapping element.
 */
function useFocusTrap(
  active: boolean,
  options: UseFocusTrapOptions = {},
): { containerRef: React.RefObject<HTMLDivElement | null> } {
  const { restoreFocus = true, initialFocusRef } = options;
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const layerId = {};
    const deregisterLayer = registerFocusLayer(layerId);

    // Snapshot the element that held focus before the trap activated.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    /** Move focus to the first tabbable child, falling back to the container itself. */
    let addedTabIndex = false;
    function focusContainer() {
      const node = containerRef.current;
      if (!node) return;
      const target = getTabbables(node)[0];
      if (target) {
        target.focus();
        return;
      }
      if (!node.hasAttribute("tabindex")) {
        node.setAttribute("tabindex", "-1");
        addedTabIndex = true;
      }
      node.focus();
    }

    const initialTarget = initialFocusRef?.current;
    if (initialTarget?.isConnected) {
      initialTarget.focus();
    } else {
      focusContainer();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || event.defaultPrevented) return;
      if (!isTopFocusLayer(layerId)) return;

      const node = containerRef.current;
      if (!node) return;

      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement && isPortalledAboveTrap(node, activeElement)) return;

      // Re-read the tabbables on every keystroke: controls appear, disappear and become
      // disabled while an overlay is open.
      const tabbables = getTabbables(node);
      if (tabbables.length === 0) {
        event.preventDefault();
        focusContainer();
        return;
      }

      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];
      const isInside = activeElement !== null && node.contains(activeElement);

      if (!isInside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      if (!isTopFocusLayer(layerId)) return;

      const node = containerRef.current;
      const target = event.target as HTMLElement | null;
      if (!node || !target || node.contains(target)) return;
      if (isPortalledAboveTrap(node, target)) return;

      focusContainer();
    }

    // Removing the focused element drops focus to <body> without firing any focus event, so
    // the DOM mutation is the only signal that the trap has lost focus. Watching for it is
    // what keeps a trap holding focus while its content changes — a step of a wizard being
    // replaced, a row being deleted, a control being swapped for a spinner.
    const observer = new MutationObserver(() => {
      if (!isTopFocusLayer(layerId)) return;
      const node = containerRef.current;
      if (!node) return;
      const activeElement = document.activeElement;
      if (activeElement && node.contains(activeElement)) return;
      if (activeElement !== null && activeElement !== document.body) return;
      focusContainer();
    });
    observer.observe(container, { childList: true, subtree: true });

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", handleFocusIn, true);

    // Passive, not layout: the modal runtime releases `inert` in a layout cleanup, and focus
    // cannot be restored to a trigger that is still inert. See useModalOverlay.
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      deregisterLayer();

      if (addedTabIndex) containerRef.current?.removeAttribute("tabindex");
      if (restoreFocus && previouslyFocused?.isConnected) {
        previouslyFocused.focus?.();
      }
    };
  }, [active, restoreFocus, initialFocusRef]);

  return { containerRef };
}

export type { UseFocusTrapOptions };
export { FOCUSABLE_SELECTOR, useFocusTrap };
