import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { DiffViewer } from "@/components/ui/diff-viewer";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("DiffViewer", () => {
  it("shows added and removed lines", () => {
    render(<DiffViewer before={"a\nb\nc"} after={"a\nB\nc"} />);
    expect(screen.getByText("b")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("renders split mode", () => {
    const { container } = render(<DiffViewer before={"x\ny"} after={"x\nz"} mode="split" />);
    expect(container.querySelector('[data-slot="diff-viewer"]')).not.toBeNull();
  });

  it("identifies split columns and changes without relying on color", () => {
    render(<DiffViewer before={"same\nold"} after={"same\nnew"} mode="split" />);

    expect(screen.getByRole("group", { name: "Before version" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "After version" })).toBeInTheDocument();
    expect(screen.getByText("Removed:")).toBeInTheDocument();
    expect(screen.getByText("Added:")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<DiffViewer before={"x"} after={"y"} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
