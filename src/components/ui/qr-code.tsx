"use client";

import * as QRCodeLib from "qrcode";
import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
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
 */
function QRCode({
  value,
  size = 200,
  level = "M",
  bgColor = "transparent",
  fgColor = "currentColor",
  "aria-label": ariaLabel = "QR code",
  className,
}: QRCodeProps) {
  const [svgString, setSvgString] = React.useState<string>("");

  React.useEffect(() => {
    const dark = fgColor === "currentColor" ? "#000000" : fgColor;
    const light = bgColor === "transparent" ? "#00000000" : bgColor;

    QRCodeLib.toString(value, {
      type: "svg",
      errorCorrectionLevel: level,
      color: { dark, light },
      width: size,
      margin: 1,
    }).then((svg) => setSvgString(svg));
  }, [value, level, fgColor, bgColor, size]);

  if (!svgString) {
    return (
      <Skeleton
        data-slot="qr-code"
        style={{ width: size, height: size }}
        className={cn("shrink-0", className)}
      />
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
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}

export { QRCode };
