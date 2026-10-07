import { CheckIcon } from "@qeetrix/icons/icons/check";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { findIcon } from "@/__tests__/icon-match";
import { Listbox } from "@/components/Listbox/listbox";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const OPTIONS = [
  { label: "Red", value: "r" },
  { label: "Green", value: "g" },
  { label: "Blue", value: "b" },
];

describe("Listbox", () => {
  it("renders options with listbox semantics", () => {
    render(<Listbox options={OPTIONS} aria-label="Colour" />);
    expect(screen.getByRole("listbox", { name: "Colour" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("selects an option on click (single-select)", () => {
    const onValueChange = vi.fn();
    render(<Listbox options={OPTIONS} aria-label="Colour" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("option", { name: "Green" }));
    expect(onValueChange).toHaveBeenCalledWith("g");
    expect(screen.getByRole("option", { name: "Green" })).toHaveAttribute("aria-selected", "true");
  });

  it("supports keyboard selection", () => {
    const onValueChange = vi.fn();
    render(<Listbox options={OPTIONS} aria-label="Colour" onValueChange={onValueChange} />);
    const lb = screen.getByRole("listbox");
    fireEvent.keyDown(lb, { key: "ArrowDown" });
    fireEvent.keyDown(lb, { key: "Enter" });
    expect(onValueChange).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Listbox options={OPTIONS} aria-label="Colour" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Listbox active-descendant model", () => {
  const activeIdOf = () => screen.getByRole("listbox").getAttribute("aria-activedescendant");
  const resolveActive = () => {
    const id = activeIdOf();
    return id ? document.getElementById(id) : null;
  };

  it("points aria-activedescendant at an element that exists", () => {
    render(<Listbox options={OPTIONS} aria-label="Colour" />);
    expect(resolveActive()).toHaveAccessibleName("Red");
  });

  it("keeps the IDREF single-token for values containing spaces or quotes", () => {
    render(
      <Listbox
        aria-label="Awkward"
        options={[
          { label: "Space", value: "two words" },
          { label: "Quote", value: 'a"b' },
          { label: "Hash", value: "#frag" },
        ]}
      />,
    );
    const id = activeIdOf();
    expect(id).toBeTruthy();
    // aria-activedescendant is a single IDREF: whitespace makes it two, which is
    // what value-derived IDs produced. It must also stay queryable.
    expect(id).not.toMatch(/\s/);
    expect(document.getElementById(id as string)).toHaveAccessibleName("Space");

    // Every option resolves, including the quote and fragment values.
    for (const option of screen.getAllByRole("option")) {
      expect(option.id).not.toMatch(/\s/);
      expect(document.getElementById(option.id)).toBe(option);
    }
  });

  it("moves the active option with the arrow keys, Home and End", () => {
    render(<Listbox options={OPTIONS} aria-label="Colour" />);
    const lb = screen.getByRole("listbox");
    fireEvent.keyDown(lb, { key: "ArrowDown" });
    expect(resolveActive()).toHaveAccessibleName("Green");
    fireEvent.keyDown(lb, { key: "End" });
    expect(resolveActive()).toHaveAccessibleName("Blue");
    fireEvent.keyDown(lb, { key: "Home" });
    expect(resolveActive()).toHaveAccessibleName("Red");
    // Wraps.
    fireEvent.keyDown(lb, { key: "ArrowUp" });
    expect(resolveActive()).toHaveAccessibleName("Blue");
  });

  it("skips disabled options and never activates one", () => {
    render(
      <Listbox
        aria-label="Colour"
        options={[
          { label: "Red", value: "r", disabled: true },
          { label: "Green", value: "g" },
          { label: "Blue", value: "b" },
        ]}
      />,
    );
    expect(resolveActive()).toHaveAccessibleName("Green");
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "ArrowUp" });
    expect(resolveActive()).toHaveAccessibleName("Blue");
  });

  it("re-homes the active option when the active one is filtered away", () => {
    const { rerender } = render(<Listbox options={OPTIONS} aria-label="Colour" />);
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "End" });
    expect(resolveActive()).toHaveAccessibleName("Blue");

    // "Blue" disappears — the descendant must not dangle.
    rerender(<Listbox options={OPTIONS.slice(0, 2)} aria-label="Colour" />);
    expect(activeIdOf()).toBeTruthy();
    expect(resolveActive()).not.toBeNull();
    expect(resolveActive()).toHaveAccessibleName("Red");
  });

  it("re-homes the active option when it becomes disabled", () => {
    const { rerender } = render(<Listbox options={OPTIONS} aria-label="Colour" />);
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "ArrowDown" });
    expect(resolveActive()).toHaveAccessibleName("Green");

    rerender(
      <Listbox
        aria-label="Colour"
        options={[
          { label: "Red", value: "r" },
          { label: "Green", value: "g", disabled: true },
          { label: "Blue", value: "b" },
        ]}
      />,
    );
    expect(resolveActive()).toHaveAccessibleName("Red");
  });

  it("drops aria-activedescendant entirely when nothing is selectable", () => {
    render(
      <Listbox aria-label="Colour" options={[{ label: "Red", value: "r", disabled: true }]} />,
    );
    expect(activeIdOf()).toBeNull();
  });

  it("survives an empty option list", () => {
    const { rerender } = render(<Listbox options={OPTIONS} aria-label="Colour" />);
    rerender(<Listbox options={[]} aria-label="Colour" />);
    expect(activeIdOf()).toBeNull();
    expect(() =>
      fireEvent.keyDown(screen.getByRole("listbox"), { key: "ArrowDown" }),
    ).not.toThrow();
  });

  it("scrolls the newly active option into view on keyboard movement", () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      render(<Listbox options={OPTIONS} aria-label="Colour" />);
      // Mount must not scroll — that would yank a parent scroller on load.
      expect(scrollIntoView).not.toHaveBeenCalled();

      fireEvent.keyDown(screen.getByRole("listbox"), { key: "ArrowDown" });
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
      // jsdom does no layout, so only the call is observable here; that the
      // option actually becomes visible needs a real browser.
      expect(scrollIntoView.mock.instances[0]).toBe(resolveActive());
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("does not scroll when the options change on their own", () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      const { rerender } = render(<Listbox options={OPTIONS} aria-label="Colour" />);
      rerender(<Listbox options={OPTIONS.slice(1)} aria-label="Colour" />);
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("has no axe violations with a filtered, partly disabled list", async () => {
    const { container } = render(
      <Listbox
        aria-label="Colour"
        multiple
        options={[
          { label: "Red", value: "r", disabled: true },
          { label: "Green", value: "g" },
        ]}
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Listbox keyboard: type-ahead, paging, multi-select", () => {
  const COUNTRIES = [
    { label: "Argentina", value: "ar" },
    { label: "Brazil", value: "br" },
    { label: "Belgium", value: "be" },
    { label: "Bhutan", value: "bt", disabled: true },
    { label: "Canada", value: "ca" },
    { label: "Chile", value: "cl" },
    { label: "Denmark", value: "dk" },
    { label: "Egypt", value: "eg" },
    { label: "Finland", value: "fi" },
    { label: "Germany", value: "de" },
    { label: "Hungary", value: "hu" },
    { label: "India", value: "in" },
    { label: "Japan", value: "jp" },
  ];
  const activeName = () => {
    const id = screen.getByRole("listbox").getAttribute("aria-activedescendant");
    return id ? document.getElementById(id)?.textContent : null;
  };
  const key = (k: string, init: Partial<KeyboardEventInit> = {}) =>
    fireEvent.keyDown(screen.getByRole("listbox"), { key: k, ...init });

  it("jumps to the next option starting with a typed letter, and cycles on repeats", () => {
    render(<Listbox options={COUNTRIES} aria-label="Country" />);
    key("b");
    expect(activeName()).toBe("Brazil");
    key("b");
    // Bhutan is disabled, so a repeated "b" skips it.
    expect(activeName()).toBe("Belgium");
    key("b");
    expect(activeName()).toBe("Brazil");
  });

  it("matches a multi-letter query typed quickly", () => {
    render(<Listbox options={COUNTRIES} aria-label="Country" />);
    key("c");
    key("h");
    expect(activeName()).toBe("Chile");
  });

  it("moves ten options with Page Down / Page Up, clamped at the ends", () => {
    render(<Listbox options={COUNTRIES} aria-label="Country" />);
    key("PageDown");
    // Ten enabled options on from Argentina (Bhutan is skipped).
    expect(activeName()).toBe("India");
    key("PageDown");
    expect(activeName()).toBe("Japan");
    key("PageUp");
    expect(activeName()).toBe("Brazil");
  });

  it("toggles while moving with Shift+Arrow in a multi-select list", () => {
    const onValueChange = vi.fn();
    render(
      <Listbox options={COUNTRIES} aria-label="Countries" multiple onValueChange={onValueChange} />,
    );
    key("ArrowDown", { shiftKey: true });
    expect(onValueChange).toHaveBeenLastCalledWith(["br"]);
    key("ArrowDown", { shiftKey: true });
    expect(onValueChange).toHaveBeenLastCalledWith(["br", "be"]);
  });

  it("selects every enabled option with Ctrl/Cmd+A, and clears them on a second press", () => {
    const onValueChange = vi.fn();
    render(
      <Listbox
        options={OPTIONS.concat({ label: "Grey", value: "x", disabled: true })}
        aria-label="Colours"
        multiple
        onValueChange={onValueChange}
      />,
    );
    key("a", { ctrlKey: true });
    expect(onValueChange).toHaveBeenLastCalledWith(["r", "g", "b"]);
    key("a", { metaKey: true });
    expect(onValueChange).toHaveBeenLastCalledWith([]);
  });

  it("does not select-all in a single-select list", () => {
    const onValueChange = vi.fn();
    render(<Listbox options={OPTIONS} aria-label="Colour" onValueChange={onValueChange} />);
    key("a", { ctrlKey: true });
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("Listbox semantics and disabled state", () => {
  it("renders options as plain role=option elements, never as nested buttons", () => {
    const { container } = render(<Listbox options={OPTIONS} aria-label="Colour" />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    for (const option of screen.getAllByRole("option")) {
      expect(option).toHaveAttribute("data-slot", "listbox-option");
      expect(option).not.toHaveAttribute("tabindex");
    }
  });

  it("ignores input and leaves the tab order when disabled", () => {
    const onValueChange = vi.fn();
    render(
      <Listbox options={OPTIONS} aria-label="Colour" disabled onValueChange={onValueChange} />,
    );
    const lb = screen.getByRole("listbox");
    expect(lb).toHaveAttribute("aria-disabled", "true");
    expect(lb).toHaveAttribute("tabindex", "-1");
    expect(lb).not.toHaveAttribute("aria-activedescendant");
    fireEvent.keyDown(lb, { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "Green" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("highlights the active option only while the list has focus", () => {
    render(<Listbox options={OPTIONS} aria-label="Colour" />);
    const active = screen.getByRole("option", { name: "Red" });
    expect(active).toHaveAttribute("data-active");
    // No unconditional highlight class: the active fill is scoped to the focused list.
    expect(active.className).toContain("group-focus/listbox:data-[active]:bg-accent");
    expect(active.className.split(/\s+/)).not.toContain("bg-accent");
  });

  it("marks selection with a check, not only a tint", () => {
    render(<Listbox options={OPTIONS} aria-label="Colour" defaultValue="g" />);
    const green = screen.getByRole("option", { name: "Green" });
    expect(green).toHaveAttribute("aria-selected", "true");
    expect(findIcon(green, CheckIcon)).not.toBeNull();
    expect(findIcon(screen.getByRole("option", { name: "Red" }), CheckIcon)).toBeNull();
  });

  it("forwards aria-invalid", () => {
    render(<Listbox options={OPTIONS} aria-label="Colour" aria-invalid />);
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-invalid", "true");
  });
});
