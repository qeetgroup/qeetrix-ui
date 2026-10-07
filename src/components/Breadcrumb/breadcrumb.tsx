"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ChevronRightIcon } from "@qeetrix/icons/icons/chevron-right";
import { EllipsisIcon } from "@qeetrix/icons/icons/ellipsis";
import type * as React from "react";
import { breadcrumbMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/**
 * The breadcrumb landmark. Its accessible name comes from the message catalogue, so a
 * `MessagesProvider` translates it; an explicit `aria-label` still wins, because `props`
 * spreads last. These parts take no `messages` prop of their own — they are unstyled
 * wrappers over one element each, and a prop per part would be more surface than the two
 * strings involved.
 */
function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  const messages = useMessages("breadcrumb", breadcrumbMessages);
  return (
    <nav aria-label={messages.label} data-slot="breadcrumb" className={cn(className)} {...props} />
  );
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      // `min-w-0` lets an item shrink, so a single-line trail (`BreadcrumbList
      // className="flex-nowrap"`) truncates its labels instead of overflowing.
      className={cn("inline-flex min-w-0 max-w-full items-center gap-1", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({ className, render, ...props }: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          "min-w-0 truncate rounded-sm underline-offset-4 transition-colors duration-fast ease-standard hover:text-foreground hover:underline focus-visible:focus-ring",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "breadcrumb-link",
    },
  });
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn("min-w-0 truncate font-medium text-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("shrink-0 [&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRightIcon aria-hidden className="rtl:rotate-180" />}
    </li>
  );
}

/**
 * Stands in for collapsed middle crumbs. Its text alternative ("More") is real, not hidden: the
 * span used to be `aria-hidden`, which also hid that text — so a menu trigger wrapped around the
 * ellipsis, the usual way to reveal the collapsed crumbs, had no accessible name at all.
 */
function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  const messages = useMessages("breadcrumb", breadcrumbMessages);
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      className={cn("flex size-5 shrink-0 items-center justify-center [&>svg]:size-4", className)}
      {...props}
    >
      <EllipsisIcon aria-hidden />
      <span className="sr-only">{messages.more}</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
