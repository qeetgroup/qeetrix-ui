/**
 * Real-browser proof for the two host-global media blocks in src/styles/base.css.
 *
 * `prefers-reduced-motion` and `forced-colors` are properties of the browser context, not of the
 * page, so this file runs in a second browser instance that has both switched on (see
 * vitest.browser.config.ts). jsdom evaluates no CSS cascade and no media query, so neither block
 * has ever been observed doing anything — `src/__tests__/token-governance.test.ts` asserts that
 * the *rules exist in the stylesheet*, which is a different claim from the rules applying.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/surfaces/dialog";

describe("base.css host-global media blocks", () => {
  it("collapses a declared 150ms transition to nothing under prefers-reduced-motion", () => {
    // Control first: without the emulation this whole file would be measuring the default
    // context and the assertion below would be about a stylesheet that never matched.
    expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);

    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>Review the details before continuing.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog");
    // The surface asks for 150ms in its own class list, so the near-zero computed value can only
    // come from the `!important` override in base.css winning.
    expect(dialog.className).toContain("duration-150");
    const seconds = Number.parseFloat(getComputedStyle(dialog).transitionDuration);
    expect(seconds).toBeLessThan(0.02);
  });

  it("remaps the theme bridge variables to system colours under forced-colors", () => {
    expect(matchMedia("(forced-colors: active)").matches).toBe(true);

    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>Review the details before continuing.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    // Painted colours are a poor assertion in this mode: the UA overrides author colours itself
    // wherever `forced-color-adjust` is `auto`, so `body` would compute to Canvas whether or not
    // base.css did anything. What base.css is actually for is keeping the *variables* from
    // fighting the forced palette — a component that reads `--destructive` and draws a border
    // with it must get a system colour, not a theme colour the UA then partly overrides.
    //
    // So the assertion is the cascade: the `@media (forced-colors: active)` block in base.css
    // won over the `:root` values from the token stylesheet. Unresolvable in jsdom, which
    // evaluates no media query and no cascade at all.
    const root = getComputedStyle(document.documentElement);
    expect(root.getPropertyValue("--background").trim()).toBe("Canvas");
    expect(root.getPropertyValue("--foreground").trim()).toBe("CanvasText");
    expect(root.getPropertyValue("--destructive").trim()).toBe("Mark");
    expect(root.getPropertyValue("--accent").trim()).toBe("Highlight");
  });
});
