/**
 * `scripts/lib/*.mjs` are deliberately untyped JavaScript so `node` can run them in CI without
 * a build. tsconfig.tests.json solves that for the other governance suites by excluding them
 * from `typecheck:tests` entirely — which also stops checking the *rest* of those files.
 *
 * A shorthand ambient declaration is the narrower fix: the module resolves as `any`, exactly as
 * it does in the excluded suites, while everything else in evidence.test.ts stays type-checked.
 * Nothing is duplicated here, so there is no second source of truth to drift.
 */
declare module "*/a11y-evidence.mjs";
