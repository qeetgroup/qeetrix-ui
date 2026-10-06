import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A minimal full-height application frame: a flex row for an optional sidebar beside a main
 * column. `AppShell` provides the frame, not the navigation — compose it with the Sidebar
 * system and `PageHeader`, and it carries no product-specific chrome.
 *
 * Two arrangements cover the enterprise layouts:
 *
 * - **Sidebar beside the page.** `SidebarProvider` already renders the row, so use
 *   `SidebarInset` as the column and `AppShellHeader` / `AppShellContent` inside it. The inset is
 *   the `<main>` landmark there, so give the content region a non-landmark element:
 *   `<AppShellContent render={<div />}>`.
 * - **Header above everything.** `AppShell` → `AppShellMain` → `AppShellHeader` +
 *   `AppShellContent`, with any sidebar as the first child of `AppShell`.
 *
 * The header's height is the `--qx-component-app-shell-header-height` token, which follows
 * density; pin page-level sticky regions (a filter bar, a table toolbar) beneath it with
 * `top-(--qx-component-app-shell-header-height)`.
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

/**
 * Sticky top bar inside the main column (global actions, breadcrumb, search). Sits on the
 * sticky layer of the z-index ladder — above page content and its own sticky regions, below
 * the fixed sidebar and every overlay — and translucent over scrolled content where the
 * browser can blur it. Pass `className="static"` for a header that scrolls away.
 */
function AppShellHeader({ className, render, ...props }: useRender.ComponentProps<"header">) {
  return useRender({
    defaultTagName: "header",
    props: mergeProps<"header">(
      {
        className: cn(
          "sticky top-0 z-(--qx-z-sticky) flex h-(--qx-component-app-shell-header-height) min-w-0 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/60 md:px-4",
          className,
        ),
      },
      props,
    ),
    render,
    state: { slot: "app-shell-header" },
  });
}

/**
 * The page's content region, a `<main>` landmark by default. Inside `SidebarInset` — which is
 * already `<main>` — render it as a plain element (`render={<div />}`) so the page keeps
 * exactly one main landmark.
 */
function AppShellContent({ className, render, ...props }: useRender.ComponentProps<"main">) {
  return useRender({
    defaultTagName: "main",
    props: mergeProps<"main">(
      {
        className: cn("min-w-0 flex-1 overflow-auto p-4 md:p-6", className),
      },
      props,
    ),
    render,
    state: { slot: "app-shell-content" },
  });
}

export { AppShell, AppShellContent, AppShellHeader, AppShellMain };
