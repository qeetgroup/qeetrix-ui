import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Marquee } from "@/components/Marquee/marquee";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

const copies = (c: HTMLElement) =>
  Array.from(c.querySelector('[data-slot="marquee"]')?.children ?? []) as HTMLElement[];

describe("Marquee", () => {
  it("renders its content (duplicated for a seamless loop)", () => {
    render(
      <Marquee aria-label="Partners">
        <span>Acme</span>
      </Marquee>,
    );
    expect(screen.getAllByText("Acme").length).toBeGreaterThan(0);
  });

  it("hides the duplicate from assistive technology and from the tab order", () => {
    const { container } = render(
      <Marquee aria-label="Partners">
        <a href="#acme">Acme</a>
      </Marquee>,
    );
    const [first, second] = copies(container);
    expect(first).not.toHaveAttribute("aria-hidden");
    expect(first).toHaveAttribute("data-slot", "marquee-content");
    expect(second).toHaveAttribute("aria-hidden", "true");
    // `inert`, so Tab cannot land on an invisible duplicate link (jsdom has no `inert` IDL
    // property, so the attribute is what is asserted).
    expect(second).toHaveAttribute("inert");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("stops completely under reduced motion: one wrapped, unmasked copy", () => {
    const { container } = render(
      <Marquee aria-label="Partners">
        <span>Acme</span>
      </Marquee>,
    );
    const root = container.querySelector('[data-slot="marquee"]');
    const [first, second] = copies(container);
    expect(root).toHaveClass("motion-reduce:mask-none");
    expect(first).toHaveClass("motion-reduce:animate-none", "motion-reduce:flex-wrap");
    expect(second).toHaveClass("motion-reduce:hidden");
  });

  it("pauses on focus within always, and on hover unless opted out", () => {
    const { container, rerender } = render(
      <Marquee aria-label="Partners">
        <span>Acme</span>
      </Marquee>,
    );
    expect(copies(container)[0]).toHaveClass("group-focus-within:paused", "group-hover:paused");

    rerender(
      <Marquee aria-label="Partners" pauseOnHover={false}>
        <span>Acme</span>
      </Marquee>,
    );
    expect(copies(container)[0]).toHaveClass("group-focus-within:paused");
    expect(copies(container)[0]).not.toHaveClass("group-hover:paused");
  });

  it("can be paused by a control the consumer renders", () => {
    const { container } = render(
      <Marquee aria-label="Partners" paused>
        <span>Acme</span>
      </Marquee>,
    );
    expect(container.querySelector('[data-slot="marquee"]')).toHaveAttribute("data-paused");
    for (const copy of copies(container)) expect(copy).toHaveClass("paused");
  });

  it("keeps the physical track order under RTL so the loop stays seamless", () => {
    const { container } = render(
      <Marquee aria-label="Partners" direction="right">
        <span>Acme</span>
      </Marquee>,
    );
    const root = container.querySelector('[data-slot="marquee"]');
    expect(root).toHaveClass("rtl:flex-row-reverse");
    expect(root).toHaveAttribute("data-direction", "right");
    expect(copies(container)[0]).toHaveClass("animate-qx-marquee-right");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Marquee aria-label="Partners">
        <span>Acme</span>
      </Marquee>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations with interactive content", async () => {
    const { container } = render(
      <Marquee aria-label="Partners">
        <a href="#acme">Acme</a>
        <a href="#globex">Globex</a>
      </Marquee>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
