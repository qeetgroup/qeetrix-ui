// Type augmentation for vitest-axe's `toHaveNoViolations` matcher.
//
// vitest-axe@0.1.0 ships its own augmentation, but it targets the legacy
// global `Vi` namespace which vitest@4 no longer uses for `Assertion`, so the
// matcher isn't typed out of the box. This augments the modern `vitest` module
// interface instead. The runtime matcher is registered in ./setup.ts.
import "vitest";

declare module "vitest" {
  // biome-ignore lint/suspicious/noExplicitAny: matcher shim mirrors vitest-axe's own untyped signature.
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): unknown;
  }
}
