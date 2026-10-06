"use client";

import * as QRCodeLib from "qrcode";
import * as React from "react";
import { qrCodeMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

export interface QRCodeProps
  extends Omit<React.ComponentProps<"div">, "children" | "onError" | "role"> {
  /** The data to encode — URL, TOTP URI, plain text, etc. */
  value: string;
  /**
   * Edge length of the tile in pixels, quiet zone included. @default 200
   *
   * The tile shrinks to its container (`max-width: 100%`) in a narrow panel, so this is the size
   * it renders at when there is room, not a width it forces. For reliable scanning keep each
   * module at roughly 3px or more on screen: a dense payload (a long URL at level `H`) needs a
   * larger `size`, not a smaller quiet zone.
   */
  size?: number;
  /** Reed–Solomon error correction level. Higher levels allow more of the
   *  code to be recovered when obscured. @default "M" */
  level?: "L" | "M" | "Q" | "H";
  /**
   * Width of the quiet zone — the light margin around the modules — in modules. @default 4
   *
   * Four modules is what ISO/IEC 18004 specifies and what every decoder is tuned for; below two,
   * phone cameras start missing codes that sit next to other content. Lower it only when the
   * code is already surrounded by a wide light area of the same colour.
   */
  quietZone?: number;
  /**
   * The quiet-zone (tile) colour, as any CSS colour. Defaults to the theme-invariant
   * `--qx-component-qr-code-background` (white), so the code stays dark-on-light in the dark
   * theme too. `"transparent"` is honoured for a code placed on a surface you control, but it
   * makes the code unscannable on a dark one — prefer the default.
   */
  bgColor?: string;
  /**
   * The module colour, as any CSS colour. Defaults to the theme-invariant
   * `--qx-component-qr-code-foreground` (black). `"currentColor"` — the previous default — also
   * resolves to that token rather than to the inherited text colour: in the dark theme the
   * text colour is light, and light modules on the light tile do not scan.
   */
  fgColor?: string;
  /**
   * Accessible name. @default "QR code"
   *
   * Say what scanning does ("Scan to pay ₹2,926.40 to Acme India"), not what the code contains —
   * a TOTP URI carries a secret, and a screen reader would read it aloud. To name the code from
   * visible text instead, pass `aria-labelledby`; to tie a caption or a manual-entry fallback to
   * it, pass `aria-describedby`.
   */
  "aria-label"?: string;
  /**
   * Called when encoding fails (e.g. `value` exceeds the capacity of the chosen
   * error-correction level). The component renders `errorFallback` instead of a code.
   */
  onError?: (error: unknown) => void;
  /**
   * Rendered in place of the code when encoding fails. Defaults to nothing —
   * an empty tile of the same size, so layout does not shift.
   */
  errorFallback?: React.ReactNode;
}

type Encoded = { ok: true; size: number; data: Uint8Array } | { ok: false; error: unknown };

function encode(value: string, level: QRCodeProps["level"]): Encoded {
  try {
    const { modules } = QRCodeLib.create(value, { errorCorrectionLevel: level });
    return { ok: true, size: modules.size, data: modules.data };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * The dark modules as one path, a horizontal run per rect.
 *
 * Built as a fill path rather than the library's stroked one so the colour can be a CSS
 * variable on `fill` and so a run of modules is one rectangle — no hairline seams between
 * adjacent modules at fractional scales.
 */
function modulePath(data: Uint8Array, size: number, offset: number): string {
  let path = "";
  for (let row = 0; row < size; row++) {
    let col = 0;
    while (col < size) {
      if (!data[row * size + col]) {
        col++;
        continue;
      }
      const start = col;
      while (col < size && data[row * size + col]) col++;
      path += `M${start + offset} ${row + offset}h${col - start}v1h${start - col}z`;
    }
  }
  return path;
}

/** The legacy CSS keywords keep their previous meaning: they never inherit the text colour. */
function moduleColour(fgColor: string | undefined) {
  return !fgColor || fgColor === "currentColor"
    ? "var(--qx-component-qr-code-foreground)"
    : fgColor;
}

/**
 * QRCode renders a QR code as an inline SVG, encoded synchronously from `value` with the
 * `qrcode` library's matrix encoder.
 *
 * **Scan reliability first.** The code is always dark modules on a light tile with a
 * four-module quiet zone — in the dark theme too, where the tile stays light rather than the
 * modules inverting, because many decoders never try inverted polarity. The tile opts out of
 * forced-colours remapping for the same reason: a high-contrast theme must not turn the quiet
 * zone black. Modules are drawn at a whole number of pixels where the size allows, with any
 * remainder added to the quiet zone, so edges stay crisp. Nothing decorates the modules.
 *
 * **Labels and actions belong beside it, not on it.** Name the code for what scanning does
 * (`aria-label`, or `aria-labelledby` pointing at a visible heading), and give every code a
 * non-camera fallback next to it — a `CopyableSecret` with the TOTP key, the payment link as
 * text, a "Copy link" button — tied in with `aria-describedby`.
 *
 * Encoding is synchronous and memoised on `value` and `level`, so the code renders on the
 * server and in the first client paint with no loading placeholder. A value too long for the
 * chosen level renders `errorFallback` and is reported through `onError`.
 */
function QRCode({
  value,
  size = 200,
  level = "M",
  quietZone = 4,
  bgColor,
  fgColor,
  "aria-label": ariaLabel,
  onError,
  errorFallback = null,
  className,
  style,
  ...props
}: QRCodeProps) {
  const messages = useMessages("qrCode", qrCodeMessages);
  const encoded = React.useMemo(() => encode(value, level), [value, level]);
  const onErrorRef = React.useRef(onError);
  onErrorRef.current = onError;

  React.useEffect(() => {
    if (!encoded.ok) onErrorRef.current?.(encoded.error);
  }, [encoded]);

  // Width only: the height follows from `aspect-square`, so the tile stays square when
  // `max-w-full` shrinks it inside a narrow panel.
  const box = { width: size, ...style };

  if (!encoded.ok) {
    return (
      <div
        data-slot="qr-code"
        data-state="error"
        style={box}
        className={cn(
          "inline-flex aspect-square max-w-full shrink-0 items-center justify-center overflow-hidden rounded-(--qx-component-qr-code-corner) border border-dashed border-border bg-surface-sunken text-muted-foreground",
          className,
        )}
        {...props}
      >
        {errorFallback}
      </div>
    );
  }

  const margin = Math.max(0, Math.floor(quietZone));
  const span = encoded.size + margin * 2;
  // Whole-pixel modules where there is room: the spare pixels widen the quiet zone instead of
  // smearing across module edges. Below 1px per module there is nothing to snap to.
  const modulePx = size / span >= 1 ? Math.floor(size / span) : size / span;
  const viewBoxSize = size / modulePx;
  const inset = (viewBoxSize - encoded.size) / 2;
  // The corner and the hairline both live in the quiet zone; with too thin a zone they would
  // clip or overdraw a finder pattern, so the tile goes square and unframed instead.
  const framed = margin >= 2;

  return (
    <div
      data-slot="qr-code"
      data-state="ready"
      data-framed={framed || undefined}
      role="img"
      aria-label={ariaLabel ?? messages.label}
      style={box}
      className={cn(
        "relative inline-flex aspect-square max-w-full shrink-0 overflow-hidden forced-color-adjust-none",
        // The hairline is an overlay rather than a border so it costs the code no pixels.
        "data-framed:rounded-(--qx-component-qr-code-corner) data-framed:after:pointer-events-none data-framed:after:absolute data-framed:after:inset-0 data-framed:after:rounded-[inherit] data-framed:after:border data-framed:after:border-(--qx-component-qr-code-border)",
        className,
      )}
      {...props}
    >
      <svg
        data-slot="qr-code-svg"
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        shapeRendering="crispEdges"
        className="block size-full"
      >
        <rect
          width={viewBoxSize}
          height={viewBoxSize}
          style={{ fill: bgColor ?? "var(--qx-component-qr-code-background)" }}
        />
        <path
          d={modulePath(encoded.data, encoded.size, inset)}
          style={{ fill: moduleColour(fgColor) }}
        />
      </svg>
    </div>
  );
}

export { QRCode };
