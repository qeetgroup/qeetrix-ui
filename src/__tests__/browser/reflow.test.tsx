/**
 * Real-browser proof for reflow at 200% zoom (WCAG 2.1 SC 1.4.10).
 *
 * The jsdom suites for Dialog and Sheet assert the *declarations* that are supposed to make a
 * tall overlay reachable — `max-h-[calc(100dvh-2rem)]`, `max-h-[100dvh]`, `overflow-y-auto` —
 * and say in a comment that the resulting geometry needs a browser. Those assertions cannot
 * fail for the reason that matters: a class name that Tailwind never compiles, a token that
 * resolves to nothing, or a parent that clips still leave the class string intact.
 *
 * 200% zoom is emulated the way the WCAG technique describes it: halve the CSS viewport. A
 * 1280×1024 window at 200% zoom lays out as 640×512 CSS pixels, so that is the viewport used
 * here. The stylesheet is compiled for real by the browser project's Tailwind plugin.
 */
import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/surfaces/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/surfaces/sheet";

/** 1280×1024 at 200% browser zoom. */
const ZOOMED = { width: 640, height: 512 };
const UNZOOMED = { width: 1280, height: 1024 };

/** Enough paragraphs that the overlay cannot fit on a 512px-tall viewport. */
function LongBody() {
  return (
    <>
      {Array.from({ length: 24 }, (_, index) => `paragraph-${index}`).map((id, index) => (
        <p key={id}>
          Paragraph {index + 1}. Long-form body copy that forces the surface past the height of a
          zoomed viewport.
        </p>
      ))}
      <button type="button">Last action</button>
    </>
  );
}

/** Whether `inner` is fully inside `outer`, allowing a pixel of rounding. */
function contains(outer: DOMRect, inner: DOMRect): boolean {
  return (
    inner.top >= outer.top - 1 &&
    inner.bottom <= outer.bottom + 1 &&
    inner.left >= outer.left - 1 &&
    inner.right <= outer.right + 1
  );
}

function viewportRect(): DOMRect {
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

describe("overlay reflow at 200% zoom", () => {
  beforeAll(async () => {
    await page.viewport(ZOOMED.width, ZOOMED.height);
  });

  afterAll(async () => {
    await page.viewport(UNZOOMED.width, UNZOOMED.height);
  });

  it("keeps a tall Dialog inside the viewport and scrolls its own content", async () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Confirm action</DialogTitle>
            <DialogDescription>Review the details before continuing.</DialogDescription>
          </DialogHeader>
          <LongBody />
        </DialogContent>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog");
    // Non-vacuity anchor: every assertion below depends on the compiled stylesheet being
    // present. If Tailwind is not running, `overflow-y-auto` is an inert string.
    expect(getComputedStyle(dialog).overflowY).toBe("auto");
    // Vacuity guard: if the fixture fitted, the rest would prove nothing.
    expect(dialog.scrollHeight).toBeGreaterThan(dialog.clientHeight);
    expect(contains(viewportRect(), dialog.getBoundingClientRect())).toBe(true);

    // Reachability is the actual requirement: the content below the fold has to be scrollable
    // into view, inside the dialog, without the page scrolling sideways.
    const last = screen.getByRole("button", { name: "Last action" });
    dialog.scrollTop = dialog.scrollHeight;
    expect(dialog.scrollTop).toBeGreaterThan(0);
    expect(contains(dialog.getBoundingClientRect(), last.getBoundingClientRect())).toBe(true);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth + 1,
    );
  });

  it("keeps a tall Sheet inside the viewport and scrolls its own content", async () => {
    render(
      <Sheet open>
        <SheetContent showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>Adjust your preferences.</SheetDescription>
          </SheetHeader>
          <LongBody />
        </SheetContent>
      </Sheet>,
    );

    const sheet = screen.getByRole("dialog");
    expect(getComputedStyle(sheet).overflowY).toBe("auto");
    expect(sheet.scrollHeight).toBeGreaterThan(sheet.clientHeight);
    expect(contains(viewportRect(), sheet.getBoundingClientRect())).toBe(true);

    const last = screen.getByRole("button", { name: "Last action" });
    sheet.scrollTop = sheet.scrollHeight;
    expect(sheet.scrollTop).toBeGreaterThan(0);
    expect(contains(sheet.getBoundingClientRect(), last.getBoundingClientRect())).toBe(true);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth + 1,
    );
  });
});
