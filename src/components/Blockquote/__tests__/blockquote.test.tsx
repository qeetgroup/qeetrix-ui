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

  it("has no axe violations", async () => {
    const { container } = render(
      <Blockquote>
        <p>A quote.</p>
      </Blockquote>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
