import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/Drawer/sheet";

const a11y = (c: Element) =>
  axe(c, {
    rules: { "color-contrast": { enabled: false }, "aria-command-name": { enabled: false } },
  });

function SheetExample({
  open,
  side,
}: {
  open?: boolean;
  side?: "right" | "left" | "top" | "bottom";
}) {
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
    expect(dialog.className).toContain("max-h-[100dvh]");
    expect(dialog.className).toContain("overflow-y-auto");
  });

  it("sits on the named drawer layer rather than an ad-hoc z-index", () => {
    render(<SheetExample open />);
    expect(screen.getByRole("dialog").className).toContain("z-(--qx-z-drawer)");
    const backdrop = document.querySelector('[data-slot="sheet-overlay"]');
    expect(backdrop?.className).toContain("z-(--qx-z-drawer-backdrop)");
  });
});
