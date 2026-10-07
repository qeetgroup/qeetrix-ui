import { KeyRoundIcon, ShieldCheckIcon, UsersIcon, WebhookIcon } from "@qeetrix/icons";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CodeBlock,
  Field,
  FieldLabel,
  Input,
  Separator,
} from "@qeetrix/ui";
import type { ReactNode } from "react";
import type { FrameTheme } from "../lib/frame";
import { QeetWordmarkLogo, ThemedQeetLogo, ThemedQeetWordmark } from "../lib/qeet-brand";
import { useShellFrameEnv } from "../shell/environment";
import { Page, Section } from "../shell/page";
import { PreviewFrame } from "../shell/preview-frame";

/* ── Code an application writes ───────────────────────────────────────────────────────────── */

const installCode = "bun add @qeetrix/icons";

const basicCode = `import { QeetLogo, QeetWordmarkLogo } from "@qeetrix/icons";

// On a light surface
<QeetLogo height={32} aria-label="Qeet" />
<QeetWordmarkLogo height={28} aria-label="Qeet" />                   // tile
<QeetWordmarkLogo variant="plain" height={24} aria-label="Qeet" />   // letters only

// On a dark surface
<QeetLogo variant="dark" height={32} aria-label="Qeet" />
<QeetWordmarkLogo variant="dark" height={28} aria-label="Qeet" />
<QeetWordmarkLogo variant="plain-dark" height={24} aria-label="Qeet" />`;

const themedCode = `import { QeetWordmarkLogo } from "@qeetrix/icons";

/** Follows a ".dark" class theme (Qeetrix UI's ThemeProvider): CSS shows the matching file. */
export function BrandLogo({ height = 28, plain = false }: { height?: number; plain?: boolean }) {
  return (
    <>
      <QeetWordmarkLogo
        variant={plain ? "plain" : "default"}
        height={height}
        aria-label="Qeet"
        className="inline-block dark:hidden"
      />
      <QeetWordmarkLogo
        variant={plain ? "plain-dark" : "dark"}
        height={height}
        aria-label="Qeet"
        className="hidden dark:inline-block"
      />
    </>
  );
}

// The same two-element pattern themes QeetLogo (variant "default" / "dark").`;

const a11yCode = `// Beside text that already says "Qeet": decorative (the default — alt="" and aria-hidden)
<QeetLogo height={24} />  <span>Qeet ID</span>

// On its own: name it
<QeetWordmarkLogo height={28} aria-label="Qeet" />

// As the home link: the link carries the name, the logo stays decorative
<a href="/" aria-label="Qeet home">
  <BrandLogo height={24} />
</a>`;

const headerCode = `<header className="flex h-14 items-center gap-3 border-b bg-surface px-4">
  <a href="/" aria-label="Qeet home" className="rounded-sm focus-visible:focus-ring">
    <BrandLogo plain height={20} />
  </a>
  <span className="text-muted-foreground">/</span>
  <span className="text-sm font-medium">Qeet ID</span>
  <div className="ms-auto flex gap-2">
    <Button variant="outline" size="sm">Docs</Button>
    <Button size="sm">Invite member</Button>
  </div>
</header>`;

const sidebarCode = `<div className="flex items-center gap-2.5 px-2 py-1.5">
  <BrandMark height={28} />            {/* QeetLogo, themed the same way */}
  <div className="min-w-0">
    <p className="truncate text-sm font-semibold">Qeet ID</p>
    <p className="truncate text-caption text-muted-foreground">Acme India Pvt Ltd</p>
  </div>
</div>`;

const signInCode = `<Card className="w-full max-w-sm">
  <CardHeader>
    <BrandLogo height={28} />
    <CardTitle>Sign in to Acme India</CardTitle>
    <CardDescription>Use your work email to continue.</CardDescription>
  </CardHeader>
  …
</Card>`;

