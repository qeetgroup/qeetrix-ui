import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Listbox } from "@/components/selection/listbox";

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
