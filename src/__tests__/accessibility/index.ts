/**
 * Accessibility test helpers.
 *
 * Small, transparent wrappers over Testing Library and vitest-axe. The point is to make the
 * *intent* of an accessibility assertion readable — `expectAccessibleName(button, "Close")` says
 * what it checks — while keeping the failure message the underlying matcher's, so a red test
 * still tells you what actually happened.
 *
 * Deliberately not a framework. Nothing here hides a query, invents a rule, or asserts more than
 * it says. If a helper would need options to be useful, write the assertion inline instead.
 *
 * @see docs/standards/accessibility.md
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect } from "vitest";
import { axe } from "vitest-axe";

/**
 * Rules that cannot be evaluated against a single component rendered in isolation.
 *
 * - `color-contrast` needs real layout and a working `getComputedStyle`, which jsdom does not
 *   provide. Contrast is covered properly by `bun run check:contrast`, against the tokens, in
 *   both themes.
 * - the rest are **document-scoped**: whether a heading follows the previous heading level, or
 *   whether content sits inside a landmark, is a property of the page that composes the
 *   component, not of the component. A `SecurityItem` that renders an `<h3>` is correct; the
 *   page that puts it under an `<h1>` is what the rule is really about.
 *
 * Pass `rules` to re-enable one when the test renders enough context for it to mean something.
 */
const NOT_EVALUABLE_IN_ISOLATION = {
  "color-contrast": { enabled: false },
  "heading-order": { enabled: false },
  region: { enabled: false },
  "page-has-heading-one": { enabled: false },
  "landmark-one-main": { enabled: false },
} as const;

/** Run axe over a container. */
export async function expectNoA11yViolations(
  container: Element,
  options: { rules?: Record<string, { enabled: boolean }> } = {},
) {
  const results = await axe(container, {
    rules: { ...NOT_EVALUABLE_IN_ISOLATION, ...options.rules },
  });
  expect(results).toHaveNoViolations();
}

/** The element's accessible name, computed the way an assistive technology would find it. */
export function expectAccessibleName(element: Element, name: string | RegExp) {
  // getByRole's name option runs the accessible-name computation, so round-tripping through it
  // asserts the real name rather than the presence of an attribute.
  const role = element.getAttribute("role");
  const matcher = typeof name === "string" ? name : name;
  if (role) {
    expect(screen.getByRole(role, { name: matcher })).toBe(element);
    return;
  }
  expect(element).toHaveAccessibleName(typeof name === "string" ? name : undefined);
}

/** The element's accessible description — `aria-describedby` or `aria-description`. */
export function expectAccessibleDescription(element: Element, description: string) {
  expect(element).toHaveAccessibleDescription(description);
}

/** The element currently holds DOM focus. */
export function expectFocus(element: Element | null) {
  expect(element).toHaveFocus();
}

/** Focus came back to where it started — the assertion an overlay test exists to make. */
export async function expectFocusRestored(trigger: Element) {
  await waitFor(() => expect(trigger).toHaveFocus());
}

// ── keys ─────────────────────────────────────────────────────────────────────────────────
// Thin named wrappers so a keyboard test reads as a sequence of key presses rather than a wall
// of `{ArrowDown}` strings.

const press = (key: string) => () => userEvent.keyboard(key);

export const pressTab = press("{Tab}");
export const pressShiftTab = press("{Shift>}{Tab}{/Shift}");
export const pressEnter = press("{Enter}");
export const pressSpace = press(" ");
export const pressEscape = press("{Escape}");
export const pressArrowUp = press("{ArrowUp}");
export const pressArrowDown = press("{ArrowDown}");
export const pressArrowLeft = press("{ArrowLeft}");
export const pressArrowRight = press("{ArrowRight}");
export const pressHome = press("{Home}");
export const pressEnd = press("{End}");

/** Type a string, for a type-ahead assertion. */
export const type = (text: string) => userEvent.keyboard(text);

/**
 * Tab `count` times and return the element focused after each press.
 *
 * Useful for asserting tab order, and for proving focus is contained: tabbing past the last
 * focusable in a trapped overlay must land back on the first.
 */
export async function tabThrough(count: number): Promise<(Element | null)[]> {
  const visited: (Element | null)[] = [];
  for (let index = 0; index < count; index += 1) {
    await pressTab();
    visited.push(document.activeElement);
  }
  return visited;
}

/** Assert an ARIA state, and that the attribute is the string ARIA expects rather than a boolean. */
export function expectAriaState(element: Element, attribute: string, value: string) {
  expect(element).toHaveAttribute(attribute, value);
}

/**
 * Assert that an `aria-*` relationship points at an element that exists and has content.
 *
 * A dangling `aria-describedby` is invisible in the DOM and invisible to axe when the target is
 * merely missing, so this is the assertion that catches an id that never rendered.
 */
export function expectAriaRelationship(
  element: Element,
  attribute: "aria-describedby" | "aria-labelledby" | "aria-controls" | "aria-activedescendant",
) {
  const ids = element.getAttribute(attribute);
  expect(ids, `${attribute} is absent`).toBeTruthy();
  for (const id of (ids ?? "").split(/\s+/).filter(Boolean)) {
    const target = document.getElementById(id);
    expect(target, `${attribute} references "${id}", which is not in the document`).not.toBeNull();
  }
}
