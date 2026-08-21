import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Spinner } from "@/components/feedback/spinner";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Spinner", () => {
  it("exposes a labelled status role", () => {
    render(<Spinner />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("accepts a custom label", () => {
    render(<Spinner label="Saving" />);
    expect(screen.getByRole("status", { name: "Saving" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Spinner />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
