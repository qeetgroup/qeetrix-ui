/**
 * The Qeet field recipe — one set of class strings for every bordered text-entry surface.
 *
 * Internal on purpose (src/internal, the non-public layer — scripts/build/subpath-shims.mjs only
 * publishes family modules named in scripts/config/component-map.json): it adds no public API, but
 * every field-shaped component in the library composes it rather than restating it. Pickers
 * align to the same states by importing it: a text input that *is* the field (Combobox input)
 * takes `fieldSurface`, a container wrapping one (Combobox chips) takes `fieldGroupSurface`, and
 * a button trigger (Select, DatePicker) takes `fieldTrigger`.
 *
 *   state        how it reads                                         token
 *   ───────────  ───────────────────────────────────────────────────  ────────────────────────────
 *   rest         1px ≥3:1 boundary on the writing surface             input.border · input.background
 *   hover        boundary steps to control-hover (editable only)      input.border-hover
 *   focus        boundary turns --ring and a 1px outline thickens     focus-ring-field (foundation)
 *                it to 2px
 *   warning      boundary in the warning feedback colour              input.border-warning
 *   success      boundary in the success feedback colour              input.border-success
 *   invalid      boundary + focus outline in the error colour         input.border-invalid
 *   read-only    dashed boundary, no writing surface, full-contrast   input.background-readonly
 *                value
 *   disabled     sunken surface (light) / no surface (dark), faded    input.background-disabled ·
 *                                                                     opacity-disabled
 *
 * Warning and success come from the enclosing `Field` (`data-status`, set when it contains a
 * `FieldWarning` / `FieldSuccess`); invalid comes from `aria-invalid` on the control, so what a
 * screen reader hears and what the border shows cannot disagree.
 *
 * Precedence is carried by two private custom properties rather than by selector order:
 * `--field-edge` is the resting/hover boundary and `--field-status` the status boundary, and the
 * border reads `var(--field-status, var(--field-edge))`. Hover only ever moves the edge, so it can
 * never repaint an invalid or warning boundary grey, whatever the specificity of either rule.
 * `--field-status` is reset on every field so a status never leaks into a nested one.
 */

const transition =
  "transition-[color,background-color,border-color,outline-color] duration-fast ease-standard";

const statusEdges = [
  "[--field-edge:var(--qx-component-input-border)] [--field-status:initial]",
  "[border-color:var(--field-status,var(--field-edge))]",
  "group-data-[status=warning]/field:[--field-status:var(--qx-component-input-border-warning)]",
  "group-data-[status=success]/field:[--field-status:var(--qx-component-input-border-success)]",
].join(" ");

/**
 * A native `<input>` / `<textarea>` that is itself the field: Input, Textarea, the OTP digit
 * boxes, the Editable input. Geometry (height, padding) is left to the component.
 */
const fieldSurface = [
  "w-full min-w-0 rounded-(--qx-component-input-corner) border bg-(--qx-component-input-background) text-(--qx-component-input-foreground) outline-none",
  transition,
  statusEdges,
  "placeholder:text-(--qx-component-input-placeholder)",
  // `:read-only` matches disabled controls too, so this is "editable and hovered".
  "not-read-only:hover:[--field-edge:var(--qx-component-input-border-hover)]",
  "focus-visible:focus-ring-field",
  "aria-invalid:[--field-status:var(--qx-component-input-border-invalid)]",
  "aria-invalid:focus-visible:[border-color:var(--qx-component-input-border-invalid)] aria-invalid:focus-visible:outline-(--qx-component-input-border-invalid)",
  "read-only:not-disabled:border-dashed read-only:not-disabled:bg-(--qx-component-input-background-readonly)",
  "disabled:cursor-not-allowed disabled:bg-(--qx-component-input-background-disabled) disabled:opacity-disabled",
].join(" ");

/**
 * A container that wraps a bare native input and owns the field chrome on its behalf:
 * InputGroup, the NumberField group, TagInput, CurrencyInput. States are read from the inner
 * `input`/`textarea` (`:has()`), so buttons inside the group — a stepper at its limit, a chip's
 * remove button — never fade or ring the whole field.
 */