const emailCode = `{/*
  Email is not a React app: there are no theme classes, and Gmail and Outlook do not show SVG
  images. Write the email on a white body, and use a PNG of the plain wordmark exported at 2×
  from icons/brand-icons/brands/qeet-wordmark/plain.svg, hosted on your own domain.
*/}
<td style="background:#ffffff;padding:16px 24px">
  <img src="https://<your-domain>/email/qeet-wordmark-plain@2x.png" alt="Qeet" width="61" height="20" />
</td>`;

/* ── Samples, each rendered in a light and a dark document ────────────────────────────────── */

/** One brand sample, inside a preview frame whose `<html>` carries the theme. */
export function BrandSample({ id }: { id: string }) {
  return <div className="bg-background p-6 text-foreground">{sample(id)}</div>;
}

function sample(id: string): ReactNode {
  switch (id) {
    case "marks":
      return (
        <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
          <figure className="flex flex-col items-start gap-3">
            <ThemedQeetLogo height={72} aria-label="Qeet" />
            <figcaption className="font-mono text-caption text-muted-foreground">
              QeetLogo
            </figcaption>
          </figure>
          <figure className="flex flex-col items-start gap-3">
            <ThemedQeetWordmark height={60} aria-label="Qeet" />
            <figcaption className="font-mono text-caption text-muted-foreground">
              QeetWordmarkLogo
            </figcaption>
          </figure>
          <figure className="flex flex-col items-start gap-3">
            <ThemedQeetWordmark plain height={48} aria-label="Qeet" />
            <figcaption className="font-mono text-caption text-muted-foreground">
              QeetWordmarkLogo variant="plain"
            </figcaption>
          </figure>
        </div>
      );
    case "sizes":
      return (
        <div className="flex flex-col gap-6">
          <SizeRow
            label="QeetLogo"
            sizes={[16, 20, 24, 32, 48]}
            render={(h) => <ThemedQeetLogo height={h} />}
          />
          <SizeRow
            label="QeetWordmarkLogo"
            sizes={[20, 24, 28, 36, 48]}
            render={(h) => <ThemedQeetWordmark height={h} />}
          />
          <SizeRow
            label='QeetWordmarkLogo variant="plain"'
            sizes={[16, 20, 24, 32, 40]}
            render={(h) => <ThemedQeetWordmark plain height={h} />}
          />
        </div>
      );
    case "header":
      return (
        <header className="flex h-14 items-center gap-3 rounded-lg border bg-surface px-4">
          <a href="#/brand" aria-label="Qeet home" className="rounded-sm focus-visible:focus-ring">
            <ThemedQeetWordmark plain height={20} />
          </a>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">Qeet ID</span>
          <div className="ms-auto flex gap-2">
            <Button variant="outline" size="sm">
              Docs
            </Button>
            <Button size="sm">Invite member</Button>
          </div>
        </header>
      );
    case "sidebar":
      return (
        <div className="w-64 rounded-lg border bg-sidebar p-2 text-sidebar-foreground">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <ThemedQeetLogo height={28} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Qeet ID</p>
              <p className="truncate text-caption text-muted-foreground">Acme India Pvt Ltd</p>
            </div>
          </div>
          <Separator className="my-2" />
          <nav className="flex flex-col gap-0.5 text-sm" aria-label="Sample navigation">
            {[
              { icon: UsersIcon, label: "Users", active: true },
              { icon: ShieldCheckIcon, label: "Passkeys" },
              { icon: KeyRoundIcon, label: "API keys" },
              { icon: WebhookIcon, label: "Webhooks" },
            ].map(({ icon: Icon, label, active }) => (
              <span
                key={label}
                className={
                  active
                    ? "relative flex items-center gap-2 rounded-md bg-sidebar-selected px-2 py-1.5 font-medium before:absolute before:inset-y-1.5 before:inset-s-0 before:w-0.75 before:rounded-full before:bg-sidebar-indicator"
                    : "flex items-center gap-2 rounded-md px-2 py-1.5"
                }
              >
                <Icon
                  aria-hidden
                  className={active ? "size-4 text-brand" : "size-4 text-muted-foreground"}
                />
                {label}
              </span>
            ))}
          </nav>
        </div>
      );
    case "signin":
      return (
        <Card className="w-full max-w-sm">
          <CardHeader className="gap-3">
            <ThemedQeetWordmark height={28} aria-label="Qeet" />
            <CardTitle>Sign in to Acme India</CardTitle>
            <CardDescription>Use your work email to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="brand-email">Work email</FieldLabel>
              <Input id="brand-email" type="email" placeholder="you@acme.in" />
            </Field>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            <Button>Continue</Button>
            <p className="text-center text-caption text-muted-foreground">Secured by Qeet ID</p>
          </CardFooter>
        </Card>
      );
    case "email":
      return (
        // An email body is white whatever the reader's theme, so it keeps the light-surface file.
        <div
          className="flex max-w-md flex-col gap-3 rounded-md px-6 py-4"
          style={{ background: "#ffffff", color: "#525252" }}
        >
          <QeetWordmarkLogo variant="plain" height={20} aria-label="Qeet" />
          <p className="text-caption">
            © 2026 Qeet Group · You received this because you are an admin of Acme India.
          </p>
        </div>
      );
    default:
      return <p className="text-sm text-muted-foreground">Unknown sample “{id}”.</p>;
  }
}

