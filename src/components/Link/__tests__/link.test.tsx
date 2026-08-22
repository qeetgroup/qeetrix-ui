import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Link } from "@/components/Link/link";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Link", () => {
  it("renders as an anchor element", () => {
    render(<Link href="https://example.com">Visit site</Link>);
    const link = screen.getByRole("link", { name: "Visit site" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("forwards data-slot attribute", () => {
    render(<Link href="#">Docs</Link>);
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("data-slot", "link");
  });

  it("applies variant classes", () => {
    render(
      <Link href="#" variant="destructive">
        Delete
      </Link>,
    );
    const link = screen.getByRole("link", { name: "Delete" });
    expect(link.className).toMatch(/text-destructive/);
  });

  it("applies underline=always class", () => {
    render(
      <Link href="#" underline="always">
        Terms
      </Link>,
    );
    const link = screen.getByRole("link", { name: "Terms" });
    expect(link.className).toMatch(/underline/);
  });

  it("merges custom className", () => {
    render(
      <Link href="#" className="custom-class">
        Custom
      </Link>,
    );
    const link = screen.getByRole("link", { name: "Custom" });
    expect(link).toHaveClass("custom-class");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Link href="https://example.com">Learn more</Link>);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
