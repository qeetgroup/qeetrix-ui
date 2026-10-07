import { QrCodeIcon } from "@qeetrix/icons";
import { CopyableSecret, QRCode } from "@qeetrix/ui";
import { useId } from "react";
import { formatInr, logEvents } from "../data/qeet";
import { jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

const TOTP_SECRET = "JBSWY3DPEHPK3PXPQ7ZA2MXR";
const TOTP_URI = `otpauth://totp/Qeet%20ID:rohan.mehta@acme.in?secret=${TOTP_SECRET}&issuer=Qeet%20ID&algorithm=SHA1&digits=6&period=30`;
const UPI_URI = "upi://pay?pa=accounts@acmeindia&pn=Acme%20India&am=2926.40&cu=INR";
const UPI_AMOUNT = formatInr(2926.4);

/** Far beyond what a QR code can hold at level H, to show the error fallback. */
const OVERSIZED = JSON.stringify([...logEvents, ...logEvents]);

function TotpEnrolment() {
  const fallbackId = useId();
  return (
    <div className="flex w-full max-w-xl flex-wrap items-start gap-5 rounded-lg border bg-card p-4">
      <QRCode
        value={TOTP_URI}
        size={224}
        aria-label="Scan to add Qeet ID to your authenticator app"
        aria-describedby={fallbackId}
      />
      <div className="flex min-w-56 flex-1 flex-col gap-2 text-sm">
        <div className="font-medium">Set up an authenticator app</div>
        <ol className="list-decimal space-y-1 ps-4 text-muted-foreground">
          <li>Open Google Authenticator, 1Password or Microsoft Authenticator.</li>
          <li>Scan this code for rohan.mehta@acme.in.</li>
          <li>Enter the 6-digit code it shows to finish.</li>
        </ol>
        <div id={fallbackId} className="mt-1 flex flex-col gap-1.5">
          <span className="text-caption text-muted-foreground">Can’t scan? Enter this key:</span>
          <CopyableSecret size="sm" value={TOTP_SECRET} copyLabel="Copy key" />
        </div>
      </div>
    </div>
  );
}

function UpiPaymentCard() {
  const captionId = useId();
  return (
    <div className="flex w-56 flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center">
      <QRCode
        value={UPI_URI}
        size={168}
        aria-label={`Scan to pay ${UPI_AMOUNT} to Acme India via UPI`}
        aria-describedby={captionId}
      />
      <div className="text-sm font-medium">Pay {UPI_AMOUNT}</div>
      <div id={captionId} className="text-caption text-muted-foreground">
        Scan with any UPI app · accounts@acmeindia
      </div>
    </div>
  );
}

const qrControls = {
  value: text(UPI_URI, "Value", { multiline: true }),
  size: num(200, { min: 80, max: 320, step: 8, label: "Size (px)" }),
  level: select(["L", "M", "Q", "H"] as const, "M", "Error correction"),
  quietZone: num(4, { min: 0, max: 8, label: "Quiet zone (modules)" }),
  "aria-label": text(`Scan to pay ${UPI_AMOUNT} to Acme India via UPI`, "aria-label"),
};

export const examples: FamilyExamples = {
  "qr-code": {
    layout: "wide",
    minHeight: 760,
    demos: [
      {
        name: "TOTP enrolment",
        description:
          "An otpauth:// URI for authenticator apps; the manual key is tied in with aria-describedby.",
        render: () => <TotpEnrolment />,
      },
      {
        name: "UPI payment link",
        description: "Name the code for what scanning does, not for the data it carries.",
        render: () => <UpiPaymentCard />,
      },
      {
        name: "Sizes and error correction",
        description:
          "Higher levels survive more damage (a scuffed print, a sticker over a corner).",
        render: () => (
          <div className="flex flex-wrap items-end gap-4">
            {(
              [
                { level: "L", size: 96 },
                { level: "M", size: 120 },
                { level: "H", size: 144 },
              ] as const
            ).map(({ level, size }) => (
              <figure key={level} className="flex flex-col items-center gap-1">
                <QRCode
                  value="https://id.qeet.in/t/acme/device"
                  size={size}
                  level={level}
                  aria-label={`Scan to sign in on this device (error correction ${level})`}
                />
                <figcaption className="text-caption text-muted-foreground">
                  Level {level}
                </figcaption>
              </figure>
            ))}
          </div>
        ),
      },
      {
        name: "Quiet zone",
        description: "Four modules by default; trim it only on an already-light, wide margin.",
        render: () => (
          <div className="flex flex-wrap items-end gap-4">
            {[4, 2, 1].map((quietZone) => (
              <figure key={quietZone} className="flex flex-col items-center gap-1">
                <QRCode
                  value="https://pay.qeet.in/i/QP-INV-2026-00412"
                  size={120}
                  quietZone={quietZone}
                  aria-label="Scan to open invoice QP-INV-2026-00412"
                />
                <figcaption className="text-caption text-muted-foreground">
                  quietZone={quietZone}
                </figcaption>
              </figure>
            ))}
          </div>
        ),
      },
      {
        name: "Encoding error",
        description: "`errorFallback` replaces the code when `value` exceeds the level’s capacity.",
        render: () => (
          <QRCode
            value={OVERSIZED}
            size={144}
            level="H"
            errorFallback={
              <div className="flex flex-col items-center gap-1 p-3 text-center text-caption">
                <QrCodeIcon aria-hidden className="size-5" />
                Too much data — share a link instead.
              </div>
            }
          />
        ),
      },
    ],
    playground: definePlayground({
      controls: qrControls,
      render: (v) => (
        <QRCode
          value={v.value}
          size={v.size}
          level={v.level}
          quietZone={v.quietZone}
          aria-label={v["aria-label"] || undefined}
        />
      ),
      code: (v) =>
        jsx("QRCode", {
          value: v.value,
          size: v.size === 200 ? undefined : v.size,
          level: v.level === "M" ? undefined : v.level,
          quietZone: v.quietZone === 4 ? undefined : v.quietZone,
          "aria-label": v["aria-label"] || undefined,
        }),
    }),
  },
};
