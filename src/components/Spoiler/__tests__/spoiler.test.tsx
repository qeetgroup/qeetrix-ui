import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Spoiler } from "@/components/Spoiler/spoiler";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("Spoiler", () => {
  it("toggles expanded state and label", () => {
    render(
      <Spoiler maxLines={2}>
        <p>Long content that would be clamped to two lines until expanded.</p>
      </Spoiler>,
    );
    const toggle = screen.getByRole("button", { name: "Show more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("wires the toggle to the content region via aria-controls", () => {
    render(
      <Spoiler maxLines={2}>
        <p>Clamped content.</p>
      </Spoiler>,
    );
    const toggle = screen.getByRole("button", { name: "Show more" });
    const controls = toggle.getAttribute("aria-controls") ?? "";
    expect(controls).not.toBe("");
    expect(document.getElementById(controls)).toHaveAttribute("data-slot", "spoiler-content");
  });

  it("has no axe violations when collapsed and expanded", async () => {
    const { container } = render(
      <Spoiler maxLines={2}>
        <p>Long content that would be clamped to two lines until expanded.</p>
      </Spoiler>,
    );
    expect(await a11y(container)).toHaveNoViolations();

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/*
 * jsdom has no layout, so the box geometry the overflow check reads is stubbed per test. A
 * zero-height box (jsdom's default) means "not measured", which keeps the toggle — the fail-open
 * path every test above runs on.
 */
function stubGeometry({
  clientHeight,
  scrollHeight,
}: {
  clientHeight: number;
  scrollHeight: number;
}) {
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(clientHeight);
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(scrollHeight);
}

describe("Spoiler overflow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("drops the toggle and the fade when the content fits", () => {
    stubGeometry({ clientHeight: 40, scrollHeight: 40 });
    render(
      <Spoiler maxLines={3}>
        <p>Short.</p>
      </Spoiler>,
    );
    // A "Show more" that reveals nothing is a control that lies.
    expect(screen.queryByRole("button")).toBeNull();
    const content = document.querySelector("[data-slot='spoiler-content']");
    expect(content).not.toHaveAttribute("data-overflowing");
    expect(screen.getByText("Short.")).toBeVisible();
  });

  it("keeps the toggle and the fade when the content is clamped", () => {
    stubGeometry({ clientHeight: 40, scrollHeight: 120 });
    render(
      <Spoiler maxLines={2}>
        <p>Long content.</p>
      </Spoiler>,
    );
    expect(screen.getByRole("button", { name: "Show more" })).toBeInTheDocument();
    expect(document.querySelector("[data-slot='spoiler-content']")).toHaveAttribute(
      "data-overflowing",
    );
  });

  it("keeps the toggle while expanded, so the content can be collapsed again", () => {
    stubGeometry({ clientHeight: 40, scrollHeight: 120 });
    render(
      <Spoiler maxLines={2}>
        <p>Long content.</p>
      </Spoiler>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });
});

describe("Spoiler reveal on keyboard focus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** jsdom does not track input modality; pretend the focus came from the keyboard (or not). */
  function stubFocusVisible(visible: boolean) {
    const matches = Element.prototype.matches;
    vi.spyOn(Element.prototype, "matches").mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      return selector === ":focus-visible" ? visible : matches.call(this, selector);
    });
  }

  it("expands when keyboard focus lands inside the clamped content", () => {
    stubGeometry({ clientHeight: 40, scrollHeight: 120 });
    stubFocusVisible(true);
    const onExpandedChange = vi.fn();
    render(
      <Spoiler maxLines={2} onExpandedChange={onExpandedChange}>
        <p>
          Retained for 400 days. <a href="#retention">Retention policy</a>
        </p>
      </Spoiler>,
    );
    act(() => screen.getByRole("link", { name: "Retention policy" }).focus());
    // A focus ring on a link in the hidden lines would be an indicator nobody can see.
    expect(onExpandedChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("does not expand for pointer focus", () => {
    stubGeometry({ clientHeight: 40, scrollHeight: 120 });
    stubFocusVisible(false);
    render(
      <Spoiler maxLines={2}>
        <p>
          Retained for 400 days. <a href="#retention">Retention policy</a>
        </p>
      </Spoiler>,
    );
    act(() => screen.getByRole("link", { name: "Retention policy" }).focus());
    expect(screen.getByRole("button", { name: "Show more" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("leaves a controlled spoiler to its owner", () => {
    stubGeometry({ clientHeight: 40, scrollHeight: 120 });
    stubFocusVisible(true);
    const onExpandedChange = vi.fn();
    render(
      <Spoiler maxLines={2} expanded={false} onExpandedChange={onExpandedChange}>
        <p>
          Retained. <a href="#retention">Retention policy</a>
        </p>
      </Spoiler>,
    );
    act(() => screen.getByRole("link", { name: "Retention policy" }).focus());
    expect(onExpandedChange).toHaveBeenCalledExactlyOnceWith(true);
    // The owner did not act on it, so it stays collapsed.
    expect(screen.getByRole("button", { name: "Show more" })).toBeInTheDocument();
  });
});

describe("Spoiler toggle", () => {
  it("uses the Qeet focus ring and link colour, with a decorative state chevron", () => {
    render(
      <Spoiler maxLines={2}>
        <p>Long content.</p>
      </Spoiler>,
    );
    const toggle = screen.getByRole("button", { name: "Show more" });
    expect(toggle.className).toContain("focus-visible:focus-ring");
    expect(toggle.className).toContain("text-link");
    expect(toggle.className).not.toMatch(/ring-ring\/disabled/);
    expect(toggle.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("accepts translated labels", () => {
    render(
      <Spoiler maxLines={2} showLabel="Afficher plus" hideLabel="Afficher moins">
        <p>Long content.</p>
      </Spoiler>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Afficher plus" }));
    expect(screen.getByRole("button", { name: "Afficher moins" })).toBeInTheDocument();
  });
});
