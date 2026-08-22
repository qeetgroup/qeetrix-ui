"use client";

import { XIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/actions/button";
import { Separator } from "@/components/utility/separator";
import { cn } from "@/lib/utils";

interface ActionBarProps {
  /** Controlled visibility — set to true when rows are selected. */
  open: boolean;
  /**
   * Accessible name for the toolbar. Defaults to "Selection actions"; override it to match the
   * product's wording or language — component copy is never localized in the library.
   */
  "aria-label"?: string;
  /** Number of currently selected items; renders the selection pill when provided together with onClearSelection. */
  selectionCount?: number;
  /** Callback fired when the user clicks the clear-selection (×) button. */
  onClearSelection?: () => void;
  children: ReactNode;
  className?: string;
}

type ActionBarItemProps = Omit<ComponentProps<typeof Button>, "size" | "variant"> & {
  variant?: "default" | "destructive" | "outline" | "ghost";
};

function ActionBarSelection({ count, onClear }: { count: number; onClear?: () => void }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-sm font-medium tabular-nums text-foreground">{count} selected</span>
      {onClear && (
        <Button variant="ghost" size="icon-sm" aria-label="Clear selection" onClick={onClear}>
          <XIcon className="size-3.5" aria-hidden />
        </Button>
      )}
    </div>
  );
}

function ActionBarSeparator() {
  return <Separator orientation="vertical" className="mx-1 h-4" data-slot="action-bar-separator" />;
}

function ActionBarItem({ variant = "ghost", ...props }: ActionBarItemProps) {
  return <Button data-slot="action-bar-item" size="sm" variant={variant} {...props} />;
}

function ActionBar({
  open,
  selectionCount,
  onClearSelection,
  children,
  className,
  "aria-label": ariaLabel = "Selection actions",
}: ActionBarProps) {
  return (
    <div
      data-slot="action-bar"
      role="toolbar"
      aria-label={ariaLabel}
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
        "flex items-center gap-1 rounded-full border bg-background px-3 py-1.5 shadow-lg",
        "transition-all duration-200 ease-in-out",
        open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none",
        className,
      )}
    >
      {selectionCount !== undefined && onClearSelection !== undefined && (
        <>
          <ActionBarSelection count={selectionCount} onClear={onClearSelection} />
          <ActionBarSeparator />
        </>
      )}
      {children}
    </div>
  );
}

export type { ActionBarItemProps, ActionBarProps };
export { ActionBar, ActionBarItem, ActionBarSelection, ActionBarSeparator };
