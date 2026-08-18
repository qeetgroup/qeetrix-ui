import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

// Mock qrcode before the component is imported so Vitest's hoisting wires it
// up correctly. The library is async (Promise-based), so we resolve immediately
// with a minimal valid SVG string.
vi.mock("qrcode", () => ({
  toString: vi
    .fn()
    .mockResolvedValue(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21"><rect width="21" height="21" fill="#fff"/></svg>',
    ),
}));

import { QRCode } from "@/components/ui/qr-code";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("QRCode", () => {
  it("renders with role='img' once the SVG resolves", async () => {
    render(<QRCode value="https://example.com" />);
    await waitFor(() => {
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });

  it("uses the default aria-label 'QR code'", async () => {
    render(<QRCode value="https://example.com" />);
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "QR code" })).toBeInTheDocument();
    });
  });

  it("accepts a custom aria-label", async () => {
    render(<QRCode value="https://example.com" aria-label="Scan to visit example.com" />);
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Scan to visit example.com" })).toBeInTheDocument();
    });
  });

  it("carries the qr-code data-slot attribute", async () => {
    render(<QRCode value="https://example.com" />);
    // Before SVG resolves the Skeleton carries the data-slot.
    const skeleton = document.querySelector("[data-slot='qr-code']");
    expect(skeleton).toBeInTheDocument();
    // After resolution the QR div carries it.
    await waitFor(() => {
      expect(screen.getByRole("img")).toHaveAttribute("data-slot", "qr-code");
    });
  });

  it("has no axe violations", async () => {
    const { container } = render(<QRCode value="https://example.com" />);
    await waitFor(() => {
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
    expect(await a11y(container)).toHaveNoViolations();
  });
});