function SizeRow({
  label,
  sizes,
  render,
}: {
  label: string;
  sizes: readonly number[];
  render: (height: number) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-caption text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-end gap-6">
        {sizes.map((size) => (
          <div key={size} className="flex flex-col items-start gap-1.5">
            {render(size)}
            <span className="font-mono text-micro text-muted-foreground">{size}px</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── The page ─────────────────────────────────────────────────────────────────────────────── */

function LightDark({
  id,
  title,
  minHeight = 140,
}: {
  id: string;
  title: string;
  minHeight?: number;
}) {
  const env = useShellFrameEnv();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {(["light", "dark"] as FrameTheme[]).map((theme) => (
        <div key={theme} className="flex min-w-0 flex-col gap-1.5">
          <span className="text-caption font-medium text-muted-foreground capitalize">{theme}</span>
          <PreviewFrame
            route={{ kind: "brand", id }}
            env={{ ...env, theme, bg: "canvas" }}
            title={`${title}, ${theme} theme`}
            minHeight={minHeight}
            className="overflow-hidden rounded-xl border"
          />
        </div>
      ))}
    </div>
  );
}

function Example({
  id,
  title,
  code,
  minHeight,
}: {
  id: string;
  title: string;
  code: string;
  minHeight?: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-sm font-semibold">{title}</h3>
      <LightDark id={id} title={title} minHeight={minHeight} />
      <CodeBlock value={code} language="text" />
    </div>
  );
}

const rules: { kind: "do" | "dont"; title: string; body: string }[] = [
  {
    kind: "do",
    title: "Match the file to the surface",
    body: "default and plain on light surfaces, dark and plain-dark on dark ones — or render both and let the theme choose (BrandLogo above).",
  },
  {
    kind: "do",
    title: "Pick tile or plain by the surface",
    body: "Plain letters in headers, footers and other calm surfaces; the tile where the mark must hold its own on photos, colour or busy layouts.",
  },
  {
    kind: "do",
    title: "Keep clear space",
    body: "Leave at least the height of the full stop around the wordmark, and a quarter of its height around the logo.",
  },
  {
    kind: "do",
    title: "Respect minimum sizes",
    body: "QeetLogo from 16px; the tiled wordmark from 20px and the plain one from 16px tall. Below that, use the logo alone.",
  },
  {
    kind: "do",
    title: "Name it once",
    body: "aria-label on a standalone logo; on a home link, name the link and leave the logo decorative.",
  },
  {
    kind: "dont",
    title: "Don't recolour or restyle",
    body: "No CSS filters, gradients, shadows or outlines. The Qeet orange is part of the artwork.",
  },
  {
    kind: "dont",
    title: "Don't stretch or crop",
    body: "Size by height only; the width follows the artwork's own ratio.",
  },
  {
    kind: "dont",
    title: "Don't use the wrong file",
    body: "The default wordmark is a dark tile and the dark one a white tile: each is drawn for the opposite surface. Plain graphite letters vanish on a dark surface, and white ones on a light surface.",
  },
  {
    kind: "dont",
    title: "Don't put plain letters on busy backgrounds",
    body: "Over photos, gradients or brand colour the letters lose their edge. Use the tile there.",
  },
  {
    kind: "dont",
    title: "Don't rebuild it in text",
    body: "Never type “Qeet.” in a font as the logo. Use the component so the artwork stays exact.",
  },
];

export function BrandPage() {
  return (
    <Page
      title="Brand"
      eyebrow={<Badge variant="brand">@qeetrix/icons</Badge>}
      description="The Qeet logo and wordmark — two components with files for light and for dark surfaces, the wordmark with or without its tile — and how to use them in a Qeet product. Every example below renders in a real light and a real dark document."
    >
      <Section
        id="marks"
        title="The logo and the wordmark"
        description="QeetLogo is the “q” mark: graphite (or white) bowl with the orange descender. QeetWordmarkLogo is “Qeet.” in a tile — graphite on light surfaces, white on dark ones — or, as variant plain / plain-dark, the same letters with no tile. The full stop is always Qeet orange."
      >
        <LightDark id="marks" title="Qeet logo and wordmark" minHeight={180} />
      </Section>

      <Section
        id="install"
        title="Install and import"
        description="Both ship in @qeetrix/icons as image components: decorative by default, sized by height."
      >
        <div className="grid gap-3">
          <CodeBlock value={installCode} language="shell" />
          <CodeBlock value={basicCode} language="text" />
        </div>
      </Section>

      <Section
        id="theme"
        title="Follow the light and dark theme"
        description="An image cannot see your app's theme, so render both files and let CSS show the one that matches. This is the pattern for Qeetrix UI's ThemeProvider (a .dark class on <html>); the samples on this page all use it."
      >
        <div className="grid gap-3">
          <CodeBlock value={themedCode} language="text" />
          <Callout variant="info" title="Theme follows the OS instead?">
            Use the same two elements with prefers-color-scheme in CSS. Prefer the class approach
            whenever the app has its own theme toggle, or the logo and the page will disagree.
          </Callout>
        </div>
      </Section>

      <Section
        id="sizes"
        title="Sizes"
        description="Size by height; the width follows the artwork. The plain wordmark is cropped to its letters, so it reads larger than the tile at the same height. Minimums: 16px for the logo and the plain wordmark, 20px for the tile."
      >
        <LightDark id="sizes" title="Logo and wordmark sizes" minHeight={300} />
      </Section>

      <Section
        id="accessibility"
        title="Accessibility"
        description={
          'Decorative unless named: alt="" and aria-hidden by default; aria-label or alt names it.'
        }
      >
        <CodeBlock value={a11yCode} language="text" />
      </Section>

      <Section
        id="in-context"
        title="In a Qeet product"
        description="The same components inside Qeetrix UI, as a product would compose them."
      >
        <div className="flex flex-col gap-10">
          <Example id="header" title="App header" code={headerCode} minHeight={110} />
          <Example id="sidebar" title="Sidebar header" code={sidebarCode} minHeight={260} />
          <Example id="signin" title="Sign-in card" code={signInCode} minHeight={340} />
          <Example id="email" title="Email footer" code={emailCode} minHeight={120} />
        </div>
      </Section>

      <Section id="rules" title="Do and don't">
        <div className="grid gap-3 md:grid-cols-2">
          {rules.map((rule) => (
            <Callout
              key={rule.title}
              variant={rule.kind === "do" ? "success" : "destructive"}
              title={`${rule.kind === "do" ? "Do" : "Don't"} · ${rule.title}`}
            >
              {rule.body}
            </Callout>
          ))}
        </div>
      </Section>
    </Page>
  );
}
