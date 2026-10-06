import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  CommandPalette,
  type CommandPaletteItem,
} from "@/components/CommandPalette/command-palette";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

// jsdom implements <dialog> + its `open` reflection but not the top-layer
// methods showModal()/show()/close(). The component drives the native dialog
// via those, so provide the same kind of minimal polyfill setup.ts already
// uses for other missing browser APIs (matchMedia, ResizeObserver, …).
beforeAll(() => {
  const proto = HTMLDialogElement.prototype;
  if (!proto.showModal) {
    proto.showModal = function (this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (!proto.show) {
    proto.show = function (this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (!proto.close) {
    proto.close = function (this: HTMLDialogElement, returnValue?: string) {
      this.open = false;
      if (returnValue !== undefined) this.returnValue = returnValue;
      this.dispatchEvent(new Event("close"));
    };
  }
});

const ITEMS: CommandPaletteItem[] = [
  { id: "new", title: "New file", group: "File" },
  { id: "open", title: "Open file", group: "File" },
  { id: "settings", title: "Open settings", group: "General", keywords: ["preferences"] },
];

function Palette({
  open = true,
  onOpenChange = vi.fn(),
  onSelect = vi.fn(),
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  onSelect?: (item: CommandPaletteItem) => void;
}) {
  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      items={ITEMS}
      onSelect={onSelect}
      placeholder="Search…"
    />
  );
}

describe("CommandPalette", () => {
  it("exposes a labelled modal dialog when open", () => {
    render(<Palette />);
    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeInTheDocument();
  });

  it("renders a search input with an accessible name", () => {
    render(<Palette />);
    expect(screen.getByRole("combobox", { name: "Search…" })).toBeInTheDocument();
  });

  it("exposes a labelled results listbox with option roles", () => {
    render(<Palette />);
    const listbox = screen.getByRole("listbox", { name: "Results" });
    const options = within(listbox).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["New file", "Open file", "Open settings"]);
  });

  it("marks the highlighted option with aria-selected", () => {
    render(<Palette />);
    const options = screen.getAllByRole("option");
    // First item is highlighted on open.
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[1]).toHaveAttribute("aria-selected", "false");
  });

  it("connects the combobox to its listbox and active option", () => {
    render(<Palette />);
    const combobox = screen.getByRole("combobox", { name: "Search…" });
    const listbox = screen.getByRole("listbox", { name: "Results" });
    const options = within(listbox).getAllByRole("option");

    expect(combobox).toHaveAttribute("aria-controls", listbox.id);
    expect(combobox).toHaveAttribute("aria-activedescendant", options[0].id);
    expect(combobox).toHaveAttribute("aria-autocomplete", "list");
    expect(combobox).toHaveAttribute("aria-expanded", "true");
    expect(options.every((option) => option.tabIndex === -1)).toBe(true);
  });

  it("resets the active option when filtering a previously advanced list", () => {
    const onSelect = vi.fn();
    render(<Palette onSelect={onSelect} />);
    const input = screen.getByRole("combobox", { name: "Search…" });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.change(input, { target: { value: "file" } });

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(ITEMS[0]);
  });

  it("filters the list as the query changes", () => {
    render(<Palette />);
    fireEvent.change(screen.getByRole("combobox", { name: "Search…" }), {
      target: { value: "settings" },
    });
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Open settings");
  });

  it("matches on keywords, not just the title", () => {
    render(<Palette />);
    fireEvent.change(screen.getByRole("combobox", { name: "Search…" }), {
      target: { value: "preferences" },
    });
    expect(screen.getByRole("option", { name: "Open settings" })).toBeInTheDocument();
  });

  it("selects the highlighted item on Enter and closes", () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(<Palette onSelect={onSelect} onOpenChange={onOpenChange} />);
    const input = screen.getByRole("combobox", { name: "Search…" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(ITEMS[1]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("selects an item on click", () => {
    const onSelect = vi.fn();
    render(<Palette onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("option", { name: "Open settings" }));
    expect(onSelect).toHaveBeenCalledWith(ITEMS[2]);
  });

  it("shows the empty message when nothing matches", () => {
    render(
      <CommandPalette
        open
        onOpenChange={vi.fn()}
        items={ITEMS}
        onSelect={vi.fn()}
        emptyMessage="No matches"
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzzzz" } });
    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    render(<Palette />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});

describe("CommandPalette active-result model", () => {
  const status = () => document.querySelector("[data-slot='command-palette-status']");
  const combobox = () => screen.getByRole("combobox");
  const activeOption = () => {
    const id = combobox().getAttribute("aria-activedescendant");
    return id ? document.getElementById(id) : null;
  };

  it("announces the result count politely", () => {
    render(<Palette />);
    expect(status()).toHaveAttribute("aria-live", "polite");
    expect(status()).toHaveTextContent("3 results");
  });

  it("re-announces the count as the query narrows, including zero", () => {
    render(<Palette />);
    fireEvent.change(combobox(), { target: { value: "settings" } });
    expect(status()).toHaveTextContent("1 result");
    fireEvent.change(combobox(), { target: { value: "zzz" } });
    expect(status()).toHaveTextContent("No results");
  });

  it("accepts a translated count label", () => {
    render(
      <CommandPalette
        open
        onOpenChange={vi.fn()}
        items={ITEMS}
        onSelect={vi.fn()}
        resultCountLabel={(n) => `${n} résultats`}
      />,
    );
    expect(status()).toHaveTextContent("3 résultats");
  });

  it("says nothing while closed", () => {
    render(<Palette open={false} />);
    expect(status()).toHaveTextContent("");
  });

  it("never points aria-activedescendant at a removed option", () => {
    render(<Palette />);
    // Advance to the last result, then filter so that index no longer exists.
    fireEvent.keyDown(combobox(), { key: "ArrowDown" });
    fireEvent.keyDown(combobox(), { key: "ArrowDown" });
    expect(activeOption()).toHaveTextContent("Open settings");

    fireEvent.change(combobox(), { target: { value: "new" } });
    expect(combobox()).toHaveAttribute("aria-activedescendant");
    expect(activeOption()).not.toBeNull();
    expect(activeOption()).toHaveTextContent("New file");
  });

  it("drops aria-activedescendant when there are no results", () => {
    render(<Palette />);
    fireEvent.change(combobox(), { target: { value: "zzz" } });
    expect(combobox()).not.toHaveAttribute("aria-activedescendant");
  });

  it("commits the clamped active result rather than a stale index", () => {
    const onSelect = vi.fn();
    render(<Palette onSelect={onSelect} />);
    fireEvent.keyDown(combobox(), { key: "ArrowDown" });
    fireEvent.keyDown(combobox(), { key: "ArrowDown" });
    // Shrink the list to one item without going through onChange's reset.
    fireEvent.change(combobox(), { target: { value: "New file" } });
    fireEvent.keyDown(combobox(), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe("new");
  });

  it("does nothing on Enter with no results", () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(<Palette onSelect={onSelect} onOpenChange={onOpenChange} />);
    fireEvent.change(combobox(), { target: { value: "zzz" } });
    fireEvent.keyDown(combobox(), { key: "Enter" });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("scrolls the highlighted result into view", () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      render(<Palette />);
      scrollIntoView.mockClear();
      fireEvent.keyDown(combobox(), { key: "ArrowDown" });
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
      // jsdom does no layout, so the call is the only observable effect here.
      expect(scrollIntoView.mock.instances.at(-1)).toBe(activeOption());
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("does not scroll while closed", () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      render(<Palette open={false} />);
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("has no axe violations with the live region present", async () => {
    const { container } = render(<Palette />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("CommandPalette enterprise behaviour", () => {
  const combobox = () => screen.getByRole("combobox");

  it("labels each group so a screen reader hears where a result lives", () => {
    render(<Palette />);
    const file = screen.getByRole("group", { name: "File" });
    expect(
      within(file)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["New file", "Open file"]);
    expect(screen.getByRole("group", { name: "General" })).toBeInTheDocument();
  });

  it("shows a shortcut on the row and exposes it as the option's description", () => {
    render(
      <CommandPalette
        open
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
        items={[{ id: "new", title: "New file", shortcut: ["⌘", "N"] }]}
      />,
    );
    const option = screen.getByRole("option", { name: "New file" });
    expect(option).toHaveAccessibleDescription("⌘N");
    expect(option.querySelectorAll('[data-slot="kbd"]')).toHaveLength(2);
  });

  it("marks the active result with the Qeet tint and a ≥3:1 indicator bar", () => {
    render(<Palette />);
    const [active, idle] = screen.getAllByRole("option");
    expect(active).toHaveAttribute("data-highlighted");
    expect(idle).not.toHaveAttribute("data-highlighted");
    expect(active.className).toContain(
      "data-highlighted:bg-(--qx-component-command-palette-item-selected-background)",
    );
    expect(active.className).toContain("before:bg-border-brand");
    expect(active.className).toContain("data-highlighted:before:opacity-100");
  });

  it("moves the highlight on real pointer movement only", () => {
    render(<Palette />);
    const options = screen.getAllByRole("option");
    // mouseenter also fires when the list scrolls under a resting pointer; it must not steal
    // the highlight from the arrow keys.
    fireEvent.mouseEnter(options[2]);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.pointerMove(options[2]);
    expect(options[2]).toHaveAttribute("aria-selected", "true");
  });

  it("leaves Enter to the input method while a composition is in progress", () => {
    const onSelect = vi.fn();
    render(<Palette onSelect={onSelect} />);
    fireEvent.keyDown(combobox(), { key: "Enter", isComposing: true });
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.keyDown(combobox(), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(ITEMS[0]);
  });

  it("keeps focus in the search field when the result list is pressed", () => {
    render(<Palette />);
    const notCancelled = fireEvent.mouseDown(screen.getByRole("listbox"));
    expect(notCancelled).toBe(false);
  });

  it("localises the visible count with the announced one", () => {
    render(
      <CommandPalette
        open
        onOpenChange={vi.fn()}
        items={ITEMS}
        onSelect={vi.fn()}
        resultCountLabel={(n) => `${n} résultats`}
      />,
    );
    const footer = document.querySelector('[data-slot="command-palette-footer"]');
    expect(footer).toHaveTextContent("3 résultats");
  });

  it("still shows a count when the announcement is silenced", () => {
    render(
      <CommandPalette
        open
        onOpenChange={vi.fn()}
        items={ITEMS}
        onSelect={vi.fn()}
        resultCountLabel={() => ""}
      />,
    );
    const footer = document.querySelector('[data-slot="command-palette-footer"]');
    expect(footer).toHaveTextContent("3 results");
  });

  it("dims the page with the overlay scrim token and centres without the UA's margins", () => {
    render(<Palette />);
    const dialog = screen.getByRole("dialog", { name: "Command palette" });
    expect(dialog.className).toContain("backdrop:bg-(--qx-color-overlay-scrim)");
    expect(dialog.className).not.toMatch(/backdrop:bg-foreground/);
    expect(dialog.className).toContain("inset-x-0");
    expect(dialog.className).toContain("mx-auto");
  });

  it("sizes results from the density-resolved item height", () => {
    render(<Palette />);
    for (const option of screen.getAllByRole("option")) {
      expect(option.className).toContain("min-h-(--qx-component-command-palette-item-height)");
    }
  });
});
