import { Button, Container, Separator, Typography } from "@qeetrix/ui";
import { changedProps, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select } from "../registry/types";

const sizes = [
  { size: "prose", max: "max-w-2xl · 672px", use: "Release notes, docs, legal copy" },
  { size: "content", max: "max-w-4xl · 896px", use: "Standard console pages (default)" },
  { size: "wide", max: "max-w-6xl · 1152px", use: "Tables, dashboards, log explorers" },
  { size: "full", max: "max-w-none", use: "The parent owns the width" },
] as const;

/** A dashed track showing how wide a Container gets inside the preview. */
function WidthBand({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border border-dashed border-border-strong bg-surface-sunken px-3 py-2">
      <span className="font-mono text-caption font-medium">{label}</span>
      <span className="text-caption text-muted-foreground">{hint}</span>
    </div>
  );
}

const containerControls = {
  size: select(["prose", "content", "wide", "full"] as const, "content"),
  gutters: bool(true, "Gutters (responsive inline padding)"),
};

export const examples: FamilyExamples = {
  container: {
    layout: "wide",
    minHeight: 900,
    demos: [
      {
        name: "Sizes",
        description:
          "Each size caps the width and centres the content; narrower previews show them collapsing to the available width.",
        render: () => (
          <div className="flex flex-col gap-3 rounded-lg bg-surface-subtle py-3">
            {sizes.map((entry) => (
              <Container key={entry.size} size={entry.size}>
                <WidthBand label={`size="${entry.size}" · ${entry.max}`} hint={entry.use} />
              </Container>
            ))}
          </div>
        ),
      },
      {
        name: "Gutters off",
        description:
          "`gutters={false}` drops the responsive inline padding, for a parent that already pads (a Card, a Sheet).",
        render: () => (
          <div className="flex flex-col gap-3 rounded-lg bg-surface-subtle py-3">
            <Container size="prose">
              <WidthBand label="gutters (default)" hint="px-4 · sm:px-6 · lg:px-8" />
            </Container>
            <Container size="prose" gutters={false}>
              <WidthBand label="gutters={false}" hint="Edge to edge within the cap" />
            </Container>
          </div>
        ),
      },
      {
        name: "Prose page",
        description: "A Qeet ID changelog entry set at a readable measure.",
        render: () => (
          <div className="rounded-lg border bg-card py-6">
            <Container size="prose">
              <Typography variant="muted">Changelog · 6 October 2026</Typography>
              <Typography variant="h3" as="h2" className="mt-2">
                Passkeys are now required for every admin role
              </Typography>
              <Typography>
                Tenants on the Enterprise plan can enforce passkeys for Owners, Admins and Billing
                users from <strong>Security → Policies</strong>. Existing TOTP enrolments keep
                working for 30 days, then sign-in prompts the user to register a passkey on their
                device.
              </Typography>
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Review admin policy</Button>
                <Button size="sm" variant="ghost">
                  Read the migration guide
                </Button>
              </div>
            </Container>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: containerControls,
      render: (v) => (
        <div className="w-[min(100%,1100px)] rounded-lg bg-surface-subtle py-3">
          <Container size={v.size} gutters={v.gutters}>
            <WidthBand
              label={`size="${v.size}"`}
              hint={sizes.find((entry) => entry.size === v.size)?.max ?? ""}
            />
          </Container>
        </div>
      ),
      code: (v) =>
        jsx("Container", changedProps(v, containerControls), [
          '<PageHeader title="Users" description="Everyone in Acme India Pvt Ltd." />',
        ]),
    }),
  },
};
