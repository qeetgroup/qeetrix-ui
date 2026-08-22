import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/navigation/menubar";
import { DirectionProvider } from "@/providers/direction-provider";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

function MenubarExample({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <Menubar>
      <MenubarMenu defaultOpen={defaultOpen}>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New Tab</MenubarItem>
          <MenubarItem>New Window</MenubarItem>
          <MenubarSeparator />
          <MenubarItem disabled>Print…</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Undo</MenubarItem>
          <MenubarItem>Redo</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Zoom in</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

/**
 * Base UI's portal renders an `aria-owns` bridge — an empty `<span>` that re-parents the
 * portalled popup back under its trigger for assistive technology — as a sibling of the
 * trigger. Inside a Menubar that sibling is a direct child of the element carrying
 * `role="menubar"`, and axe's `aria-required-children` correctly reports that a menubar may
 * not own a generic element.
 *
 * It is upstream and it has no supported workaround (verified against @base-ui/react 1.7.0):
 * `Menu.Positioner` throws without `Menu.Portal`, so the popup cannot be rendered inline; the
 * bridge is only emitted for non-modal focus managers and `Menu.Popup` hard-codes
 * `modal: isContextMenu`, so it cannot be suppressed; and wrapping each menu in a
 * `role="none"` element — the APG's own `<li role="none">` idiom — does not help, because axe
 * recurses through presentational wrappers.
 *
 * So the widget is asserted as a whole, with this single node subtracted and *its presence
 * asserted*: when Base UI restructures the bridge this helper fails, the exception recorded
 * against Menubar in the component registry can be removed, and the assertion becomes plain.
 */
async function axeAllowingUpstreamAriaOwnsBridge(container: Element) {
  const results = await a11y(container);
  const violations = results.violations ?? [];
  const bridge = violations.filter(
    (violation) =>
      violation.id === "aria-required-children" &&
      JSON.stringify(violation.nodes).includes("span[aria-owns]"),
  );
  expect(bridge).toHaveLength(1);
  return { ...results, violations: violations.filter((v) => !bridge.includes(v)) };
}

describe("Menubar", () => {
  it("exposes a menubar role", () => {
    render(<MenubarExample />);
    expect(screen.getByRole("menubar")).toBeInTheDocument();
  });

  it("renders each top-level trigger as a menuitem with menu haspopup", () => {
    render(<MenubarExample />);
    const triggers = screen.getAllByRole("menuitem");
    expect(triggers.map((t) => t.textContent)).toEqual(["File", "Edit", "View"]);
    for (const t of triggers) {
      expect(t).toHaveAttribute("aria-haspopup", "menu");
    }
  });

  it("keeps menu content closed by default", () => {
    render(<MenubarExample />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens a menu on trigger click and exposes its menuitem roles", () => {
    render(<MenubarExample />);
    fireEvent.click(screen.getByRole("menuitem", { name: "File" }));
    const menu = screen.getByRole("menu");
    const items = within(menu).getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["New Tab", "New Window", "Print…"]);
    expect(within(menu).getByRole("menuitem", { name: "Print…" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("marks the open trigger as expanded", () => {
    render(<MenubarExample defaultOpen />);
    expect(screen.getByRole("menuitem", { name: "File" })).toHaveAttribute("aria-expanded", "true");
  });

  it("has no axe violations when closed", async () => {
    const { container } = render(<MenubarExample />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations across the whole widget while a menu is open", async () => {
    const { container } = render(<MenubarExample defaultOpen />);
    // The whole widget, menubar included — not just the popup subtree. The only subtraction is
    // the upstream aria-owns bridge documented above, whose continued existence is asserted.
    expect(await axeAllowingUpstreamAriaOwnsBridge(container)).toHaveNoViolations();
  });

  // ── Keyboard model ───────────────────────────────────────────────────────────────────────
  // APG menubar: inline arrows move between menus, Home/End jump to the ends, Enter/ArrowDown
  // open, Escape closes and returns focus to the trigger, and typeahead moves within an open
  // menu. Type-to-select on the *triggers* is optional in the pattern and Base UI does not
  // implement it, so it is not asserted here.

  describe("keyboard", () => {
    it("moves between top-level menus with the inline arrows", async () => {
      const user = userEvent.setup();
      render(<MenubarExample />);
      const [file, edit] = screen.getAllByRole("menuitem");

      file.focus();
      await user.keyboard("{ArrowRight}");
      expect(edit).toHaveFocus();

      await user.keyboard("{ArrowLeft}");
      expect(file).toHaveFocus();
    });

    it("jumps to the last and first menu with End and Home", async () => {
      const user = userEvent.setup();
      render(<MenubarExample />);
      const [file, , view] = screen.getAllByRole("menuitem");

      file.focus();
      await user.keyboard("{End}");
      expect(view).toHaveFocus();

      await user.keyboard("{Home}");
      expect(file).toHaveFocus();
    });

    it("opens the focused menu with ArrowDown and highlights its first item", async () => {
      const user = userEvent.setup();
      render(<MenubarExample />);

      screen.getByRole("menuitem", { name: "File" }).focus();
      await user.keyboard("{ArrowDown}");

      const menu = await screen.findByRole("menu");
      expect(within(menu).getByRole("menuitem", { name: "New Tab" })).toHaveFocus();
    });

    it("opens the focused menu with Enter", async () => {
      const user = userEvent.setup();
      render(<MenubarExample />);

      screen.getByRole("menuitem", { name: "Edit" }).focus();
      await user.keyboard("{Enter}");

      const menu = await screen.findByRole("menu");
      expect(within(menu).getByRole("menuitem", { name: "Undo" })).toBeInTheDocument();
    });

    it("switches to the adjacent menu while one is open", async () => {
      const user = userEvent.setup();
      render(<MenubarExample />);

      screen.getByRole("menuitem", { name: "File" }).focus();
      await user.keyboard("{ArrowDown}");
      await screen.findByRole("menuitem", { name: "New Tab" });

      await user.keyboard("{ArrowRight}");

      // The previous menu closes, the next one opens, and focus goes with it rather than
      // dropping back to the trigger row.
      await waitFor(() =>
        expect(screen.queryByRole("menuitem", { name: "New Tab" })).not.toBeInTheDocument(),
      );
      const menu = screen.getByRole("menu");
      expect(within(menu).getByRole("menuitem", { name: "Undo" })).toBeInTheDocument();
      expect(menu.contains(document.activeElement)).toBe(true);
    });

    it("closes on Escape and returns focus to the owning trigger", async () => {
      const user = userEvent.setup();
      render(<MenubarExample />);
      const file = screen.getByRole("menuitem", { name: "File" });

      file.focus();
      await user.keyboard("{ArrowDown}");
      await screen.findByRole("menu");

      await user.keyboard("{Escape}");

      await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
      expect(file).toHaveFocus();
      expect(file).toHaveAttribute("aria-expanded", "false");
    });

    it("moves within an open menu by typeahead", async () => {
      const user = userEvent.setup();
      render(<MenubarExample />);

      screen.getByRole("menuitem", { name: "File" }).focus();
      await user.keyboard("{ArrowDown}");
      await screen.findByRole("menuitem", { name: "New Tab" });

      await user.keyboard("p");

      expect(screen.getByRole("menuitem", { name: "Print…" })).toHaveFocus();
    });

    it("follows the writing direction of the document in RTL", async () => {
      const user = userEvent.setup();
      render(
        <DirectionProvider direction="rtl">
          <MenubarExample />
        </DirectionProvider>,
      );
      const [file, edit] = screen.getAllByRole("menuitem");

      file.focus();
      // In RTL the inline-end direction is leftwards, so ArrowLeft advances.
      await user.keyboard("{ArrowLeft}");
      expect(edit).toHaveFocus();

      await user.keyboard("{ArrowRight}");
      expect(file).toHaveFocus();
    });
  });
});