const fieldGroupSurface = [
  "w-full min-w-0 rounded-(--qx-component-input-corner) border bg-(--qx-component-input-background) text-(--qx-component-input-foreground)",
  transition,
  statusEdges,
  "hover:has-[:is(input,textarea):read-write]:[--field-edge:var(--qx-component-input-border-hover)]",
  "has-[:is(input,textarea):focus-visible]:focus-ring-field",
  "aria-invalid:[--field-status:var(--qx-component-input-border-invalid)] has-[[aria-invalid=true]]:[--field-status:var(--qx-component-input-border-invalid)]",
  "has-[[aria-invalid=true]:focus-visible]:[border-color:var(--qx-component-input-border-invalid)] has-[[aria-invalid=true]:focus-visible]:outline-(--qx-component-input-border-invalid)",
  "has-[:is(input,textarea)[readonly]]:border-dashed has-[:is(input,textarea)[readonly]]:bg-(--qx-component-input-background-readonly)",
  "has-[:is(input,textarea):disabled]:cursor-not-allowed has-[:is(input,textarea):disabled]:bg-(--qx-component-input-background-disabled) has-[:is(input,textarea):disabled]:opacity-disabled",
].join(" ");

/**
 * A `<button>` (or other non-text element) that opens a picker but looks like a field: Select,
 * Combobox and DatePicker triggers. It cannot use {@link fieldSurface}: `:read-only` matches every
 * button, which would switch off hover and draw the read-only dashes permanently. Read-only is
 * read from `data-readonly` / `aria-readonly` instead, and an open popup holds the hover edge.
 */
const fieldTrigger = [
  "w-full min-w-0 rounded-(--qx-component-input-corner) border bg-(--qx-component-input-background) text-(--qx-component-input-foreground) outline-none",
  transition,
  statusEdges,
  "data-placeholder:text-(--qx-component-input-placeholder)",
  "enabled:not-data-readonly:not-aria-readonly:hover:[--field-edge:var(--qx-component-input-border-hover)] data-popup-open:[--field-edge:var(--qx-component-input-border-hover)]",
  "focus-visible:focus-ring-field",
  "aria-invalid:[--field-status:var(--qx-component-input-border-invalid)]",
  "aria-invalid:focus-visible:[border-color:var(--qx-component-input-border-invalid)] aria-invalid:focus-visible:outline-(--qx-component-input-border-invalid)",
  "data-readonly:border-dashed data-readonly:bg-(--qx-component-input-background-readonly) aria-readonly:border-dashed aria-readonly:bg-(--qx-component-input-background-readonly)",
  "disabled:cursor-not-allowed disabled:bg-(--qx-component-input-background-disabled) disabled:opacity-disabled data-disabled:cursor-not-allowed data-disabled:bg-(--qx-component-input-background-disabled) data-disabled:opacity-disabled",
].join(" ");

/** The bare input inside a {@link fieldGroupSurface}: no chrome of its own. */
const fieldGroupInput =
  "min-w-0 flex-1 bg-transparent text-base text-inherit outline-none placeholder:text-(--qx-component-input-placeholder) disabled:cursor-not-allowed md:text-sm";

/**
 * A compact icon action that sits inside a field — reveal password, clear, copy, a stepper.
 * Sized from the field height so it tracks density, never below the 24px target minimum, and
 * focus is drawn inset so it stays inside the field it belongs to.
 */
const fieldAction =
  "inline-flex size-[max(1.5rem,calc(var(--qx-component-input-height)-0.5rem))] shrink-0 items-center justify-center rounded-[max(0px,calc(var(--qx-component-input-corner)-2px))] text-muted-foreground outline-none transition-[color,background-color] duration-fast ease-standard hover:bg-surface-interactive-hover hover:text-foreground focus-visible:focus-ring-inset disabled:pointer-events-none disabled:opacity-disabled [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

/** Field text sizing: 16px under `md` so iOS does not zoom on focus, 14px from `md` up. */
const fieldText = "text-base md:text-sm";

export { fieldAction, fieldGroupInput, fieldGroupSurface, fieldSurface, fieldText, fieldTrigger };
