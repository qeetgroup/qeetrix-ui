# @qeetrix/ui

## Unreleased

### Major Changes

- **`@qeetrix/ui` is the component library, and only that.** Eight modules that were not
  components have left the package's exports for copy-paste source in this repository, built on
  the package's public API and never published:
  - [`src/blocks/`](./src/blocks) — sections of a product screen: `AccessReview`, `AuditEvent` (with
    `AuditLog`), `CommentThread`, `LogoUploader`, `NotificationCenter`,
    `NotificationPreferenceMatrix`, `SecurityItem`.
  - [`src/patterns/`](./src/patterns) — a layout solution: `MasterDetail`.

  They are no longer exported from `@qeetrix/ui` or its subpaths
  (`@qeetrix/ui/components/access-review`, …), and the manifest lists 137 components across 97
  families. Their message groups (`accessReview`, `auditEvent`, `commentThread`, `logoUploader`,
  `masterDetail`, `notificationCenter`, `notificationPreferenceMatrix`) left the catalogue, and
  the component tokens only they used (`--qx-component-access-review-*`,
  `--qx-component-notification-center-*`, `--qx-component-notification-preference-matrix-*`) are
  gone. Each file now imports only `@qeetrix/ui` and `@qeetrix/icons`, keeps its English strings
  with a `messages` prop to override them, and keeps its tests.
- **No more brand folder: logos and icons come from `@qeetrix/icons`.** `@qeetrix/ui/brand` and
  its exports are gone: the logo wrappers (`QeetLogo`, `QeetLogoMark`, `QeetLogoOnLight`,
  `QeetLogoOnDark`), which only re-drew `@qeetrix/icons`' logo, and the ten custom icons, which
  duplicated icons `@qeetrix/icons` already has.
- **Typed token values are only the ones code reads.** `Z_INDEX`, `SHADOW`, `STATE_OPACITY` and
  `CHART_COLOR` are no longer exported (from `@qeetrix/ui` or `@qeetrix/ui/lib/token-values`): no
  component read them. `COMPONENT`, `DURATION`, `EASING`, `ICON_SIZE` and `ICON_STROKE` stay, and
  `src/lib/token-values.ts` is now generated directly, replacing the `src/foundations/` folder and
  its layer.

**Check when upgrading:**

- No Qeet product imports any of the eight blocks and patterns. To keep using one, copy its file
  from `src/blocks/` or `src/patterns/` into your app and import it from there.
  `MessagesProvider` translations for those groups no longer reach them; pass `messages` instead.
- Brand imports move to `@qeetrix/icons`. The logo is decorative by default (pass `aria-label`
  to name it) and takes `height` rather than `size`:

  | Was (`@qeetrix/ui`) | Now (`@qeetrix/icons`) |
  |:--|:--|
  | `QeetLogo`, `QeetLogoMark`, `QeetLogoOnLight` | `QeetLogo` |
  | `QeetLogoOnDark` | `QeetLogo variant="dark"` |
  | `QeetLogo` following the theme | both, with `className="dark:hidden"` and `variant="dark" className="hidden dark:block"` |
  | `IconPasskey` | `FingerprintPatternIcon` |
  | `IconMfaShield` | `ShieldCheckIcon` |
  | `IconSamlConnector`, `IconOidcConnector` | `PlugIcon` |
  | `IconScimSync` | `RefreshCwIcon` |
  | `IconWebhook` | `WebhookIcon` |
  | `IconApiKey` | `KeyRoundIcon` |
  | `IconAuditLog` | `ScrollTextIcon` |
  | `IconTenant` | `BuildingComplexIcon` |
  | `IconCrossDevice` | `MonitorSmartphoneIcon` |
- The removed token values are CSS variables: `Z_INDEX.modal` is `var(--qx-z-modal)`,
  `CHART_COLOR.series1` is `var(--chart-1)`, `SHADOW` and `STATE_OPACITY` are the
  `--qx-elevation-*` and `--qx-state-opacity-*` roles. Tooling that needs the numbers reads
  `@qeetrix/ui/tokens.json`. No Qeet product imports them; qeetrix-story's token pages do.

### Minor Changes

- **Every manifest entry has a `description`.** `component-manifest.json` gains a `description`
  field: one sentence on what each component is for. It is the first sentence of the doc comment
  on the component's declaration, or, for a module of several exports such as `Toast` (`Toaster`
  and `toast()`) or `Chart`, a `description` declared in the component registry. Every component
  has one; 23 components gained a doc comment for it, which also shows in editor hovers. Adding
  the field is additive, so `schemaVersion` stays 3.
- **`useControllableState` is public.** The controlled/uncontrolled hook every component uses,
  for building your own components, blocks and patterns on the same contract.

### Patch Changes

- **A `.dark` scope below `<html>` now renders dark.** Component tokens follow the theme through
  the semantic variables (`--qx-component-card-background: var(--qx-color-surface-default)`) and
  were declared only on `:root`, where a `var()` reference is substituted — so a nested `.dark`
  element inherited the light substitution. A dark preview inside a light page showed white
  cards, invisible select values and faded alert text. `tokens.css` (and the raw
  `@qeetrix/ui/tokens.css` export) now re-declare every variable derived from a theme's colours
  inside that theme's selector, the way density-derived variables are already re-declared per
  density scope. Nothing changes where `.dark` sits on `<html>`; a token-governance test pins the
  invariant.

