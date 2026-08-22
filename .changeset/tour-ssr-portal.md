---
"@qeetrix/ui": patch
---

**Fixed: an open `Tour` crashed server rendering (`SSR-001`).** Tour called
`createPortal(..., document.body)` during render, so `defaultOpen` — a perfectly valid initial state,
and the one the component's own documentation example uses — threw
`ReferenceError: document is not defined` on the server. It now renders through the `Portal`
primitive, which already defers mounting to an effect: the server emits nothing, the first client
render matches that, and the overlay attaches once there is a document.

The `useLayoutEffect` server warning went with it. `TourStep` positions itself in a layout effect;
deferring the portal means it is never reached on the server, so an open tour now server-renders
with no console output at all rather than one crash and one warning.

Behaviour on the client is unchanged, with one consequence worth naming: Tour is now strictly
client-mounted, so it can never appear in server HTML. That is correct for an onboarding overlay,
but a consumer measuring first paint will not find it there.

**New: a no-DOM test environment.** The crash was not reproducible from inside the existing suite
and could not have been caught by adding a test to it — every file runs in jsdom, where `document`
exists. `src/__tests__/ssr.test.tsx` runs under `@vitest-environment node` and asserts that
`document` and `window` genuinely do not exist before asserting anything else. It covers Tour open
(controlled and uncontrolled), closed, and with no steps; `Portal` itself; and a static guard that
no production file outside `primitives/portal.tsx` imports `createPortal` — the regression guard for
this class of bug. `src/__tests__/setup.ts` now skips its jsdom polyfills when there is no `window`,
which is what makes server-behaviour test files possible at all.

A hydration case covers the other half: empty server output, zero recoverable errors, and the
overlay present in `document.body` afterwards.

`A11Y-002` is unaffected — Tour still declares `aria-modal` without inerting the page.
