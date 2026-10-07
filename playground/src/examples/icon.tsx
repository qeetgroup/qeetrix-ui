import {
  CircleCheckIcon,
  CircleXIcon,
  FingerprintPatternIcon,
  type IconProps,
  KeyRoundIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  WebhookIcon,
} from "@qeetrix/icons";
import { ICON_SIZE, Icon, IconApiKey, IconPasskey, IconScimSync, IconWebhook } from "@qeetrix/ui";
import { type ComponentType, type ReactNode, useEffect, useRef, useState } from "react";
import { expr, jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, select, text } from "../registry/types";

const sizeKeys = Object.keys(ICON_SIZE) as (keyof typeof ICON_SIZE)[];

/** What assistive technology is told about the icon inside `children`. */
function AccessibilityReadout({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [summary, setSummary] = useState("");
  useEffect(() => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const label = svg.getAttribute("aria-label");
    setSummary(
      svg.getAttribute("aria-hidden") === "true"
        ? 'aria-hidden="true" — skipped by screen readers'
        : `role="${svg.getAttribute("role")}" · name “${label}”`,
    );
  });
  return (
    <div className="flex items-center gap-3">
      <span ref={ref} className="flex size-10 items-center justify-center rounded-lg border">
        {children}
      </span>
      <code className="text-caption text-muted-foreground">{summary}</code>
    </div>
  );
}

/** Sample icons with a filled drawing, so `variant="filled"` applies to them. */
const filledIcons = {
  ShieldCheckIcon,
  KeyRoundIcon,
  TriangleAlertIcon,
} satisfies Record<string, ComponentType<IconProps>>;

const icons = {
  FingerprintPatternIcon,
  WebhookIcon,
  ...filledIcons,
} satisfies Record<string, ComponentType<IconProps<"outline">>>;

const drawings = [
  { shape: "round", variant: "outline" },
  { shape: "round", variant: "filled" },
  { shape: "sharp", variant: "outline" },
  { shape: "sharp", variant: "filled" },
] as const;

const tones = {
  default: "",
  muted: "text-muted-foreground",
  brand: "text-brand",
  success: "text-success-text",
  warning: "text-warning-text",
  destructive: "text-destructive-text",
} as const;

const iconControls = {
  icon: select(Object.keys(icons) as (keyof typeof icons)[], "FingerprintPatternIcon"),
  size: select(["xs", "sm", "md", "lg", "32"] as const, "md"),
  stroke: select(["regular", "thin"] as const, "regular"),
  shape: select(["round", "sharp"] as const, "round"),
  variant: select(
    ["outline", "filled"] as const,
    "outline",
    "Variant (filled where the icon has it)",
  ),
  title: text("", "Accessible name (title) — empty for decorative"),
  tone: select(Object.keys(tones) as (keyof typeof tones)[], "default", "Colour (className)"),
};

export const examples: FamilyExamples = {
  icon: {
    minHeight: 560,
    demos: [
      {
        name: "Sizes",
        description: "Size tokens xs · sm · md (default) · lg, or any pixel number.",
        render: () => (
          <div className="flex items-end gap-5">
            {sizeKeys.map((size) => (
              <div key={size} className="flex flex-col items-center gap-1.5">
                <Icon icon={FingerprintPatternIcon} size={size} />
                <span className="font-mono text-caption text-muted-foreground">
                  {size} · {ICON_SIZE[size]}px
                </span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-1.5">
              <Icon icon={FingerprintPatternIcon} size={32} />
              <span className="font-mono text-caption text-muted-foreground">32px</span>
            </div>
          </div>
        ),
      },
      {
        name: "Stroke",
        description: "`thin` (1.5) suits large or dense glyphs; `regular` (2) is the default.",
        render: () => (
          <div className="flex items-center gap-6">
            {(["regular", "thin"] as const).map((stroke) => (
              <div key={stroke} className="flex items-center gap-2">
                <Icon icon={ShieldCheckIcon} size="lg" stroke={stroke} />
                <span className="font-mono text-caption text-muted-foreground">{stroke}</span>
              </div>
            ))}
          </div>
        ),
      },
      {
        name: "Shape and variant",
        description:
          "`shape` picks round (the default) or sharp; `variant` picks outline (the default) or filled, typed to the drawings the icon has. Filled marks an on state: the current page, a pinned column, a recorded outcome.",
        render: () => (
          <div className="flex items-end gap-6">
            {drawings.map(({ shape, variant }) => (
              <div key={`${shape}-${variant}`} className="flex flex-col items-center gap-1.5">
                <Icon icon={ShieldCheckIcon} size="lg" shape={shape} variant={variant} />
                <span className="font-mono text-caption text-muted-foreground">
                  {shape} · {variant}
                </span>
              </div>
            ))}
          </div>
        ),
      },
      {
        name: "Decorative vs labelled",
        description:
          "Without `title` the icon is hidden from assistive technology; with it, it becomes an image with that name. The readout shows what is exposed.",
        render: () => (
          <div className="flex flex-col gap-3">
            <AccessibilityReadout>
              <Icon icon={CircleCheckIcon} className="text-success-text" />
            </AccessibilityReadout>
            <AccessibilityReadout>
              <Icon
                icon={CircleXIcon}
                title="Webhook delivery failed"
                className="text-destructive-text"
              />
            </AccessibilityReadout>
          </div>
        ),
      },
      {
        name: "Qeet brand icons",
        description:
          "Concepts @qeetrix/icons lacks ship with the library and take the same size and stroke scale.",
        render: () => (
          <div className="flex items-center gap-4 text-muted-foreground">
            <Icon icon={IconPasskey} size="lg" title="Passkey" />
            <Icon icon={IconApiKey} size="lg" title="API key" />
            <Icon icon={IconScimSync} size="lg" title="SCIM sync" />
            <Icon icon={IconWebhook} size="lg" title="Webhook" />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: iconControls,
      render: (v) => {
        const common = {
          size: v.size === "32" ? 32 : v.size,
          stroke: v.stroke,
          shape: v.shape,
          title: v.title || undefined,
          className: tones[v.tone] || undefined,
        };
        return v.variant === "filled" && v.icon in filledIcons ? (
          <Icon
            icon={filledIcons[v.icon as keyof typeof filledIcons]}
            variant="filled"
            {...common}
          />
        ) : (
          <Icon icon={icons[v.icon]} {...common} />
        );
      },
      code: (v) =>
        jsx("Icon", {
          icon: expr(v.icon),
          size: v.size === "md" ? undefined : v.size === "32" ? 32 : v.size,
          stroke: v.stroke === "regular" ? undefined : v.stroke,
          shape: v.shape === "round" ? undefined : v.shape,
          variant: v.variant === "filled" && v.icon in filledIcons ? "filled" : undefined,
          title: v.title || undefined,
          className: tones[v.tone] || undefined,
        }),
    }),
  },
};