## 2.1.2

### Minor Changes

- **Icons come from `@qeetrix/icons`.** Every component draws its icons from
  [`@qeetrix/icons`](https://www.npmjs.com/package/@qeetrix/icons) (Lucide 1.52 artwork, with
  filled and sharp drawings) instead of `lucide-react`, which is no longer a dependency. The
  library imports each icon from its own path (`@qeetrix/icons/icons/<id>`), so apps and their
  test runners load only the icons it uses.
- **Filled drawings where a state is on.** A pinned DataTable column's pin, the FilterBar bookmark
  while a saved view is applied, AccessReview's recorded outcome, and the success, warning and
  error marks of a Toast now use their filled drawing. Actions, chevrons and glyphs inside
  controls stay outline; Rating keeps its outline star with a gold fill and a darker edge, for
  contrast.
- **`Icon` takes `shape` and `variant`.** `<Icon icon={StarIcon} variant="filled" shape="sharp" />`.
  `variant` is typed to the drawings the icon has, so `variant="filled"` on an outline-only icon is
  a type error. Both are passed to the icon only when given, so Qeet brand icons are unaffected.
- **`QeetLogo` comes from `@qeetrix/icons`.** `QeetLogo`, `QeetLogoMark`, `QeetLogoOnLight` and
  `QeetLogoOnDark` keep their props (`size`, `title`, and `variant` on `QeetLogo`) and artwork,
  which was already identical, but render the mark through `@qeetrix/icons` as an `<img>` instead
  of inline SVG. The generator `scripts/build/logos.mjs`, its raw SVG copies, and the
  `build:logos` script are gone.

**Check when upgrading:**

- Rendered icons no longer carry Lucide's `lucide` and `lucide-*` classes. CSS or tests that
  select them (`.lucide-check`) need another hook; this repository's tests compare the drawing
  instead (`src/__tests__/icon-match.ts`).
- `QeetLogoVariantProps` now extends `<img>` props rather than `<svg>` props, and a `ref` on a
  logo is an `HTMLImageElement`.
- Apps that imported `lucide-react` through `@qeetrix/ui` without declaring it must add it, or
  move to `@qeetrix/icons`. Every Qeet app in this workspace already declares its own.

## 2.1.1

### Patch Changes

- **`@qeetrix/ui/styles.css` includes the base layer again.** Since 2.0.0 the base layer lived in
  a separate `base.css` that `styles.css` never reached, so apps importing `styles.css` silently
  went without it: page type and background, heading and control fonts, the skeleton shimmer,
  the reduced-motion collapse and the forced-colors mapping. Headings, body text and native
  controls pick up Qeetrix fonts and colours again, so check screens that were styled while the
  layer was missing. No import changes.
- **One stylesheet.** The base layer is merged back into `src/styles/index.css`, and
  `@qeetrix/ui/styles.css` is the only stylesheet entry. The generated token files
  (`qeetrix.css`, `tokens.css`, `tokens.json`) are unchanged.
- **Removed `@qeetrix/ui/base.css`.** It exported the base layer on its own and only worked
  compiled alongside `styles.css`, which now includes it. No known consumer imports it; if you do,
  delete the import.
- The export map, and the rule that `src/styles` holds one hand-authored stylesheet, are now
  locked by `src/__tests__/token-governance.test.ts`.

## 2.1.0

### Minor Changes

- **Ember + Graphite foundation.** A neutral Graphite ramp replaces the warm greys, so dark mode
  is a neutral near-black. Primary actions use Qeet Ember `#D04800` with white text (4.55:1,
  WCAG AA); `#F26D0E` stays the brand colour. Disabled primary buttons are neutral, and shadows
  are neutral.
- **New tokens and utilities.** About 260 new `--qx-*` variables, among them
  `feedback.*-strong`, `text.on-feedback-strong` and `text.on-warning-strong`, with Tailwind
  utilities such as `bg-canvas`, `bg-surface-*`, `text-link` and `border-control`, the
  `focus-ring`, `focus-ring-inset` and `focus-ring-field` utilities, and motion duration
  utilities.
- **Alerts.** Stronger status tints, coloured titles, a 3px accent bar, and an opt-in
  `emphasis="strong"`. Callout titles and toasts take the status colour too.
- **84 new exports**, from the component modernisation: new parts (`DialogBody`, `DrawerBody`,
  `SheetBody`, `TableEmpty`, `TimelineHeader`, `ToolbarSpacer`, `FieldSuccess`, `FieldWarning`,
  `InputGroupButton`, `CarouselControls`, `CarouselIndicators`, `AlertAction`, `CommentMention`,
  …), variant helpers (`separatorVariants`, `statVariants`, `emptyStateVariants`, …), and props
  types for existing components.

Nothing was removed: every 2.0.0 export, subpath, component and token variable is still there.
Colours change visibly, so review screens that relied on the old orange primary or the warm dark
mode.

