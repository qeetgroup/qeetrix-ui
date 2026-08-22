import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer/drawer";

const a11y = (c: Element) =>
  axe(c, {
    rules: { "color-contrast": { enabled: false }, "aria-command-name": { enabled: false } },
  });

function DrawerExample({ open }: { open?: boolean }) {
  return (
    <Drawer open={open}>
      <DrawerTrigger>Open drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Share</DrawerTitle>
          <DrawerDescription>Share this item with others.</DrawerDescription>
        </DrawerHeader>
        <p>Drawer body</p>
      </DrawerContent>
    </Drawer>
  );
}

describe("Drawer", () => {
  it("renders the trigger button", () => {
    render(<DrawerExample />);
    expect(screen.getByRole("button", { name: "Open drawer" })).toBeInTheDocument();
  });

  it("renders drawer content when open=true", () => {
    render(<DrawerExample open />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
    expect(screen.getByText("Drawer body")).toBeInTheDocument();
  });

  it("does not show content when closed", () => {
    render(<DrawerExample open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens on trigger click (uncontrolled)", () => {
    render(<DrawerExample />);
    fireEvent.click(screen.getByRole("button", { name: "Open drawer" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    render(<DrawerExample open />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });

  it("caps its height in dynamic viewport units so mobile browser chrome is accounted for", () => {
    render(<DrawerExample open />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-h-[85dvh]");
    expect(dialog.className).not.toContain("max-h-[85vh]");
    expect(dialog.className).toContain("overflow-y-auto");
  });
});
