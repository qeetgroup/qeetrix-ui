import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Blockquote } from "@/components/Blockquote/blockquote";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Blockquote", () => {
  it("renders the quote and attribution", () => {
    render(
      <Blockquote attribution="Ada Lovelace">
        <p>That brain of mine is something more than merely mortal.</p>
      </Blockquote>,
    );
    expect(screen.getByText(/something more than merely mortal/)).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("is a single styled <blockquote> without an attribution", () => {
    const { container } = render(
      <Blockquote className="my-6" cite="https://example.com">
        <p>A quote.</p>
      </Blockquote>,
    );
    const quote = container.querySelector('[data-slot="blockquote"]');
    expect(quote?.tagName).toBe("BLOCKQUOTE");
    expect(quote).toHaveClass("border-s-2", "my-6");
    expect(quote).toHaveAttribute("cite", "https://example.com");
    expect(container.querySelector("figure")).toBeNull();
  });

  it("keeps the attribution outside the quotation, in a figure", () => {
    // HTML: attribution must not be part of the <blockquote>; a screen reader would read the
    // name as part of what was said.
    const { container } = render(
      <Blockquote attribution="Ada Lovelace" className="my-6" cite="https://example.com">
        <p>Quoted words.</p>
      </Blockquote>,
    );
    const figure = container.querySelector('[data-slot="blockquote-figure"]');
    const quote = container.querySelector('[data-slot="blockquote"]');
    const caption = container.querySelector('[data-slot="blockquote-attribution"]');
    expect(figure?.tagName).toBe("FIGURE");
    expect(figure).toHaveClass("border-s-2", "my-6");
    expect(quote?.tagName).toBe("BLOCKQUOTE");
    expect(quote).toHaveAttribute("cite", "https://example.com");
    expect(caption?.tagName).toBe("FIGCAPTION");
    expect(quote).not.toContainElement(caption as HTMLElement);
    expect(figure).toContainElement(caption as HTMLElement);
  });

  it("hides the decorative icon from assistive technology", () => {
    const { container } = render(
      <Blockquote icon={<svg data-testid="mark" />}>
        <p>Quote</p>
      </Blockquote>,
    );
    expect(container.querySelector('[data-slot="blockquote-icon"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("sets the quote upright — the Qeet faces ship no italic", () => {
    const { container } = render(
      <Blockquote attribution="Someone">
        <p>Quote</p>
      </Blockquote>,
    );
    for (const el of container.querySelectorAll("*")) {
      expect(el).not.toHaveClass("italic");
    }
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Blockquote>
        <p>A quote.</p>
      </Blockquote>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations with an attribution and an icon", async () => {
    const { container } = render(
      <Blockquote attribution="Priya Raman, Head of Platform" icon={<svg />}>
        <p>Qeet ID cut our sign-in tickets in half.</p>
      </Blockquote>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
