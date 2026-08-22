"use client";

import * as QRCodeLib from "qrcode";
import * as React from "react";
import { Skeleton } from "@/components/Spinner/skeleton";
import { cn } from "@/lib/utils";

export interface QRCodeProps {
  /** The data to encode — URL, TOTP URI, plain text, etc. */
  value: string;
  /** Width and height of the rendered QR code in pixels. @default 200 */
  size?: number;
  /** Reed–Solomon error correction level. Higher levels allow more of the
   *  code to be recovered when obscured. @default "M" */
  level?: "L" | "M" | "Q" | "H";
  /** Background colour as an RGBA hex string (e.g. "#ffffffff").
   *  "transparent" is mapped to "#00000000". @default "transparent" */
  bgColor?: string;
  /** Foreground (module) colour as an RGBA hex string (e.g. "#000000ff").
   *  "currentColor" is mapped to "#000000". @default "currentColor" */
  fgColor?: string;
  /** Accessible description read by screen readers. @default "QR code" */
  "aria-label"?: string;
  /**
   * Called when encoding fails (e.g. `value` exceeds the capacity of the chosen
   * error-correction level). The component renders `errorFallback` instead of
   * staying in its loading state forever.
   */
  onError?: (error: unknown) => void;
  /**
   * Rendered in place of the code when encoding fails. Defaults to nothing —
   * an empty box of the same size, so layout does not shift.
   */
  errorFallback?: React.ReactNode;
  className?: string;
}

/**
 * QRCode renders a QR-code as an inline SVG produced by the `qrcode` library.
 * While the SVG is being generated asynchronously, a `Skeleton` placeholder
 * of identical dimensions is displayed so the layout does not shift.
 *
 * Colour props accept RGBA hex strings understood by `qrcode`. The CSS
 * convenience values `"currentColor"` and `"transparent"` are mapped to
 * `"#000000"` and `"#00000000"` respectively before being forwarded to the
 * library.
 *
 * Encoding is asynchronous and sequenced: only the most recently started
 * encode can commit its result, so rapid `value` changes cannot leave an
 * earlier code on screen. A rejected encode ends the loading state and is
 * reported through `onError` rather than left unhandled.
 */
function QRCode({
  value,
  size = 200,
  level = "M",
  bgColor = "transparent",
  fgColor = "currentColor",
  "aria-label": ariaLabel = "QR code",
  onError,
  errorFallback = null,
  className,
}: QRCodeProps) {
  const [state, setState] = React.useState<
    { status: "pending" } | { status: "ready"; svg: string } | { status: "error" }
  >({ status: "pending" });
  const onErrorRef = React.useRef(onError);
  onErrorRef.current = onError;

  React.useEffect(() => {
    const dark = fgColor === "currentColor" ? "#000000" : fgColor;
    const light = bgColor === "transparent" ? "#00000000" : bgColor;

    // `cancelled` is the sequencing guard: an encode started for an older set of
    // inputs must not commit after a newer one, and must not set state after
    // unmount. Without it, two overlapping encodes can resolve out of order.
    let cancelled = false;
    setState((current) => (current.status === "pending" ? current : { status: "pending" }));

    QRCodeLib.toString(value, {
      type: "svg",
      errorCorrectionLevel: level,
      color: { dark, light },
      width: size,
      margin: 1,
    }).then(
      (svg) => {
        if (cancelled) return;
        setState({ status: "ready", svg });
      },
      (error: unknown) => {
        if (cancelled) return;
        setState({ status: "error" });
        onErrorRef.current?.(error);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [value, level, fgColor, bgColor, size]);

  if (state.status === "pending") {
    return (
      <Skeleton
        data-slot="qr-code"
        style={{ width: size, height: size }}
        className={cn("shrink-0", className)}
      />
    );
  }

  if (state.status === "error") {
    return (
      <div
        data-slot="qr-code"
        data-state="error"
        style={{ width: size, height: size }}
        className={cn("inline-flex shrink-0 items-center justify-center", className)}
      >
        {errorFallback}
      </div>
    );
  }

  return (
    <div
      data-slot="qr-code"
      role="img"
      aria-label={ariaLabel}
      style={{ width: size, height: size }}
      className={cn("inline-flex items-center justify-center", className)}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG markup is generated locally by the `qrcode` library from `value` — there is no way to render an SVG string as React children otherwise.
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
}

export { QRCode };
