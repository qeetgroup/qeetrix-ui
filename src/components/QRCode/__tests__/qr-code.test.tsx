import { render, screen } from "@testing-library/react";
import * as QRCodeLib from "qrcode";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { QRCode } from "@/components/QRCode/qr-code";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

const URL = "https://id.qeet.in/t/acme/device";
const svgOf = () => document.querySelector("[data-slot='qr-code-svg']") as SVGSVGElement;
const tileOf = () => svgOf().querySelector("rect") as SVGRectElement;
const modulesOf = () => svgOf().querySelector("path") as SVGPathElement;
/** Far beyond the capacity of a version-40 code at level H (1,273 bytes). */
const OVERSIZED = "x".repeat(4000);

describe("QRCode", () => {
  it("renders an image named 'QR code' by default, on the first render", () => {
    render(<QRCode value={URL} />);
    // Encoding is synchronous now: no skeleton, no waitFor.
    expect(screen.getByRole("img", { name: "QR code" })).toHaveAttribute("data-slot", "qr-code");
  });

  it("accepts a custom aria-label", () => {
    render(<QRCode value={URL} aria-label="Scan to sign in on this device" />);
    expect(screen.getByRole("img", { name: "Scan to sign in on this device" })).toBeInTheDocument();
  });

  it("can be named and described by visible text", () => {
    render(
      <>
        <h3 id="qr-title">Set up your authenticator</h3>
        <QRCode value={URL} aria-labelledby="qr-title" aria-describedby="qr-help" />
        <p id="qr-help">Can't scan? Enter the key instead.</p>
      </>,
    );
    const img = screen.getByRole("img", { name: "Set up your authenticator" });
    expect(img).toHaveAccessibleDescription("Can't scan? Enter the key instead.");
  });

  it("forwards id, className, style and data attributes to the tile", () => {
    render(
      <QRCode value={URL} id="qr" className="consumer" style={{ margin: 3 }} data-testid="tile" />,
    );
    const tile = screen.getByTestId("tile");
    expect(tile).toHaveAttribute("id", "qr");
    expect(tile).toHaveClass("consumer");
    expect(tile).toHaveStyle({ margin: "3px", width: "200px" });
  });

  it("keeps the SVG itself out of the accessibility tree", () => {
    render(<QRCode value={URL} />);
    expect(svgOf()).toHaveAttribute("aria-hidden", "true");
  });

  it("draws the matrix the encoder produced", () => {
    render(<QRCode value={URL} level="H" />);
    const { modules } = QRCodeLib.create(URL, { errorCorrectionLevel: "H" });
    const darkModules = modules.data.reduce((sum, bit) => sum + bit, 0);
    // One `h<n>` per horizontal run; the runs' lengths add up to the dark-module count.
    const runs = [...(modulesOf().getAttribute("d") ?? "").matchAll(/h(\d+)/g)];
    const drawn = runs.reduce((sum, [, n]) => sum + Number(n), 0);
    expect(runs.length).toBeGreaterThan(0);
    expect(drawn).toBe(darkModules);
  });

  it("re-encodes when the value changes", () => {
    const { rerender } = render(<QRCode value="first" />);
    const before = modulesOf().getAttribute("d");
    rerender(<QRCode value="second" />);
    expect(modulesOf().getAttribute("d")).not.toBe(before);
  });

  it("has no axe violations", async () => {
    const { container } = render(<QRCode value={URL} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("QRCode scan reliability", () => {
  it("paints dark modules on a light tile from the theme-invariant tokens by default", () => {
    render(<QRCode value={URL} />);
    expect(tileOf().style.fill).toBe("var(--qx-component-qr-code-background)");
    expect(modulesOf().style.fill).toBe("var(--qx-component-qr-code-foreground)");
  });

  it("never lets currentColor inherit a (possibly light) text colour", () => {
    render(<QRCode value={URL} fgColor="currentColor" />);
    expect(modulesOf().style.fill).toBe("var(--qx-component-qr-code-foreground)");
  });

  it("still honours explicit colours", () => {
    render(<QRCode value={URL} fgColor="#1a1a1a" bgColor="#ffffffff" />);
    expect(modulesOf().style.fill).not.toContain("var(");
    expect(tileOf().style.fill).not.toContain("var(");
  });

  it("opts the tile out of forced-colour remapping", () => {
    render(<QRCode value={URL} />);
    expect(screen.getByRole("img")).toHaveClass("forced-color-adjust-none");
  });

  it("surrounds the modules with a four-module quiet zone by default", () => {
    render(<QRCode value={URL} size={400} />);
    const { modules } = QRCodeLib.create(URL, { errorCorrectionLevel: "M" });
    const viewBox = Number(svgOf().getAttribute("viewBox")?.split(" ")[2]);
    // Whole-pixel snapping can only widen the zone, never narrow it.
    expect((viewBox - modules.size) / 2).toBeGreaterThanOrEqual(4);
    expect(modulesOf().getAttribute("d")).toMatch(/^M\d+(\.\d+)? \d+(\.\d+)?h/);
  });

  it("snaps modules to whole pixels, giving the spare pixels to the quiet zone", () => {
    render(<QRCode value={URL} size={200} />);
    const viewBox = Number(svgOf().getAttribute("viewBox")?.split(" ")[2]);
    const modulePx = 200 / viewBox;
    expect(Number.isInteger(Number(modulePx.toFixed(6)))).toBe(true);
  });

  it("takes a narrower quiet zone when asked, and drops the corner and frame below two modules", () => {
    const { rerender } = render(<QRCode value={URL} quietZone={2} />);
    expect(screen.getByRole("img")).toHaveAttribute("data-framed");
    rerender(<QRCode value={URL} quietZone={0} />);
    expect(screen.getByRole("img")).not.toHaveAttribute("data-framed");
  });

  it("stays square when a narrow container shrinks it", () => {
    render(<QRCode value={URL} size={240} />);
    const tile = screen.getByRole("img");
    // Width is the only inline dimension; aspect-square derives the height.
    expect(tile.style.height).toBe("");
    expect(tile).toHaveClass("aspect-square", "max-w-full");
  });
});

describe("QRCode encoding errors", () => {
  it("renders the fallback and reports the cause when the value is too long", () => {
    const onError = vi.fn();
    render(<QRCode value={OVERSIZED} level="H" size={120} errorFallback="!" onError={onError} />);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    const node = document.querySelector("[data-slot='qr-code']");
    expect(node).toHaveAttribute("data-state", "error");
    expect(node).toHaveTextContent("!");
    // A code that is not there does not claim to be an image.
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("recovers when the value changes to one that fits", () => {
    const { rerender } = render(<QRCode value={OVERSIZED} level="H" />);
    expect(document.querySelector("[data-slot='qr-code']")).toHaveAttribute("data-state", "error");
    rerender(<QRCode value="fits" level="H" />);
    expect(screen.getByRole("img")).toHaveAttribute("data-state", "ready");
  });

  it("reports each failure once, not on every render", () => {
    const onError = vi.fn();
    const { rerender } = render(<QRCode value={OVERSIZED} onError={onError} />);
    rerender(<QRCode value={OVERSIZED} onError={onError} className="x" />);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations in the error state", async () => {
    const { container } = render(<QRCode value={OVERSIZED} errorFallback="Too much data" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("QRCode server rendering", () => {
  it("renders the finished code on the server, so hydration has nothing to swap", () => {
    const html = renderToString(<QRCode value={URL} />);
    expect(html).toContain('role="img"');
    expect(html).toContain("<path");
  });
});
