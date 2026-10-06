import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  type SheetSide,
  SheetTitle,
  SheetTrigger,
} from "@/components/Drawer/sheet";

const a11y = (c: Element) =>
  axe(c, {
    rules: { "color-contrast": { enabled: false }, "aria-command-name": { enabled: false } },
  });

function SheetExample({ open, side }: { open?: boolean; side?: SheetSide }) {
  return (
    <Sheet open={open}>
      <SheetTrigger>Open sheet</SheetTrigger>
      <SheetContent side={side} showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Adjust your preferences.</SheetDescription>
        </SheetHeader>
        <p>Sheet body content</p>
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("renders the trigger button", () => {
    render(<SheetExample />);
    expect(screen.getByRole("button", { name: "Open sheet" })).toBeInTheDocument();
  });

  it("renders sheet content when open=true", () => {
    render(<SheetExample open />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Sheet body content")).toBeInTheDocument();
  });

  it("does not show content when closed", () => {
    render(<SheetExample open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens on trigger click (uncontrolled)", () => {
    render(<SheetExample />);
    fireEvent.click(screen.getByRole("button", { name: "Open sheet" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    render(<SheetExample open />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });

  // jsdom performs no layout: these assert the declarations that keep a tall sheet reachable
  // on a short viewport, not the resulting geometry, which needs a browser.
  it("bounds its height to the dynamic viewport and scrolls its own content", () => {
    render(<SheetExample open />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-h-dvh");
    expect(dialog.className).toContain("overflow-y-auto");
  });

  it("sits on the named drawer layer rather than an ad-hoc z-index", () => {
    render(<SheetExample open />);
    expect(screen.getByRole("dialog").className).toContain("z-(--qx-z-drawer)");
    const backdrop = document.querySelector('[data-slot="sheet-overlay"]');
    expect(backdrop?.className).toContain("z-(--qx-z-drawer-backdrop)");
  });

  // ── Sides and direction ──────────────────────────────────────────────────────────────────
  // Every side's classes are present on every sheet, scoped by `data-side`; what varies is the
  // attribute. jsdom performs no layout, so these assert the declarations that place and
  // animate each side — the RTL motion itself needs a browser.

  it("never carries an invalid utility (the old `--translate-x-10` RTL anomaly)", () => {
    render(<SheetExample open side="left" />);
    const className = screen.getByRole("dialog").className;
    expect(className).not.toMatch(/:--/);
    expect(className).not.toMatch(/(^|\s)rtl:data-\[side=(left|right)\]/);
  });

  it("keeps physical sides physical, with the border on the inner edge in every direction", () => {
    render(<SheetExample open side="right" />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-side", "right");
    expect(dialog.className).toContain("data-[side=right]:right-0");
    expect(dialog.className).toContain("data-[side=right]:border-l");
    expect(dialog.className).toContain("data-[side=left]:border-r");
    expect(dialog.className).not.toContain("data-[side=right]:border-s");
  });

  it.each([
    ["inline-end", "data-[side=inline-end]:inset-e-0", "data-[side=inline-end]:border-s"],
    ["inline-start", "data-[side=inline-start]:inset-s-0", "data-[side=inline-start]:border-e"],
  ] as const)(
    "supports a logical %s side that mirrors its placement and motion",
    (side, inset, border) => {
      render(<SheetExample open side={side} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("data-side", side);
      expect(dialog.className).toContain(inset);
      expect(dialog.className).toContain(border);
      // The entry offset flips under the element's real direction, not an ancestor attribute.
      expect(dialog.className).toContain(`[&:dir(rtl)]:data-[side=${side}]:data-starting-style`);
    },
  );

  it("paints its scrim and surface from the dialog component tokens", () => {
    render(<SheetExample open />);
    const backdrop = document.querySelector('[data-slot="sheet-overlay"]');
    expect(backdrop?.className).toContain("bg-(--qx-component-dialog-scrim)");
    expect(backdrop?.className).not.toMatch(/bg-black/);
    expect(screen.getByRole("dialog").className).toContain("bg-(--qx-component-dialog-background)");
  });

  it("scrolls long content in SheetBody", () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Details</SheetTitle>
          </SheetHeader>
          <SheetBody>Body</SheetBody>
        </SheetContent>
      </Sheet>,
    );
    const body = document.querySelector('[data-slot="sheet-body"]');
    expect(body?.className).toContain("overflow-y-auto");
    expect(body?.className).toContain("min-h-0");
  });

  it("names its close button and keeps the title clear of it", () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Details</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByRole("dialog").className).toContain("*:data-[slot=sheet-header]:pe-12");
  });
});
