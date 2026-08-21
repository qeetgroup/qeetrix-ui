import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A minimal full-height application layout: a flex container for an optional
 * sidebar slot beside a main column. Compose with the Sidebar system and
 * PageHeader — `AppShell` provides the frame, not the navigation.
 */
function AppShell({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="app-shell" className={cn("flex min-h-svh w-full", className)} {...props} />
  );
}

/** The main column beside the sidebar. */
function AppShellMain({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-shell-main"
      className={cn("flex min-w-0 flex-1 flex-col", className)}
      {...props}
    />
  );
}

/** Sticky top bar inside the main column (global actions, breadcrumb, search). */
function AppShellHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="app-shell-header"
      className={cn(
        "sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60",
        className,
      )}
      {...props}
    />
  );
}

/** Scrollable content region. */
function AppShellContent({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="app-shell-content"
      className={cn("flex-1 overflow-auto p-4 md:p-6", className)}
      {...props}
    />
  );
}

export { AppShell, AppShellContent, AppShellHeader, AppShellMain };