## 2.0.0

### Major Changes

- Enterprise architecture: component-first folder structure

  Components are now organized by family (`Button/`, `Input/`, `Dialog/`, …) instead of generic categories (`actions/`, `inputs/`, …).

  **Breaking changes**

  - `@qeetrix/ui/blocks` and all `@qeetrix/ui/blocks/*` exports removed — these were application-level compositions, not library concerns.
  - Old category group imports (`@qeetrix/ui/components/actions`, `…/inputs`, etc.) removed. Use `@qeetrix/ui/components/<Family>` (e.g. `@qeetrix/ui/components/Button`) or the root barrel `@qeetrix/ui`.

  **Everything else unchanged** — all component APIs, tokens, hooks, providers, and `@qeetrix/ui/components/<slug>` deep imports continue to work exactly as before.

## 1.0.3

### Patch Changes

- fix(select): resolve the selected option's label in the trigger instead of its raw value by auto-deriving Base UI's items map from SelectItem children (#30).

## 1.0.1

### Patch Changes

- Ship compiled dist — 1.0.0 was published without build output.

## 1.0.0

### Major Changes

- **1.0.0 — first stable major release.** 24 new components close the competitive gap analysis against shadcn/ui, Radix, Base UI, Mantine, Chakra, and Ark UI, plus one breaking rename, status token triads, and a tooling migration.

  **New accessibility & navigation primitives:** `VisuallyHidden` (screen-reader-only wrapper), `SkipNav` + `SkipNavContent` (WCAG 2.4.1 bypass-blocks), `Link` (styled polymorphic anchor), `Portal` (SSR-safe `createPortal`), `FocusTrap` + `useFocusTrap` (tab-cycle containment with focus restore).

  **New buttons & controls:** `CloseButton` (accessible dismiss), `IconButton` (TypeScript-enforced `aria-label`), `ButtonGroup` (connected cluster), `NativeSelect` (mobile-parity `<select>`), `PasswordInput` (show/hide toggle), `MaskInput` (phone/IBAN/card masks, zero-dependency).

  **New selection & inline editing:** `CheckboxCard` / `CheckboxCardGroup`, `RadioCard` / `RadioCardGroup` (full-card-clickable selection), `Editable` (click-to-edit in place), `ColorSwatch` / `ColorSwatchGroup`.

  **New feedback & overlays:** `Callout` (static info box), `ProgressCircle` (circular progress), `ToggleTip` (click-activated info popover, distinct from Tooltip), `PreviewCard` (link-metadata preview), `ActionBar` (floating bulk-action toolbar), `Tour` + `useTour` (guided onboarding overlay), `Timer` + `useTimer` (countdown/stopwatch), `QRCode` (adds the `qrcode` dependency), `CopyButton` + `useCopyToClipboard` (general clipboard primitive).

  **Breaking change:** `PaginationBar` → `Pagination` (and `PaginationBarProps` → `PaginationProps`). A deprecated `pagination-bar` re-export shim remains temporarily; update imports to `Pagination`.

  **Tokens:** completed the status color triads — `success`, `warning`, `error`/`destructive`, and `info` each gain matching `-foreground` and `-border` variants across light and dark themes, all passing the WCAG-AA contrast gate.

  **Tooling:** migrated linting/formatting fully to Biome (removed ESLint + Prettier), dropped Turbo in favor of `bun run --filter`, and renamed the bundled display/text/UI fonts from Cal Sans to Qeet.

### Minor Changes

- c171669: Design-system platform additions (Phases B–C):

  - **Multi-brand theming.** `@qeetrix/ui/brands/<brand>.css` overlays (qeet-id, qeet-logs, qeet-notify, qeet-people, qeet-mail) plus `<BrandProvider brand>` set `data-qx-brand` on `<html>` to re-skin the primary/accent surfaces. Every overlay passes the WCAG-AA contrast gate (which now checks brands too). The former orphan `packages/themes` is folded in and removed.
  - **Composite tokens.** New `gradient` + `stroke-style` DTCG token types serialize to real CSS — `--qx-gradient-*` (e.g. `linear-gradient(135deg, …)`), `--qx-stroke-*`.
  - **Icon system.** `<Icon>` wrapper + `--qx-icon-size-*` / `--qx-icon-stroke-*` tokens standardise lucide/brand icon sizing and stroke; decorative by default, `title` for an accessible name.
  - **i18n.** Optional `I18nProvider` / `useTranslations` / `useI18n` locale layer with English fallback and `{var}` interpolation, composing with `DirectionProvider`. New `@qeetrix/ui/i18n` export.
  - **Motion.** `useMotion()` + `transition()` / `DURATION` / `EASING`, collapsing to no-motion under `prefers-reduced-motion`.

  All additive — no breaking changes.

- c171669: Activate the Qeet brand color (OD-DS-03) and fix the monospace font token.

  - **Brand color — Qeet orange.** `color.brand.*` now resolves to the OKLCH orange ramp (`#F26D0E` ≈ `orange.500`) instead of aliasing neutral. Primary buttons, links, focus rings, and the shadcn `--primary` / `--ring` / `--sidebar-primary` bridge variables are now orange, paired with a **dark on-brand foreground** so labels stay WCAG-AA. The contrast gate (`bun run tokens:validate`) now **enforces** the brand-dependent pairs (button-label-on-primary, focus-ring-on-canvas) that were previously advisory.
  - **`--font-mono` fix.** The `font.family.mono` token was set to `"Cal Sans Text"` (not a monospace) and drifted from `styles.css`. It now points to the bundled **Fira Code**. Consumers that patched the mono font locally (e.g. qeet-docs loading Fira Code from Google) can drop the workaround.

  **Downstream impact:** this is a visible theming change for every consumer (qeet-id, qeet-docs, qeet-notify, qeet-logs) — primary/accent surfaces render Qeet orange after upgrading. No API/export changes.

- c171669: Add `ScheduleCalendar` — a day/week/month scheduling surface (Module 03.5, the last
  unbuilt component). Events render as accessible buttons (`onEventClick`); selecting a
  day fires `onRangeSelect`; `view` and `date` are controlled or uncontrolled; formatting
  is timezone-aware. Built on native date math (no new dependencies) and existing
  primitives (Button, SegmentedControl). Recurring events, drag-to-create/resize, and a
  pixel-positioned time grid are documented follow-ups (see
  `docs/specs/schedule-calendar.md`).

### Patch Changes

- a5f5479: Push a11y test coverage from 62% to 83.6% (97/116 components). Adds 25 colocated Vitest + axe
  test files covering all previously-exempted non-overlay and overlay components: scroll-area,
  resizable, data-state, password-strength-meter, form, app-shell, json-tree, stepper,
  number-field, pagination-bar, toolbar, copyable-secret, country-picker, logo-uploader,
  otp-input, calendar, tooltip, hover-card, dialog, sheet, alert-dialog, drawer, select,
  navigation-menu, and popover. Shrinks the exemption backlog from 44 → 19. Also removes
  duplicate rating and tag-input entries from the global smoke harness (both are now covered by
  colocated tests).

## 0.5.0

### Minor Changes

- 42e3b8c: The monospace font is now bundled **Fira Code** (SIL OFL 1.1), replacing the previous Cal Sans Text mono fallback. This repoints the `--font-mono` token, so every monospace surface picks it up automatically — code blocks, `<kbd>`, copyable secrets, JSON trees, diff viewers, OTP inputs, the color-picker hex value, and chart axis numbers. No API changes; purely a typographic upgrade for code-like content.
- a4bd2da: Add 16 new components from the competitive backlog (`COMPONENT-PROPOSALS.md`), each with a Storybook story and Vitest/axe tests:

  - **Inputs & selection:** `Autocomplete` (free-text + suggestions, Base UI), `Chip` / `ChipGroup` (single/multi-select, removable), `SegmentedControl` (animated indicator), `Listbox` (standalone APG listbox), `AngleSlider` (0–360°).
  - **Feedback & data:** `Notification` (inline card), `Feed` (APG feed pattern), `NumberFormatter`, `RollingNumber`, `OverflowList` (collapse-to-overflow).
  - **Content & layout:** `Blockquote`, `Highlight` (search emphasis), `Spoiler` (truncate + expand), `TableOfContents` (+ `useScrollSpy`), `Marquee`, `FloatingWindow` (+ `useFloatingWindow`).

  Also exports a `usePrefersReducedMotion` hook. All additive — no breaking changes, no new runtime dependencies. Built on existing semantic tokens (no token changes).

- 4ec7f1f: Add 15 PRD-driven reusable components, distilled from the Qeet product PRDs — each with a Storybook story and Vitest/axe tests, composed from existing primitives (no new runtime dependencies):

  - **Filtering & analytics:** `TimeRangePicker`, `FilterBar`
  - **Payments & files:** `CurrencyInput`, `FileTypeIcon`, `FileCard`
  - **Notifications:** `NotificationCenter`, `NotificationPreferenceMatrix`
  - **Collaboration:** `PresenceIndicator`, `ReactionBar`, `MentionInput`, `CommentThread`
  - **Layout & data:** `MasterDetail`, `DiffViewer`, `OrgChart`, `AvailabilityGrid`

  Product-specific UI (mail compose, Pay checkout/invoice, People payroll, ReBAC editor, LogQL/live-tail, News story-clustering, Meet captions) intentionally stays in the product apps. `KanbanBoard` remains deferred pending a drag-and-drop dependency. `ScheduleCalendar` shipped in this release.

- 42e3b8c: Add the full Tailwind v4 color palette (21 ramps × 50–950) as `--qx-color-<name>-<step>` primitive tokens — red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose, slate, gray, zinc, stone. Exposed in `@qeetrix/ui/tokens.css` (raw) and `@qeetrix/ui/tokens.json`, and documented in Foundations → Colors as a palette gallery. Purely additive: existing ramps (`neutral`, the semantic `success`/`warning`/`info`/`danger` status ramps, brand placeholders) and all semantic mappings are unchanged.

### Patch Changes

- 7006c91: Premium visual polish. Elevated the shared elevation system to **layered shadows** (stacked contact + ambient + hairline ring) across the whole ramp (`shadow-xs`…`xl` + `shadow-rest/hover/popover/modal`) and refined the text-selection colour — so every surface (cards, popovers, dialogs, dropdowns, selects) reads more refined automatically. Plus a per-component polish pass on the newest 16: marquee edge fade-masks, segmented-control sliding indicator, angle-slider ring-thumb, listbox/select parity, stronger `Highlight` mark, `Notification` tint, `Feed` depth + hover-lift, `Chip` dark-mode, `Spoiler` fade mask, autocomplete item states. Added tasteful **hover-lift micro-interactions** on interactive surfaces: `Card` now has soft depth (`shadow-rest`) that deepens on hover, and solid `Button` variants (default/secondary) carry a subtle shadow elevation that lifts on hover (press-down via the existing `active:translate-y-px`). List/menu items keep their accent-highlight affordance. Additive only — no API or token-name changes; honors `prefers-reduced-motion` (shadow-only, no layout shift).

## 0.4.0

### Minor Changes

- db64ae7: Fold `@qeetrix/tokens` and `@qeetrix/brand` into `@qeetrix/ui` — one package now ships components, design tokens, and brand, so consumers install a single dependency.

  - **Tokens** are baked into `@qeetrix/ui/styles.css` and exposed as new subpaths: `@qeetrix/ui/tokens.css` (raw `--qx-*`), `@qeetrix/ui/tokens.json` (resolved per theme), and `@qeetrix/ui/qeetrix.css` (semantic `:root` / `.dark` only).
  - **Brand** (Qeet logos + custom icons) is now re-exported from the root barrel (`import { QeetLogo } from "@qeetrix/ui"`) and the `@qeetrix/ui/brand` subpath.

  Migration: replace `@qeetrix/tokens` imports with the matching `@qeetrix/ui/tokens.*` / `@qeetrix/ui/qeetrix.css` subpaths, and `@qeetrix/brand` imports with `@qeetrix/ui` or `@qeetrix/ui/brand`. The standalone `@qeetrix/tokens` and `@qeetrix/brand` packages are deprecated.

## 0.3.1

### Patch Changes

- 969f7f3: Updated
- Updated dependencies [969f7f3]
  - @qeetrix/tokens@0.1.1

## 0.3.0

### Minor Changes

- c565778: Add **DirectionProvider** (+ `useDirection`) for right-to-left support. It wraps Base UI's direction context (so menus, sliders, etc. flip) and sets the `dir` attribute on a `display: contents` wrapper, so CSS logical properties and Tailwind `rtl:` variants resolve for the subtree. The component library already uses logical utilities throughout (`ps-`/`pe-`, `ms-`/`me-`, `start-`/`end-`), so most layout flips automatically.
- 5882cdb: Add an **elevation** and **motion-easing** scale to `@theme` and apply it consistently.

  - Elevation utilities `shadow-rest` / `shadow-hover` / `shadow-popover` / `shadow-modal` (mirroring `@qeetrix/tokens` `shadow.json`). Overlays now use the ladder intentionally: menus/popovers/selects/tooltips/hover-cards/toasts → `shadow-popover`; dialogs/sheets/command-palette → `shadow-modal`; floating/inset sidebar → `shadow-rest` (replacing ad-hoc `shadow-md`/`shadow-lg`/`shadow-xl`).
  - Easing utilities `ease-standard` / `ease-decelerate` / `ease-accelerate` / `ease-sharp` (mirroring `motion.json`) for consistent transition timing.

- 5882cdb: Promote **success / warning / info** to real, themeable semantic colors.

  - `@qeetrix/tokens`: the `success` (emerald), `warning` (amber), and `info` (sky) ramps are now real oklch palettes (were neutral placeholders); `danger` (red) is unchanged. New bridged runtime vars `--success`/`--warning`/`--info` (+ `-foreground`, + `--destructive-foreground`) are emitted per theme — dark shades in light mode, light shades in dark — all WCAG-AA on the page/card surfaces.
  - `@qeetrix/ui`: maps `--color-success`/`-warning`/`-info`(+`-foreground`) in `@theme`, and refactors ~15 components (Alert, Badge, Banner, Toast, StatusPill, Meter, PasswordStrengthMeter, Stat, FileUpload, CopyableSecret, and the PricingTier block) off hardcoded `emerald`/`amber`/`rose`/`sky` onto the semantic utilities (`text-success`, `bg-warning/10`, …). Status colors now theme consistently and have proper dark-mode parity. Decorative gold (Rating stars) and syntax highlighting (CodeBlock/JSONTree) intentionally keep palette colors.

  No API changes; status elements look equivalent but are now tokenized.

### Patch Changes

- c565778: Fix **Rating** accessibility: drop the `aria-readonly` / `aria-disabled` attributes from the read-only/disabled variant, which uses `role="img"` where those attributes aren't permitted (flagged by axe). The non-interactive state is already conveyed by the role, so no behaviour changes.
- 5882cdb: **Skeleton** now uses a moving shimmer sweep (a highlight gradient over the muted base) instead of a flat pulse, for a more premium loading feel. The animation is defined on `[data-slot="skeleton"]` and is disabled under `prefers-reduced-motion`. Applies anywhere `Skeleton` is used (DataState, sidebar menu skeletons, etc.).
- Updated dependencies [5882cdb]
- Updated dependencies [c565778]
- Updated dependencies [5882cdb]
  - @qeetrix/tokens@0.1.0

## 0.2.0

### Minor Changes

- 62ef506: Add **AspectRatio** — constrains content to a fixed width-to-height ratio via the native CSS `aspect-ratio` property. Pass a `ratio` (e.g. `16 / 9`, `4 / 3`, `1`); the immediate child fills the box with `className="size-full object-cover"`. Useful for media thumbnails, avatars, and embeds.

  No breaking changes: existing components, exports, tokens, and dependencies are untouched.

- fc3bf47: Add Batch 1 overlay & feedback components (additive, Base-UI-first):

  - **Dialog** — generic modal (`Dialog`, `DialogTrigger`, `DialogClose`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`), complementing the existing action-confirm `AlertDialog`.
  - **Toast / Toaster** — app-wide notifications. Mount `<Toaster />` once at the app root and call `toast()` / `toast.success|warning|error|info`, plus `toast.promise` and `toast.dismiss`, from anywhere.
  - **Alert** — inline callout with `default | info | success | warning | danger` intents (`Alert`, `AlertTitle`, `AlertDescription`).
  - **Drawer** — bottom-anchored sheet preset with a grab handle (`Drawer`, `DrawerTrigger`, `DrawerClose`, `DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription`), built on the existing `Sheet`.

  No breaking changes: existing components, exports, tokens, and dependencies are untouched.

- fc3bf47: Add Batch 2 data & dashboard components (additive):

  - **DataTable** — TanStack-Table-powered table over the existing `Table` primitives, with sorting, global search, pagination, column visibility, and optional row selection + bulk-action strip wired up out of the box. Re-exports `ColumnDef`, `Row`, and `createColumnHelper` so consumers don't need `@tanstack/react-table` directly.
  - **Stat** — KPI/metric tile for dashboards (label, large value, trend-coloured delta, optional icon + hint), styled to match `Card`.
  - **DescriptionList** (`DescriptionList` / `DescriptionTerm` / `DescriptionDetails`) — responsive key-value detail view for entity & settings pages.
  - **EmptyState** — icon + title + description + action zero-state; pairs with `DataState` (pass as its `empty` slot) or drops straight into a `Card`.
  - **Spinner** — inline loading indicator with `sm | default | lg | xl` sizes, complementing `Skeleton`.

  Adds `@tanstack/react-table@^8.21.3` as a dependency of `@qeetrix/ui` (scoped to `DataTable`). No breaking changes to existing components, exports, or tokens.

- fc3bf47: Add Batch 3 forms & inputs components (additive, Base-UI-first):

  - **Combobox** — single-select autocomplete (type to filter, keyboard + clear), string-based `items`/`value` API over Base UI Combobox.
  - **MultiSelect** — multi-select / tag input with removable chips, sharing the Combobox primitive (`value: string[]`).
  - **NumberField** — numeric input with stepper buttons, scrubbing, and locale/`Intl` formatting (currency, percent); forwards all Base UI `NumberField.Root` props.
  - **InputGroup** (`InputGroup` / `InputGroupAddon` / `InputGroupInput`) — leading/trailing addons for currency symbols, units, and fixed prefixes.
  - **Form** + **FormActions** — deliberately **form-library-agnostic** wrapper: a styled `<form>` with vertical rhythm plus a footer action row, composing with the existing `Field` family for validation display. No form-lib dependency — works with TanStack Form, React Hook Form, or plain HTML.

  No new runtime dependencies (all Base UI, already a dep). No breaking changes to existing components, exports, or tokens.

- fc3bf47: Add Batch 4 date & time components (additive):

  - **Calendar** — the canonical shadcn Calendar component (built on react-day-picker v9), restyled to the qeetrix design tokens; supports all modes (`single` / `multiple` / `range`) and dropdown caption layouts. Also exports `CalendarDayButton`.
  - **DatePicker** — single-date picker: an outline trigger button opening a `Calendar` in a `Popover`; controlled or uncontrolled, formats via `Intl.DateTimeFormat`.
  - **DateRangePicker** — two-month range picker for log windows / billing periods; re-exports the `DateRange` type.

  Adds `react-day-picker@^9.9.0` (resolved 9.14.0) as a dependency of `@qeetrix/ui`, scoped to these components. No breaking changes to existing components, exports, or tokens.

- fc3bf47: Add Batch 5 navigation & structure components (additive, Base-UI-first):

  - **NavigationMenu** — top-nav / mega-menu with a morphing floating viewport (`navigationMenuTriggerStyle()` for matching links).
  - **Menubar** — desktop-style app menu bar (File / Edit / View), with items, checkbox/radio items, submenus, shortcuts.
  - **ContextMenu** — right-click menus with the full menu surface (items, checkbox/radio, submenus, destructive variant), mirroring DropdownMenu styling.
  - **HoverCard** — hover/focus preview card (user & entity previews) over Base UI Preview Card.
  - **Toolbar** — action bar for tables/editors (`Toolbar`, `ToolbarButton`, `ToolbarLink`, `ToolbarGroup`, `ToolbarSeparator`).
  - **Kbd** + **KbdGroup** — keyboard-shortcut hint glyphs.
  - **PageHeader** — presentational title block (breadcrumb eyebrow + title + description + actions); promoted from qeetid-admin and made router-agnostic.
  - **AppShell** (`AppShell` / `AppShellMain` / `AppShellHeader` / `AppShellContent`) — minimal full-height app layout frame that pairs with the Sidebar system and PageHeader.

  No new runtime dependencies (all Base UI / hand-built). No breaking changes to existing components, exports, or tokens.

- fc3bf47: Add Batch 6 advanced components (additive) — completing the enterprise expansion:

  - **Timeline** — vertical event/audit history (`Timeline`, `TimelineItem`, `TimelineIndicator`, `TimelineContent`, `TimelineTitle`, `TimelineTime`, `TimelineDescription`).
  - **Stepper** — horizontal multi-step flow indicator (onboarding/checkout) driven by `steps` + `activeStep`.
  - **TreeView** — data-driven hierarchical disclosure tree (file trees, nested scopes) with per-node expand state.
  - **Banner** — full-width, intent-coloured, optionally dismissible announcement bar.
  - **Meter** — quota/usage gauge over Base UI Meter (label + formatted value + `intent` colours).
  - **Resizable** (`ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle`) — split layouts via react-resizable-panels, horizontal & vertical.

  Adds `react-resizable-panels@^4.11.2` as a dependency of `@qeetrix/ui`, scoped to Resizable. No breaking changes to existing components, exports, or tokens.

- 62ef506: Add a **blocks layer** — composed, page-level patterns under the new `@qeetrix/ui/blocks` subpath, so product teams stop rebuilding these by hand:

  - **Auth** — `AuthShell` plus `LoginForm`, `SignupForm`, `ForgotPasswordForm`, and `OtpForm` (composing `Field`/`Form`, `OTPInput`, `PasswordStrengthMeter`); library-agnostic, with logo/forgot/social slots.
  - **DashboardShell** — the reference app layout (`Sidebar` slot + sticky header + scrollable content) over the `AppShell` primitives.
  - **SettingsLayout** / **SettingsSection** — stacked-section settings page (profile / security / danger zone) with header, body, and footer slots.
  - **OnboardingWizard** — multi-step flow over `Stepper` with Back/Next→Finish navigation, controlled or uncontrolled.
  - **PricingTable** / **PricingTier** — marketing pricing grid with featured highlight, badge, and included/excluded feature lists.
  - **PageState** + presets **NotFound** / **ServerError** / **Maintenance** — full-page empty/error/404/maintenance screens.

  Import from `@qeetrix/ui/blocks`. Additive; no new dependencies and no breaking changes.

- 62ef506: Add **Carousel** — an accessible slider built on Embla (`embla-carousel-react`). Compose `Carousel` with `CarouselContent`, `CarouselItem`, and `CarouselPrevious` / `CarouselNext`; arrow keys move between slides and the region is announced as a carousel. Supports horizontal/vertical `orientation`, Embla `opts` (loop, align, multi-per-view via `basis-*`), a `setApi` escape hatch for dots/progress, and autoplay via `plugins={[Autoplay()]}`. `useCarousel` and the `CarouselApi` type are exported.

  Adds dependency: `embla-carousel-react`. No breaking changes.

- 62ef506: Add **chart presets** + **Sparkline** on top of the existing `ChartContainer` (Recharts), so dashboards don't hand-assemble charts:

  - **AreaChart**, **BarChart**, **LineChart** — cartesian presets taking `data`, a `ChartConfig`, a `categoryKey`, and one or more `dataKeys`. Series colours resolve from `config[key].color`; toggles for grid, axes, legend, tooltip, and `stacked`.
  - **DonutChart** (set `innerRadius={0}` for a pie) and **RadialChart** (gauge-style) — take `dataKey` + `nameKey`, colouring slices from `config`.
  - **Sparkline** — a tiny axis-less inline trend (line or area) for KPI tiles (`Stat`) and table cells; colour follows `currentColor` via a `text-*` class. Accepts `number[]` or `{ value }[]`.

  No new dependencies (reuses Recharts). No breaking changes.

- 62ef506: Upgrade **DataTable** with enterprise depth (all opt-in, fully backward-compatible — existing props and behaviour are unchanged):

  - **Column resizing** (`enableColumnResizing`) — drag column edges; widths persist via `persistKey`.
  - **Column pinning** (`enablePinning`) — pin columns left/right (sticky) from each header's menu.
  - **Row virtualization** (`enableVirtualization` + `maxHeight`) — render only visible rows for large datasets (adds `@tanstack/react-virtual`); disables pagination.
  - **Expandable rows** (`enableExpanding` + `renderSubComponent`, `getRowCanExpand`) — inline detail panels.
  - **Faceted filters** (`facetedFilters`) — toolbar multi-select filters with live counts (columns use `filterFn: "arrIncludesSome"`).
  - **CSV export** (`enableExport`, `exportFilename`) — exports the currently filtered rows.
  - **Density toggle** (`enableDensity`, `defaultDensity`) — comfortable/compact rows.
  - **Sticky header** — automatic whenever `maxHeight` or virtualization is set.
  - **State persistence** (`persistKey`) — sorting / visibility / sizing / pinning / density saved to `localStorage`.

  Adds dependency: `@tanstack/react-virtual`.

- 62ef506: Add **File Upload** primitives — a composable, framework-agnostic upload pattern that generalizes the existing `LogoUploader`:

  - **Dropzone** — drag-and-drop (or click) picker with `accept` / `maxSize` / `maxFiles` validation, keyboard support, and an `onDrop(accepted, rejected)` callback. Inner content is overridable via a render-prop.
  - **FileList** / **FileUploadItem** — render the selected files with image thumbnails, size, per-file progress (`Progress`), success/error status, and a remove action.
  - Helpers **formatBytes** and **isFileAccepted** are exported for custom layouts.

  The parent owns the file array and upload logic, so it drops into any form library. No breaking changes.

- 62ef506: Add **Rating** — a star (or custom icon) rating control. Interactive when `onChange` is supplied (click to set, focus + arrow/Home/End keys to adjust, with `slider` semantics), or a read-only `img` for aggregate display. Supports `max`, half-icon precision via `allowHalf`, three `size`s, and a swappable `icon` (e.g. `HeartIcon`).

  No breaking changes.

- 62ef506: Add **TagInput** — a free-form chips input. Type and press Enter (or comma) to add a tag, Backspace on an empty field to remove the last one, and click a chip's × to remove it. Controlled via `value: string[]` / `onChange`, with `maxTags`, case-insensitive `dedupe`, and a `validate` hook for normalising/rejecting tags (e.g. emails). For a fixed option set, keep using `MultiSelect`.

  No breaking changes.

- 62ef506: Add **TimePicker** and **DateTimePicker** (no new dependencies):

  - **TimePicker** — time-of-day picker built from `Select` columns (hours / minutes / optional seconds / AM-PM). 12h or 24h display via `hourCycle`, configurable `minuteStep`, and `withSeconds`. The value is always emitted as a canonical 24h `"HH:mm"` (or `"HH:mm:ss"`) string. `parseTime` is exported for convenience.
  - **DateTimePicker** — a `Calendar` with a `TimePicker` footer in a Popover, emitting a single `Date`. Mirrors `DatePicker`'s controlled/uncontrolled API; selecting a day preserves the chosen time and vice-versa.

  No breaking changes.

- 62ef506: Add **Typography**, **Prose**, and **RichTextEditor**:

  - **Typography** — consistent styling for discrete copy via a `variant` prop (`h1`–`h4`, `p`, `lead`, `large`, `small`, `muted`, `blockquote`, `inlineCode`, `list`) with a sensible default element per variant and an `as` override.
  - **Prose** — self-contained typographic styles for rendered HTML/markdown (MDX, editor output). No `@tailwindcss/typography` dependency; the reusable `proseClassName` is exported.
  - **RichTextEditor** — WYSIWYG editor built on Tiptap (StarterKit) with a `Toggle`-based toolbar (bold/italic/strike/code, H1–H3, lists, quote, undo/redo). Outputs HTML (`onChange`) and ProseMirror JSON (`onChangeJSON`), styled with `proseClassName`, controlled or uncontrolled, and SSR-safe.

  Adds dependencies: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`. No breaking changes.

## 0.1.0

### Minor Changes

- Add eight Base UI-backed primitives, built to match existing conventions (data-slot, cn(), token-driven classes, a11y-clean) with Storybook stories:
  - **Checkbox** + **CheckboxGroup** — wired to the `data-slot=checkbox-group`/`[role=checkbox]` hooks the Field system already anticipated; supports `indeterminate`.
  - **RadioGroup** + **Radio**.
  - **Tabs** (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`).
  - **Accordion** (`Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`) with single/`multiple` modes and animated panel height.
  - **Progress** — determinate and indeterminate.
  - **Toggle** + **ToggleGroup** (CVA `variant`/`size`; group uses `role="toolbar"`).
  - **Popover** (`Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverTitle`, `PopoverDescription`, `PopoverClose`).
  - **ScrollArea** + **ScrollBar** — styled custom scrollbars, vertical + horizontal.

### Patch Changes

- Fix accessibility violations in three primitives:
  - **Slider** — forward `aria-label`/`aria-labelledby` to the thumb's hidden range `<input>` (Base UI doesn't propagate them from the root), so a labelled `<Slider aria-label="…">` no longer trips axe's `label` rule.
  - **CommandPalette** — wrap the `role="option"` result buttons in a `role="listbox"` container so they have their ARIA-required parent (`aria-required-parent`).
  - **LogoUploader** — give the visually-hidden file `<input>` an `aria-label` so it's no longer an unlabelled form control.
