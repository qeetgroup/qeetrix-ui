import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

import * as QRCodeLib from "qrcode";
import { QRCode } from "@/components/QRCode/qr-code";

// `QRCodeLib.toString` is overloaded (callback and promise forms); the mock is
// the promise one, so it is re-typed here rather than fighting the overload at
// every call site.
const encode = QRCodeLib.toString as unknown as ReturnType<typeof vi.fn<() => Promise<string>>>;

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

describe("QRCode async sequencing", () => {
  const svg = (id: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21"><title>${id}</title></svg>`;

  beforeEach(() => {
    encode.mockReset();
  });

  afterEach(() => {
    encode.mockResolvedValue(svg("default"));
  });

  it("ignores a stale encode that resolves after a newer one", async () => {
    const deferred: Array<(value: string) => void> = [];
    encode.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          deferred.push(resolve);
        }),
    );

    const { rerender } = render(<QRCode value="first" />);
    rerender(<QRCode value="second" />);
    expect(deferred).toHaveLength(2);

    // The *newer* encode lands first, then the stale one. Without sequencing the
    // stale result would overwrite the current code.
    await act(async () => {
      deferred[1](svg("second"));
    });
    await waitFor(() => expect(screen.getByRole("img").innerHTML).toContain("second"));

    await act(async () => {
      deferred[0](svg("first"));
    });
    expect(screen.getByRole("img").innerHTML).toContain("second");
    expect(screen.getByRole("img").innerHTML).not.toContain("first");
  });

  it("leaves the loading state and reports the cause when encoding rejects", async () => {
    const cause = new Error("data too long");
    encode.mockRejectedValue(cause);
    const onError = vi.fn();

    render(<QRCode value={"x".repeat(10_000)} onError={onError} size={120} errorFallback="!" />);

    await waitFor(() => expect(onError).toHaveBeenCalledWith(cause));
    const node = document.querySelector("[data-slot='qr-code']");
    expect(node).toHaveAttribute("data-state", "error");
    expect(node).toHaveTextContent("!");
    // No endless skeleton: the placeholder is gone and no role="img" is claimed.
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("returns to the loading state when the value changes after an error", async () => {
    encode.mockRejectedValueOnce(new Error("bad"));
    const { rerender } = render(<QRCode value="bad" />);
    await waitFor(() =>
      expect(document.querySelector("[data-slot='qr-code']")).toHaveAttribute(
        "data-state",
        "error",
      ),
    );

    encode.mockResolvedValue(svg("good"));
    rerender(<QRCode value="good" />);
    await waitFor(() => expect(screen.getByRole("img").innerHTML).toContain("good"));
  });

  it("does not commit a result after unmount", async () => {
    let resolveEncode: ((value: string) => void) | undefined;
    encode.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveEncode = resolve;
        }),
    );
    const { unmount } = render(<QRCode value="gone" />);
    unmount();
    await act(async () => {
      resolveEncode?.(svg("gone"));
    });
    expect(document.querySelector("[data-slot='qr-code']")).toBeNull();
  });
});
