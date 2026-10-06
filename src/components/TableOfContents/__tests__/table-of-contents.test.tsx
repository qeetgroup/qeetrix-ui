import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { TableOfContents } from "@/components/TableOfContents/table-of-contents";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const ITEMS = [
  { id: "intro", label: "Introduction" },
  { id: "usage", label: "Usage" },
];

describe("TableOfContents", () => {
  it("renders a navigation landmark with links", () => {
    render(<TableOfContents items={ITEMS} />);
    expect(screen.getByRole("navigation", { name: "Table of contents" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Usage" })).toHaveAttribute("href", "#usage");
  });

  it("marks the active item with aria-current", () => {
    render(<TableOfContents items={ITEMS} activeId="usage" />);
    expect(screen.getByRole("link", { name: "Usage" })).toHaveAttribute("aria-current", "location");
  });

  it("has no axe violations", async () => {
    const { container } = render(<TableOfContents items={ITEMS} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/*
 * ── Scroll-spy ──────────────────────────────────────────────────────────────────────────────
 *
 * IntersectionObserver is replaced by a recorder, so a test can say which headings are in the
 * band and assert what the outline does about it.
 */
type Entry = { target: Element; isIntersecting: boolean };
const observers: { callback: (entries: Entry[]) => void; observed: Element[] }[] = [];

class RecordingObserver {
  observed: Element[] = [];
  constructor(public callback: (entries: Entry[]) => void) {
    observers.push(this);
  }
  observe(element: Element) {
    this.observed.push(element);
  }
  unobserve() {}
  disconnect() {
    this.observed = [];
  }
  takeRecords() {
    return [];
  }
}

function Headings({ ids }: { ids: string[] }) {
  return (
    <>
      {ids.map((id) => (
        <h2 key={id} id={id}>
          {id}
        </h2>
      ))}
    </>
  );
}

describe("TableOfContents scroll-spy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    observers.length = 0;
  });

  const report = (entries: [string, boolean][]) =>
    act(() => {
      const current = observers[observers.length - 1];
      current.callback(
        entries.map(([id, isIntersecting]) => ({
          target: document.getElementById(id) as Element,
          isIntersecting,
        })),
      );
    });

  const current = () => screen.getByRole("link", { current: "location" }).textContent;

  it("activates the first heading in document order that is inside the band", () => {
    vi.stubGlobal("IntersectionObserver", RecordingObserver);
    const items = ["a", "b", "c"].map((id) => ({ id, label: id.toUpperCase() }));
    render(
      <>
        <Headings ids={["a", "b", "c"]} />
        <TableOfContents items={items} />
      </>,
    );
    expect(current()).toBe("A");
    // Delivered out of order: the answer is still the earlier heading.
    report([
      ["c", true],
      ["b", true],
    ]);
    expect(current()).toBe("B");
  });

  it("keeps the last answer while no heading is in the band", () => {
    vi.stubGlobal("IntersectionObserver", RecordingObserver);
    const items = ["a", "b"].map((id) => ({ id, label: id.toUpperCase() }));
    render(
      <>
        <Headings ids={["a", "b"]} />
        <TableOfContents items={items} />
      </>,
    );
    report([["b", true]]);
    report([["b", false]]);
    expect(current()).toBe("B");
  });

  // The effect depended on `ids.length` and `ids.forEach` (the same function for every array),
  // so a page that swapped its headings for the same number of new ones kept watching the old.
  it("re-observes when the headings change but their count does not", () => {
    vi.stubGlobal("IntersectionObserver", RecordingObserver);
    const first = ["a", "b"].map((id) => ({ id, label: id }));
    const second = ["x", "y"].map((id) => ({ id, label: id }));
    const { rerender } = render(
      <>
        <Headings ids={["a", "b", "x", "y"]} />
        <TableOfContents items={first} />
      </>,
    );
    rerender(
      <>
        <Headings ids={["a", "b", "x", "y"]} />
        <TableOfContents items={second} />
      </>,
    );
    const latest = observers[observers.length - 1];
    expect(latest.observed.map((element) => element.id)).toEqual(["x", "y"]);
    // And an id from the old set is never reported as current.
    expect(current()).toBe("x");
  });
});

describe("TableOfContents affordances", () => {
  it("indents nested labels inside the link, so the indicator stays on the track", () => {
    render(
      <TableOfContents
        items={[
          { id: "a", label: "Top" },
          { id: "b", label: "Nested", depth: 2 },
        ]}
        activeId="b"
      />,
    );
    const nested = screen.getByRole("link", { name: "Nested" });
    expect(nested.style.paddingInlineStart).toContain("9");
    expect(nested.closest("li")?.getAttribute("style")).toBeNull();
    expect(nested.getAttribute("class")).toContain("before:bg-border-brand");
    expect(nested.getAttribute("class")).toContain("before:opacity-100");
  });

  it("sticks on request, offset by its token, and scrolls on its own when tall", () => {
    const { container } = render(<TableOfContents items={ITEMS} sticky />);
    const nav = container.querySelector('[data-slot="table-of-contents"]');
    expect(nav).toHaveAttribute("data-sticky");
    expect(nav).toHaveClass(
      "sticky",
      "top-(--qx-component-table-of-contents-sticky-offset)",
      "overflow-y-auto",
    );
  });

  it("is not sticky by default", () => {
    const { container } = render(<TableOfContents items={ITEMS} />);
    expect(container.querySelector('[data-slot="table-of-contents"]')).not.toHaveClass("sticky");
  });

  it("uses the foundation inset focus ring on its links", () => {
    render(<TableOfContents items={ITEMS} />);
    expect(screen.getByRole("link", { name: "Usage" }).getAttribute("class")).toContain(
      "focus-visible:focus-ring-inset",
    );
  });
});
