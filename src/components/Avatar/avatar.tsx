"use client";

import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { UserRoundIcon } from "@qeetrix/icons/icons/user-round";
import * as React from "react";

import { cn } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "default" | "lg" | "xl";
type AvatarShape = "circle" | "square";

/** What the parts read from their `Avatar`: the person's name, for alt text and initials. */
const AvatarContext = React.createContext<{ name?: string }>({});

/**
 * Up to two initials from a display name: the first letter of the first and last words.
 *
 * Grapheme-safe for the common cases (`Array.from` keeps a surrogate pair together), upper-cased
 * for the locale, and a single word yields a single initial — "Priya" is "P", not "PR". Scripts
 * without case or word spaces (CJK) yield their first character, which is the convention there.
 */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = Array.from(words[0])[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase();
}

/**
 * A person's picture, initials or a neutral icon.
 *
 * Pass `name` and the parts do the accessible work: the image's `alt` defaults to it, and the
 * fallback is announced as the name rather than as the letters "A L". Omit `name` (and give the
 * image `alt=""`) when the name is already visible beside the avatar — a comment author, a user
 * row — so it is not read twice.
 *
 * Sizes are fixed pixel steps (xs 20 · sm 24 · default 32 · lg 40 · xl 48) rather than
 * density-scaled: an avatar is a recognition target, and a person should look the same size in a
 * compact table as in a comfortable one. `shape="square"` is for organisations, workspaces and
 * apps, so they never read as people.
 */
function Avatar({
  className,
  size = "default",
  shape = "circle",
  name,
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: AvatarSize;
  /** `square` for organisations, tenants, workspaces and apps; `circle` for people. */
  shape?: AvatarShape;
  /**
   * The person's (or organisation's) display name. Becomes the image's default `alt`, the
   * fallback's accessible name, and — when `AvatarFallback` has no children — its initials.
   */
  name?: string;
}) {
  const context = React.useMemo(() => ({ name }), [name]);
  return (
    <AvatarContext.Provider value={context}>
      <AvatarPrimitive.Root
        data-slot="avatar"
        data-size={size}
        data-shape={shape}
        className={cn(
          "group/avatar relative flex size-8 shrink-0 rounded-full select-none",
          "data-[size=xs]:size-5 data-[size=sm]:size-6 data-[size=lg]:size-10 data-[size=xl]:size-12",
          "data-[shape=square]:rounded-(--qx-component-avatar-corner-square)",
          // A hairline that keeps a pale photo from bleeding into a pale surface (and a dark one
          // into a dark surface); it blends, so it never reads as a drawn border.
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten",
          className,
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
}

function AvatarImage({ className, alt, ...props }: AvatarPrimitive.Image.Props) {
  const { name } = React.useContext(AvatarContext);
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      alt={alt ?? name ?? ""}
      className={cn(
        "aspect-square size-full rounded-[inherit] object-cover",
        // The photo fades in over the initials once it has loaded, instead of popping.
        "transition-opacity duration-normal ease-standard data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function AvatarFallback({ className, children, ...props }: AvatarPrimitive.Fallback.Props) {
  const { name } = React.useContext(AvatarContext);
  const hasChildren = children != null && children !== false && children !== "";
  const content = hasChildren ? children : name ? initialsOf(name) : null;
  // With a name, the fallback is one image called by it — not a string of letters spelled out.
  const named = name && props["aria-hidden"] == null && props["aria-label"] == null;
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      role={named ? "img" : undefined}
      aria-label={named ? name : undefined}
      className={cn(
        "flex size-full items-center justify-center rounded-[inherit] bg-(--qx-component-avatar-fallback-background) font-ui font-medium text-(--qx-component-avatar-fallback-foreground)",
        "text-sm group-data-[size=lg]/avatar:text-base group-data-[size=sm]/avatar:text-micro group-data-[size=xl]/avatar:text-lg group-data-[size=xs]/avatar:text-micro",
        "[&>svg]:size-[55%]",
        className,
      )}
      {...props}
    >
      {content ?? <UserRoundIcon aria-hidden />}
    </AvatarPrimitive.Fallback>
  );
}

/**
 * A status or notification mark on the avatar's bottom-end edge.
 *
 * Colour alone is not a status: put the meaning in text too — `<span className="sr-only">Online</span>`
 * inside the badge, or in the surrounding copy.
 */
function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute inset-e-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-(--qx-component-avatar-badge-background) text-(--qx-component-avatar-badge-foreground) ring-2 ring-(--qx-component-avatar-ring) select-none",
        "group-data-[shape=square]/avatar:-inset-e-0.5 group-data-[shape=square]/avatar:-bottom-0.5",
        // Forced colours turn the fill into Canvas and strip the ring; keep the mark visible.
        "forced-colors:bg-[CanvasText]",
        "group-data-[size=xs]/avatar:size-1.5 group-data-[size=xs]/avatar:ring-1 group-data-[size=xs]/avatar:[&>svg]:hidden",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        "group-data-[size=xl]/avatar:size-3.5 group-data-[size=xl]/avatar:[&>svg]:size-2.5",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Overlapping avatars. The overlap scales with the avatars' size, and each one is cut out of
 * the one beneath by a ring in `--qx-component-avatar-ring` (set it to the surface the group
 * sits on). Name every avatar (`name`), and give the overflow count a full sentence — "+3" is
 * not one: `<AvatarGroupCount aria-label="3 more people">+3</AvatarGroupCount>`.
 */
function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 has-data-[size=lg]:-space-x-2.5 has-data-[size=sm]:-space-x-1.5 has-data-[size=xl]:-space-x-3 has-data-[size=xs]:-space-x-1",
        "*:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-(--qx-component-avatar-ring) has-data-[size=xs]:*:data-[slot=avatar]:ring-1",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">) {
  const label = props["aria-label"];
  return (
    <div
      data-slot="avatar-group-count"
      role={label ? "img" : undefined}
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-(--qx-component-avatar-fallback-background) font-ui text-sm font-medium text-(--qx-component-avatar-fallback-foreground) tabular-nums ring-2 ring-(--qx-component-avatar-ring) [&>svg]:size-4",
        "group-has-data-[shape=square]/avatar-group:rounded-(--qx-component-avatar-corner-square)",
        "forced-colors:border forced-colors:border-[CanvasText]",
        "group-has-data-[size=xs]/avatar-group:size-5 group-has-data-[size=xs]/avatar-group:text-micro group-has-data-[size=xs]/avatar-group:ring-1 group-has-data-[size=xs]/avatar-group:[&>svg]:size-3",
        "group-has-data-[size=sm]/avatar-group:size-6 group-has-data-[size=sm]/avatar-group:text-micro group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        "group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=lg]/avatar-group:text-base group-has-data-[size=lg]/avatar-group:[&>svg]:size-5",
        "group-has-data-[size=xl]/avatar-group:size-12 group-has-data-[size=xl]/avatar-group:text-lg group-has-data-[size=xl]/avatar-group:[&>svg]:size-6",
        className,
      )}
      {...props}
    />
  );
}

export type { AvatarShape, AvatarSize };
export { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage };
