/**
 * `noUncheckedSideEffectImports` is on, so a bare `import "…/index.css"` needs a declaration.
 * The browser setup imports the real stylesheet because these tests assert geometry, and
 * Qeetrix geometry comes from Tailwind utilities — an unstyled div would make every reflow
 * assertion pass regardless of the component.
 *
 * Scoped to this directory: the jsdom suites do not import CSS, and they should not start.
 */
declare module "*.css";
