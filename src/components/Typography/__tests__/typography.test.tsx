import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Typography } from "@/components/Typography/typography";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Typography", () => {
  it("renders the mapped element per variant", () => {
    render(<Typography variant="h2">Section</Typography>);
    expect(screen.getByRole("heading", { level: 2, name: "Section" })).toBeInTheDocument();
  });

  it("supports an element override via `as`", () => {
    render(<Typography as="span">Body</Typography>);
    expect(screen.getByText("Body").tagName).toBe("SPAN");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Typography variant="p">Paragraph text.</Typography>);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
