import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { LogoUploader } from "@/components/inputs/logo-uploader";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("LogoUploader", () => {
  it("renders the URL input field", () => {
    render(<LogoUploader value="" onChange={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: "Logo URL" })).toBeInTheDocument();
  });

  it("renders the image preview when a value is set", () => {
    render(<LogoUploader value="https://example.com/logo.png" onChange={vi.fn()} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders the hint when provided and value is empty", () => {
    render(<LogoUploader value="" onChange={vi.fn()} hint="PNG or SVG, max 2 MB" />);
    expect(screen.getByText("PNG or SVG, max 2 MB")).toBeInTheDocument();
  });

  it("renders a remove button when a logo is set", () => {
    render(<LogoUploader value="https://example.com/logo.png" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("disables the URL input when disabled=true", () => {
    render(<LogoUploader value="" onChange={vi.fn()} disabled />);
    expect(screen.getByRole("textbox", { name: "Logo URL" })).toBeDisabled();
  });

  it("has no axe violations with no logo", async () => {
    const { container } = render(<LogoUploader value="" onChange={vi.fn()} />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations with a logo set", async () => {
    const { container } = render(
      <LogoUploader value="https://example.com/logo.png" onChange={vi.fn()} />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
