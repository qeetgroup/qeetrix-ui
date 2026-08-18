<div align="center">

# 🎨 Qeetrix

### The Qeet Group design system — one package, every surface

*Premium · Accessible · Token-driven · Built on Base UI + Tailwind v4*

<br>

[![CI](https://github.com/qeetgroup/qeetrix/actions/workflows/ci.yml/badge.svg)](./.github/workflows/ci.yml)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Base UI](https://img.shields.io/badge/Base_UI-1.x-111?logo=radixui&logoColor=white)](https://base-ui.com)
[![Storybook 10](https://img.shields.io/badge/Storybook-10-FF4785?logo=storybook&logoColor=white)](https://storybook.js.org)
[![Bun + Turborepo](https://img.shields.io/badge/Bun-Turborepo-F69220?logo=bun&logoColor=white)](https://bun.sh)

**[🚀 Install](#-install--use)** · **[🏗 Architecture](#-architecture)** · **[🧩 Components](#-whats-inside)** · **[🎨 Tokens](#-design-tokens)** · **[📖 Storybook](#-develop)** · **[🚢 Release](#-release)**

</div>

---

<div align="center">

| 🧩 145 UI modules | 📦 1 install | 🎨 WCAG-AA tokens | 🌗 Light + dark | ⚛️ React 19 |
|:---:|:---:|:---:|:---:|:---:|
| shadcn + Base UI | `@qeetrix/ui` | OKLCH · Style Dictionary | `.dark` class | Tailwind v4 |

</div>

> **Status — pre-1.0 (next publish: `@qeetrix/ui@0.4.0`).** Tokens + brand are now folded into a single `@qeetrix/ui` package; the component set, premium-elevation pass, and Cal Sans typography are in. Already a live dependency of **Qeet ID** (admin · login · website) and **qeet-docs**.

---

## ✨ Why Qeetrix

|  |  |
|:--|:--|
| 📦 **One design-system package** | `@qeetrix/ui` ships components **+ design tokens + brand**; React 19 and Tailwind 4 remain explicit peers |
| ♿ **Accessible by construction** | Built on **Base UI** (WAI-ARIA APG behavior) + axe-tested stories; visible focus, reduced-motion, AA contrast |
| 🎨 **Token-driven theming** | W3C DTCG JSON → Style Dictionary → CSS + JSON; OKLCH colour, light/dark via the `.dark` class |
| 💎 **Premium by default** | Layered elevation, refined focus rings, tasteful hover-lift micro-interactions, self-hosted Cal Sans |
| 🌗 **First-class dark mode** | Every component themed through semantic tokens — no hard-coded greys |
| 🏢 **Enterprise breadth** | Data tables, command palette, rich-text editor, charts, sidebar shells, date/time pickers, and more |
| 🧱 **Consistent foundation** | Shared `cva` + `cn()` conventions, `data-slot` hooks, tree-shakeable named exports |
| 🔒 **Quality-gated** | Typecheck + ESLint + Vitest/axe + WCAG contrast + Storybook build run in CI on every PR |

---

## 🏗 Architecture

A **Bun + Turborepo** monorepo that publishes a single consumable package. Tokens are the source of truth; everything downstream is generated or composed from them.

```mermaid
flowchart TB
    subgraph src["packages/ui — @qeetrix/ui"]
        direction LR
        tokens["Design tokens<br/>W3C DTCG JSON · OKLCH<br/>packages/ui/tokens/"]
        sd["Style Dictionary<br/>scripts/build-tokens.mjs<br/>→ semantic + raw --qx-* CSS + JSON"]
        comps["145 UI modules<br/>custom + Base UI<br/>src/components/ui/"]
        brand["Brand<br/>QeetLogo + 10 icons<br/>src/brand/"]
        tokens --> sd --> comps
        brand --> comps
    end

    consumers["Qeet ID — admin · login · website<br/>qeet-docs · future Qeet products"]
    workshop["apps/qeetrix-story — Storybook 10 workshop"]

    comps --> consumers
    comps --> workshop
```

**Build pipeline (`@qeetrix/ui`):** `build-tokens` (Style Dictionary) → `tsc` → `tsc-alias` → `postbuild` (inlines the token CSS, copies fonts). The shared `package.json` **`workspaces.catalog`** pins React / Tailwind / TS across the repo.

### Packages

| Package | What it is | Published |
|:--|:--|:--:|
| **`@qeetrix/ui`** | The component library **+ tokens + brand** — the one package consumers install | ✅ |
| `@qeetrix/tsconfig` | Shared TypeScript presets | ✅ |
| `@qeetrix/eslint-config` | Shared ESLint flat config (base + React) | ✅ |
| `apps/qeetrix-story` | Storybook 10 workshop — foundations + a story per component | private |

> `@qeetrix/tokens` and `@qeetrix/brand` were once separate packages; they're now **folded into `@qeetrix/ui`** and exposed as subpaths (`@qeetrix/ui/tokens.css`, `/tokens.json`, `/qeetrix.css`, `/brand`).

---

## 🚀 Install & use

```bash
bun add @qeetrix/ui react react-dom tailwindcss
# peers: React/React DOM >=19, Tailwind CSS >=4
```

In your Tailwind v4 global stylesheet:

```css
@import "@qeetrix/ui/styles.css";              /* tokens + fonts + base layer */
@source "../node_modules/@qeetrix/ui/dist/**/*.js";   /* let Tailwind see component classes */
```

Then wrap the app and compose:

```tsx
import { ThemeProvider, Button, Card, CardContent } from "@qeetrix/ui";
import { QeetLogo } from "@qeetrix/ui/brand";

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <Card>
        <CardContent className="flex items-center gap-3">
          <QeetLogo size={28} />
          <Button>Authenticate with Qeet</Button>
        </CardContent>
      </Card>
    </ThemeProvider>
  );
}
```

Light/dark is driven by the `.dark` class (managed by `ThemeProvider`). Its keyboard shortcut is disabled by default; `enableKeyboardShortcut` opts into `Ctrl/Meta+Shift+D`. Need raw values? `@qeetrix/ui/tokens.css` (the `--qx-*` ramp) and `@qeetrix/ui/tokens.json`.

**Import surfaces:** barrel `@qeetrix/ui` · canonical per-component `@qeetrix/ui/components/button` · compatible legacy `@qeetrix/ui/components/ui/button` · providers such as `@qeetrix/ui/components/theme-provider` · brand code `@qeetrix/ui/brand` · brand CSS with or without `.css` · utils `@qeetrix/ui/lib/utils` · hooks `@qeetrix/ui/hooks/*`.

---

## 🧩 What's inside

> 145 React UI modules across the full enterprise surface; every non-alias module has a colocated Vitest/axe test and matching component stories cover the public catalog.

- **Overlays** — Dialog · Sheet · Drawer · Popover · DropdownMenu · ContextMenu · Menubar · HoverCard · Tooltip · CommandPalette · NavigationMenu
- **Inputs & controls** — Button · Input · Textarea · Select · Combobox · MultiSelect · Autocomplete · Checkbox · Radio · Switch · Toggle · Slider · AngleSlider · OTPInput · NumberField · Field / Form · Chip · SegmentedControl · ColorPicker · Date / Time / Timezone pickers
- **Data & navigation** — Table · DataTable · Tabs · Breadcrumb · Pagination · Sidebar · Tree · Timeline · Accordion · Collapsible · Listbox · TableOfContents · Carousel · Charts
- **Enterprise operations** — AccessReview · AuditLog / AuditEvent · SecurityItem · accessible ChartDataTable fallbacks · responsive ScheduleCalendar agenda
- **Feedback & surfaces** — Card · Alert · Banner · Notification · Toast · Stat · Badge · StatusPill · Skeleton · Progress · Meter · EmptyState · Feed · Spoiler · Marquee
- **Content & typography** — Typography / Prose · Blockquote · Highlight · Kbd · CodeBlock · JSONTree · RichTextEditor · NumberFormatter · RollingNumber
- **Brand** — `QeetLogo` (theme-adaptive) + 10 custom Qeet icons, at `@qeetrix/ui/brand`
- **Blocks** — auth, dashboard shell, settings layout, onboarding wizard, pricing table

---

## 🎨 Design tokens

The single source of truth lives in [`packages/ui/tokens/`](packages/ui/tokens/) as **W3C DTCG JSON** (primitives → light/dark semantic + shadcn bridge). [Style Dictionary](packages/ui/scripts/build-tokens.mjs) compiles them to:

- `@qeetrix/ui/styles.css` — the full entry (semantic `:root` / `.dark` vars, baked in)
- `@qeetrix/ui/tokens.css` — the raw `--qx-*` ramp · `@qeetrix/ui/tokens.json` — resolved per theme
- `@qeetrix/ui/qeetrix.css` — semantic layer only

Colour is authored in **OKLCH**; elevation uses a **layered shadow ladder** (rest · hover · popover · modal). Every semantic text/surface pair is held to **WCAG-AA contrast** by a build gate (`bun run tokens:validate`).

> The brand palette (`OD-DS-03`) is a documented open decision — tokens stay neutral until it lands; the Qeet orange (`#F26D0E`) is the leading candidate.

---

## 🛠 Develop

**Toolchain:** Node ≥ 20.9 (`nvm use node`) · **Bun ≥ 1.3** · Turborepo.

```bash
bun install
bun run build            # turbo run build (@qeetrix/ui regenerates tokens, then compiles)
bun run tokens:build     # regenerate only the design tokens (Style Dictionary)
bun run tokens:validate  # WCAG-AA contrast gate on the generated semantic pairs
bun run lint && bun run typecheck
bun run --filter @qeetrix/ui test           # Vitest + vitest-axe
bun run --filter @qeetrix/docs storybook    # component workshop on :6006
```

Adding a component? Drop it in [`packages/ui/src/components/ui/`](packages/ui/src/components/ui/) (one flat file, `cva` + `cn()`, `data-slot`, Base UI for anything interactive), export it from `src/index.ts`, add a story + a Vitest/axe test, and record a changeset. The competitive backlog lives in [`qeet-files/qeetrix/COMPONENT-PROPOSALS.md`](../qeet-files/qeetrix/COMPONENT-PROPOSALS.md); the delivery pipeline + agents in [`.claude/PIPELINE.md`](.claude/PIPELINE.md). See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 🚢 Release

Versioning + npm publishing run on [Changesets](.changeset/README.md):

```bash
bun run changeset          # record a change (pick packages + bump)
bun run version-packages   # apply bumps + changelogs (usually CI)
bun run release            # build all, then publish changed public packages
```

CI runs lint + typecheck + build + token contrast + Storybook on every PR; merging the **Version Packages** PR publishes to the `@qeetrix` npm org (needs `NPM_TOKEN`).

---

## 📚 Documentation · 🤝 Contributing · 📄 License

| Topic | Where |
|:--|:--|
| 🧱 Component workshop | `bun run --filter @qeetrix/docs storybook` → <http://localhost:6006> |
| 🤖 For AI assistants | [CLAUDE.md](./CLAUDE.md) — commands, architecture, gotchas |
| 🗺 Component backlog | [qeet-files/qeetrix/COMPONENT-PROPOSALS.md](../qeet-files/qeetrix/COMPONENT-PROPOSALS.md) |
| 🔧 Contributing | [CONTRIBUTING.md](./CONTRIBUTING.md) |

Part of the **Qeet Group** workspace alongside [Qeet ID](../qeet-servers/qeet-id-server/). Licensed **UNLICENSED** (private to Qeet Group) pending the public-release decision.
