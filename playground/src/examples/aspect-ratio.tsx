import { AspectRatio, Button, QRCode } from "@qeetrix/ui";
import { FingerprintIcon, MapPinIcon, PlayIcon } from "lucide-react";
import { expr, jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, num, select } from "../registry/types";

const ratios = {
  "16 / 9": 16 / 9,
  "4 / 3": 4 / 3,
  "1 / 1": 1,
  "21 / 9": 21 / 9,
  "3 / 4": 3 / 4,
} as const;

type RatioKey = keyof typeof ratios;

function VideoPoster() {
  return (
    <div className="flex size-full flex-col justify-between bg-linear-to-br from-brand-subtle to-surface-sunken p-4">
      <span className="text-caption font-medium text-muted-foreground">Qeet ID · 2:41</span>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-heading text-sm font-semibold">Roll out passkeys in a week</span>
          <span className="text-caption text-muted-foreground">
            Enrolment, recovery and admin policy
          </span>
        </div>
        <Button size="icon" className="shrink-0 rounded-full" aria-label="Play video">
          <PlayIcon aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export const examples: FamilyExamples = {
  "aspect-ratio": {
    minHeight: 520,
    demos: [
      {
        name: "16 / 9 video",
        description: "A product-tour poster that keeps its shape at any width.",
        render: () => (
          <div className="w-80">
            <AspectRatio ratio={16 / 9} className="rounded-lg border">
              <VideoPoster />
            </AspectRatio>
          </div>
        ),
      },
      {
        name: "Square",
        description: "The default ratio is `1`: a QR tile for pairing the Qeet ID Authenticator.",
        render: () => (
          <div className="w-40">
            <AspectRatio className="flex items-center justify-center rounded-lg border bg-card p-3">
              <QRCode
                value="qeetid://pair?tenant=acme&code=7HC2-YT9M"
                size={128}
                aria-label="Pairing code for the Qeet ID Authenticator"
              />
            </AspectRatio>
          </div>
        ),
      },
      {
        name: "Gallery tiles",
        description: "A grid of 4 / 3 tiles stays even however long each caption is.",
        render: () => (
          <div className="grid w-80 grid-cols-2 gap-3">
            {[
              { id: "mumbai", city: "Mumbai", region: "ap-south-1", icon: MapPinIcon },
              { id: "hyderabad", city: "Hyderabad", region: "ap-south-2", icon: MapPinIcon },
              { id: "passkeys", city: "Passkeys", region: "1,642 enrolled", icon: FingerprintIcon },
              { id: "frankfurt", city: "Frankfurt", region: "eu-central-1", icon: MapPinIcon },
            ].map((tile) => {
              const Icon = tile.icon;
              return (
                <AspectRatio
                  key={tile.id}
                  ratio={4 / 3}
                  className="flex flex-col justify-end gap-0.5 rounded-lg border bg-surface-subtle p-3"
                >
                  <Icon aria-hidden className="mb-auto size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{tile.city}</span>
                  <span className="font-mono text-caption text-muted-foreground">
                    {tile.region}
                  </span>
                </AspectRatio>
              );
            })}
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: {
        ratio: select(Object.keys(ratios) as RatioKey[], "16 / 9"),
        width: num(320, { min: 160, max: 640, step: 20, label: "Container width (px)" }),
      },
      render: (v) => (
        <div style={{ width: v.width }} className="max-w-full">
          <AspectRatio ratio={ratios[v.ratio]} className="rounded-lg border">
            <VideoPoster />
          </AspectRatio>
        </div>
      ),
      code: (v) =>
        jsx(
          "AspectRatio",
          {
            ratio: v.ratio === "1 / 1" ? undefined : expr(v.ratio),
            className: "rounded-lg border",
          },
          [
            [
              '<div className="flex size-full items-end bg-linear-to-br from-brand-subtle to-surface-sunken p-4">',
              "  Roll out passkeys in a week",
              "</div>",
            ].join("\n"),
          ],
        ),
    }),
  },
};
