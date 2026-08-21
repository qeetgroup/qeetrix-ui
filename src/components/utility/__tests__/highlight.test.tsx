import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Highlight } from "@/components/utility/highlight";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Highlight", () => {
  it("wraps the matched term in a <mark>", () => {
    const { container } = render(<Highlight query="ipsum">Lorem ipsum dolor</Highlight>);
    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark).toHaveTextContent("ipsum");
  });

  it("is case-insensitive by default", () => {
    const { container } = render(<Highlight query="lorem">Lorem ipsum</Highlight>);
    expect(container.querySelector("mark")).toHaveTextContent("Lorem");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Highlight query="x">text x here</Highlight>);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
