import { KeyRoundIcon } from "@qeetrix/icons";
import {
  Button,
  ColorPicker,
  ColorSwatch,
  ColorSwatchGroup,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@qeetrix/ui";
import { useState } from "react";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/* Tenant brand colours are data: they arrive from tenant settings, not from the design system. */

/** Brand colours offered for a tenant's hosted sign-in page. */
const brandPresets = ["#1d4ed8", "#0f766e", "#b45309", "#be123c", "#6d28d9", "#0f172a"];

const tenantBrands = [
  { id: "tnt_acme", name: "Acme India", color: "#1d4ed8" },
  { id: "tnt_zenvia", name: "Zenvia Health", color: "#0f766e" },
  { id: "tnt_bharat", name: "Bharat FinServ", color: "#b45309" },
  { id: "tnt_kanpur", name: "Kanpur Logistics", color: "#be123c" },
];

const themes = [
  { id: "ocean", label: "Ocean", color: "#1d4ed8" },
  { id: "forest", label: "Forest", color: "#0f766e" },
  { id: "saffron", label: "Saffron", color: "#b45309" },
  { id: "plum", label: "Plum", color: "#6d28d9" },
  { id: "ink", label: "Ink (Enterprise plan)", color: "#0f172a", locked: true },
];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Readable text on a brand fill: dark on light colours, light on dark ones (WCAG luminance). */
function onColor(hex: string): string {
  const full =
    hex.length === 4
      ? hex
          .slice(1)
          .split("")
          .map((c) => c + c)
          .join("")
      : hex.slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = Number.parseInt(full.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#0f172a" : "#ffffff";
}

function BrandColourDemo() {
  const [color, setColor] = useState("#1d4ed8");
  const valid = HEX.test(color);
  return (
    <div className="flex flex-wrap items-start gap-6">
      <Field className="w-64">
        <FieldLabel>Brand colour</FieldLabel>
        <ColorPicker value={color} onChange={setColor} presets={brandPresets} name="brand_color" />
        <FieldDescription>Used for buttons and links on id.qeet.in/t/acme.</FieldDescription>
      </Field>
      <div className="flex w-64 flex-col gap-3 rounded-lg border bg-card p-4 shadow-rest">
        <p className="text-caption text-muted-foreground">Hosted sign-in preview</p>
        <p className="font-heading text-base font-semibold">Sign in to Acme India</p>
        <Button
          className="w-full"
          style={valid ? { backgroundColor: color, color: onColor(color) } : undefined}
        >
          <KeyRoundIcon data-icon="inline-start" aria-hidden />
          Continue with a passkey
        </Button>
      </div>
    </div>
  );
}

function ThemeSwatchesDemo() {
  const [theme, setTheme] = useState("ocean");
  const current = themes.find((entry) => entry.id === theme);
  return (
    <div className="flex flex-col gap-2">
      <ColorSwatchGroup aria-label="Sign-in page theme">
        {themes.map((entry) => (
          <ColorSwatch
            key={entry.id}
            color={entry.color}
            size="lg"
            label={entry.label}
            selected={theme === entry.id}
            disabled={entry.locked}
            onClick={() => setTheme(entry.id)}
          />
        ))}
      </ColorSwatchGroup>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Theme: {current?.label}
      </p>
    </div>
  );
}

const pickerControls = {
  defaultValue: text("#1d4ed8", "Default value"),
  presets: select(["brand", "library default", "none"] as const, "brand", "Presets"),
  placeholder: text("#5b21b6", "Placeholder"),
  required: bool(false),
  disabled: bool(false),
};

const swatchControls = {
  color: text("#1d4ed8", "Colour"),
  size: select(["xs", "sm", "md", "lg"] as const, "lg"),
  label: text("Acme India brand colour", "Label"),
  interactive: bool(true, "Interactive (onClick)"),
  selected: bool(false),
  disabled: bool(false),
};

export const examples: FamilyExamples = {
  "color-picker": {
    demos: [
      {
        name: "Brand colour",
        description:
          "A tenant's sign-in brand colour: native picker swatch, hex field and preset chips.",
        render: () => <BrandColourDemo />,
      },
      {
        name: "Empty",
        description: "No colour yet: a checkered swatch and the library's default presets.",
        render: () => (
          <Field className="w-64">
            <FieldLabel>Accent colour (optional)</FieldLabel>
            <ColorPicker />
          </Field>
        ),
      },
      {
        name: "Invalid",
        description: "An unparseable hex is marked aria-invalid by the component itself.",
        render: () => (
          <Field className="w-64">
            <FieldLabel>Link colour</FieldLabel>
            <ColorPicker defaultValue="#12g45z" presets={[]} />
            <FieldError>Enter a 3- or 6-digit hex colour, like #1d4ed8.</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-64">
            <FieldLabel>Brand colour</FieldLabel>
            <ColorPicker defaultValue="#0f766e" presets={brandPresets} disabled />
            <FieldDescription>Inherited from the parent tenant, Zenvia Health.</FieldDescription>
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls: pickerControls,
      render: (v) => (
        <div className="w-64">
          <ColorPicker
            key={v.defaultValue}
            defaultValue={v.defaultValue}
            presets={v.presets === "brand" ? brandPresets : v.presets === "none" ? [] : undefined}
            placeholder={v.placeholder}
            required={v.required}
            disabled={v.disabled}
            ariaLabel="Brand colour"
          />
        </div>
      ),
      code: (v) =>
        jsx("ColorPicker", {
          defaultValue: v.defaultValue || undefined,
          presets:
            v.presets === "brand"
              ? expr(JSON.stringify(brandPresets).replaceAll(",", ", "))
              : v.presets === "none"
                ? expr("[]")
                : undefined,
          ...changedProps(v, pickerControls, ["placeholder", "required", "disabled"]),
          ariaLabel: "Brand colour",
        }),
    }),
  },

  "color-swatch": {
    demos: [
      {
        name: "Sizes",
        render: () => (
          <div className="flex items-center gap-3">
            <ColorSwatch color="#1d4ed8" size="xs" label="Acme India brand, extra small" />
            <ColorSwatch color="#1d4ed8" size="sm" label="Acme India brand, small" />
            <ColorSwatch color="#1d4ed8" label="Acme India brand, medium" />
            <ColorSwatch color="#1d4ed8" size="lg" label="Acme India brand, large" />
          </div>
        ),
      },
      {
        name: "Selectable group",
        description:
          "With `onClick` a swatch is a toggle button; the Enterprise-only theme is disabled.",
        render: () => <ThemeSwatchesDemo />,
      },
      {
        name: "Inline, display only",
        description: "Without `onClick` a swatch is an image named by its label.",
        render: () => (
          <ul className="flex w-64 flex-col gap-2 text-sm">
            {tenantBrands.map((tenant) => (
              <li key={tenant.id} className="flex items-center gap-2">
                <ColorSwatch
                  color={tenant.color}
                  size="sm"
                  label={`${tenant.name} brand colour`}
                  title={tenant.color}
                />
                <span className="flex-1">{tenant.name}</span>
                <span className="font-mono text-caption text-muted-foreground">{tenant.color}</span>
              </li>
            ))}
          </ul>
        ),
      },
    ],
    playground: definePlayground({
      controls: swatchControls,
      render: (v) => (
        <ColorSwatch
          color={v.color}
          size={v.size}
          label={v.label}
          selected={v.selected}
          disabled={v.disabled}
          onClick={v.interactive ? () => undefined : undefined}
        />
      ),
      code: (v) =>
        jsx("ColorSwatch", {
          color: v.color,
          size: v.size === "md" ? undefined : v.size,
          label: v.label,
          selected: v.selected,
          disabled: v.disabled,
          onClick: v.interactive ? expr("() => setColor(color)") : undefined,
        }),
    }),
  },
};
