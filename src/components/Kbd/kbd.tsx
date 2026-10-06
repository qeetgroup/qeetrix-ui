import type * as React from "react";

import { cn } from "@/lib/utils";

interface KbdProps extends React.ComponentProps<"kbd"> {
  /**
   * Spoken name for a symbol key — `label="Command"` for ⌘, `"Enter"` for ↵, `"Up arrow"` for ↑.
   * Rendered for assistive technology only, and the glyph is hidden from it, because a screen
   * reader otherwise announces ⌘ as "place of interest sign" and ↵ as nothing at all. Omit it
   * for keys that are already words (`Esc`, `K`, `Shift`).
   */
  label?: string;
}

/**
 * A keyboard key cap — one key of a shortcut hint. Combine keys with `KbdGroup` (⌘ + K).
 *
 * Set in Qeet UI at the micro role, on a translucent cap derived from its own text colour: the
 * cap reads on any surface in both themes (canvas, card, menu, command palette, button) and
 * follows the text if a consumer recolours it. Static content — no states, no motion.
 *
 * The label size is the `kbd.font-size` component token (the micro role by default), so a
 * product can retune key hints without touching every call site.
 */
function Kbd({ className, label, children, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center gap-0.5 px-1 align-middle",
        "rounded-(--qx-component-kbd-corner) border border-(--qx-component-kbd-border) bg-(--qx-component-kbd-background) shadow-(--qx-component-kbd-elevation)",
        "font-ui text-(length:--qx-component-kbd-font-size) leading-none font-medium text-(--qx-component-kbd-foreground) tabular-nums whitespace-nowrap select-none",
        "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    >
      {label ? (
        <>
          <span aria-hidden="true">{children}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        children
      )}
    </kbd>
  );
}

/**
 * A key combination. Renders an outer `<kbd>` around the individual keys, which is how HTML
 * represents "press these together"; the keys themselves stay one `Kbd` each.
 */
function KbdGroup({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn(
        "inline-flex items-center gap-1 align-middle font-ui text-(length:--qx-component-kbd-font-size) font-medium whitespace-nowrap text-(--qx-component-kbd-foreground)",
        className,
      )}
      {...props}
    />
  );
}

export type { KbdProps };
export { Kbd, KbdGroup };
