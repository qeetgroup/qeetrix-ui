import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CommandPalette, type CommandPaletteItem } from "@/components/ui/command-palette";
import { I18nProvider } from "@/i18n";

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

  it("uses localized system labels while preserving caller-owned item text", () => {
    render(
      <I18nProvider
        locale="es"
        messages={{
          commandPalette: {
            label: "Paleta de comandos",
            results: "Resultados",
            placeholder: "Buscar…",
            empty: "Sin coincidencias",
            navigate: "navegar",
            select: "seleccionar",
            close: "cerrar",
            resultCount: "{count} resultado",
            resultCountPlural: "{count} resultados",
          },
        }}
      >
        <CommandPalette open onOpenChange={vi.fn()} items={ITEMS} onSelect={vi.fn()} />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Paleta de comandos" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Buscar…" })).toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: "Resultados" })).toBeInTheDocument();
    expect(screen.getByText("3 resultados")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "New file" })).toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    render(<Palette />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});
