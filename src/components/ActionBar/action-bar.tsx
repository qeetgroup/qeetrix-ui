"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { Toolbar as ToolbarPrimitive } from "@base-ui/react/toolbar";
import { XIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/Button/button";
import type { ActionBarMessages, MessagesFor } from "@/lib/messages";
import { actionBarMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/**
 * Inside an `ActionBar`, items are parts of its Base UI toolbar (one tab stop, arrow keys move
 * between them). Outside one — `ActionBarSelection` placed in a custom bar, say — they fall back
 * to plain buttons rather than throwing for a missing toolbar.
 */
const ActionBarContext = React.createContext(false);

interface ActionBarProps {
  /** Controlled visibility — set to true when rows are selected. */
  open: boolean;
  /**
   * Accessible name for the toolbar. Defaults to "Selection actions"; equivalent to
   * `messages={{ label }}` and wins over it.
   */
  "aria-label"?: string;
  /** Number of currently selected items; renders the selection pill when provided together with onClearSelection. */
  selectionCount?: number;
  /** Callback fired when the user clicks the clear-selection (×) button. */
  onClearSelection?: () => void;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"actionBar">;
  children: React.ReactNode;
  className?: string;
}

type ActionBarItemProps = Omit<React.ComponentProps<typeof Button>, "size" | "variant"> & {
  variant?: "default" | "destructive" | "outline" | "ghost";
  /** `sm` for a labelled action (the default); `icon-sm` for an icon-only one with an `aria-label`. */
  size?: "sm" | "icon-sm";
};

function ActionBarSelection({
  count,
  onClear,
  messages: messageOverrides,
}: {
  count: number;
  onClear?: () => void;
  /** Resolved by the parent when rendered from `ActionBar`; resolved here when used alone. */
  messages?: MessagesFor<"actionBar"> | ActionBarMessages;
}) {
  const messages = useMessages("actionBar", actionBarMessages, messageOverrides);
  return (
    <div data-slot="action-bar-selection" className="flex shrink-0 items-center gap-1 ps-2">
      <span className="text-sm font-medium whitespace-nowrap tabular-nums text-foreground">
        {messages.selectionCount(count)}
      </span>
      {onClear && (
        <ActionBarItem
          data-slot="action-bar-clear"
          variant="ghost"
          size="icon-sm"
          aria-label={messages.clearSelection}
          className="text-muted-foreground hover:text-foreground"
          onClick={onClear}
        >
          <XIcon aria-hidden />
        </ActionBarItem>
      )}
    </div>
  );
}

function ActionBarSeparator() {
  const inBar = React.useContext(ActionBarContext);
  const className = "mx-1 my-1.5 w-px shrink-0 self-stretch bg-border";
  return inBar ? (
    <ToolbarPrimitive.Separator data-slot="action-bar-separator" className={className} />
  ) : (
    <SeparatorPrimitive
      orientation="vertical"
      data-slot="action-bar-separator"
      className={className}
    />
  );
}

function ActionBarItem({ variant = "ghost", size = "sm", ...props }: ActionBarItemProps) {
  const inBar = React.useContext(ActionBarContext);
  if (!inBar) {
    return <Button data-slot="action-bar-item" size={size} variant={variant} {...props} />;
  }
  return (
    <ToolbarPrimitive.Button
      data-slot="action-bar-item"
      render={<Button size={size} variant={variant} />}
      {...(props as ToolbarPrimitive.Button.Props)}
    />
  );
}

/**
 * The bulk-selection bar: floats above the page while rows are selected.
 *
 * A real toolbar — one tab stop, the arrow keys move between actions and wrap (mirrored under
 * RTL), disabled actions stay discoverable. It is an overlay surface with the popover elevation,
 * clears the iOS home indicator, and on a phone or a narrow panel it scrolls sideways instead of
 * running off-screen. Closed, it is `inert` and hidden from assistive technology; it arrives on
 * the enter curve and leaves on the exit one, and the document-wide reduced-motion rule
 * collapses both.
 */
function ActionBar({
  open,
  selectionCount,
  onClearSelection,
  messages: messageOverrides,
  children,
  className,
  "aria-label": ariaLabel,
}: ActionBarProps) {
  const messages = useMessages("actionBar", actionBarMessages, messageOverrides);
  return (
    <ActionBarContext.Provider value={true}>
      <ToolbarPrimitive.Root
        data-slot="action-bar"
        data-open={open || undefined}
        aria-label={ariaLabel ?? messages.label}
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed bottom-[calc(--spacing(6)+env(safe-area-inset-bottom))] left-1/2 z-(--qx-z-fixed) -translate-x-1/2",
          "flex max-w-[calc(100%-(--spacing(8)))] items-center gap-1 overflow-x-auto rounded-(--qx-corner-overlay) border border-border bg-surface-overlay p-1.5 text-foreground shadow-popover scrollbar-thin",
          "transition-[opacity,translate] duration-normal",
          open
            ? "translate-y-0 opacity-100 ease-enter"
            : "pointer-events-none translate-y-2 opacity-0 ease-exit",
          className,
        )}
      >
        {selectionCount !== undefined && onClearSelection !== undefined && (
          <>
            <ActionBarSelection
              count={selectionCount}
              onClear={onClearSelection}
              messages={messages}
            />
            <ActionBarSeparator />
          </>
        )}
        {children}
      </ToolbarPrimitive.Root>
    </ActionBarContext.Provider>
  );
}

export type { ActionBarItemProps, ActionBarProps };
export { ActionBar, ActionBarItem, ActionBarSelection, ActionBarSeparator };
