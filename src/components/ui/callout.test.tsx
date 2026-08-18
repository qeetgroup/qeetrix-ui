import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Callout } from "@/components/ui/callout";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Callout", () => {
  it("renders with role='note'", () => {
    render(<Callout>Some info</Callout>);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("renders title and content", () => {
    render(<Callout title="Heads Up">This is the content</Callout>);
    expect(screen.getByText("Heads Up")).toBeInTheDocument();
    expect(screen.getByText("This is the content")).toBeInTheDocument();
  });

  it("renders all four variants without error", () => {
    const { rerender } = render(<Callout variant="info">Info</Callout>);
    expect(screen.getByRole("note")).toBeInTheDocument();

    rerender(<Callout variant="success">Success</Callout>);
    expect(screen.getByRole("note")).toBeInTheDocument();

    rerender(<Callout variant="warning">Warning</Callout>);
    expect(screen.getByRole("note")).toBeInTheDocument();

    rerender(<Callout variant="error">Error</Callout>);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("has no axe violations (info)", async () => {
    const { container } = render(
      <Callout variant="info" title="Note">
        Content
      </Callout>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations (success)", async () => {
    const { container } = render(
      <Callout variant="success" title="Done">
        Content
      </Callout>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations (warning)", async () => {
    const { container } = render(
      <Callout variant="warning" title="Caution">
        Content
      </Callout>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations (error)", async () => {
    const { container } = render(
      <Callout variant="error" title="Error">
        Content
      </Callout>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
