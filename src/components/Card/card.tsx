import { mergeProps } from "@base-ui/react/merge-props";
import type { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * What a `render` callback receives as its second argument. Mirrors the data attributes the card
 * writes, so a composed element can style itself from the same facts.
 */
interface CardState extends Record<string, unknown> {
  size: "default" | "sm";
  variant: "default" | "outline" | "elevated";
  interactive: boolean;
  selected: boolean;
}

/**
 * The card's own props. `size` selects the padding/gap scale, not the width.
 *
 * A card is a static surface by default. Two opt-ins add behaviour, and neither invents
 * semantics on its own:
 *
 *   - `interactive` adds the pointer lift, the hover boundary and the Qeet focus ring. It is
 *     only honest on an element that can be activated, so pair it with `render` —
 *     `render={<a href="…" />}` for navigation (an anchor may contain the card's block
 *     content), or `render={<button type="button" />}` for a short, phrasing-only card.
 *   - `selected` paints the selected boundary (2px, brand, ≥3:1). It is *visual*: the state
 *     itself must be carried by the control that owns it — a radio or checkbox inside the card,
 *     or `aria-pressed` / `aria-checked` on the rendered element.
 */
type CardProps = useRender.ComponentProps<"div", CardState> & {
  size?: "default" | "sm";
  /**
   * Surface treatment. `default` is the resting card — boundary plus the faintest shadow.
   * `outline` drops the shadow for dense layouts and repeated tiles. `elevated` stands one
   * step forward; use it for the one surface on a page that should, not as a default.
   * @default "default"
   */
  variant?: "default" | "outline" | "elevated";
  /** Hover lift, pointer cursor and focus ring for a card that is itself the control. */
  interactive?: boolean;
  /** Paints the selected boundary. Visual only — see {@link CardProps}. */
  selected?: boolean;
};

const cardVariants = cva(
  [
    // Layout and the surface itself. `overflow-clip`, not `overflow-hidden`: both round the
    // footer band and edge-to-edge media into the corners, but only `clip` leaves the card
    // out of the scroll-container chain, so a `position: sticky` table header inside a card
    // still sticks to the page.
    "group/card flex flex-col gap-4 overflow-clip rounded-(--qx-component-card-corner) border border-(--qx-component-card-ring) bg-(--qx-component-card-background) py-4 text-start text-sm text-(--qx-component-card-foreground)",
    "has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0",
    "*:[img:first-child]:rounded-t-(--qx-component-card-corner) *:[img:last-child]:rounded-b-(--qx-component-card-corner)",
    // A card inside a card is a region of its parent, not a second floating layer: it keeps
    // its boundary and drops the shadow, so nesting never stacks elevation.
    "in-data-[slot=card]:shadow-none",
    // Selected: the brand boundary doubled to 2px with a ring, so the box does not shift. The
    // ring is a box-shadow, which forced-colours strips, so there the border alone carries it.
    "data-selected:border-(--qx-component-card-border-selected) data-selected:ring-1 data-selected:ring-(--qx-component-card-border-selected) forced-colors:data-selected:border-[Highlight]",
  ],
  {
    variants: {
      variant: {
        default: "shadow-(--qx-component-card-elevation)",
        outline: "shadow-none",
        elevated:
          "bg-(--qx-component-card-background-elevated) shadow-(--qx-component-card-elevation-elevated)",
      },
      interactive: {
        true: [
          "cursor-pointer transition-[box-shadow,border-color] duration-fast ease-standard",
          "hover:shadow-(--qx-component-card-elevation-hover) hover:not-data-selected:border-(--qx-component-card-border-hover)",
          "active:shadow-(--qx-component-card-elevation)",
          "focus-visible:focus-ring",
          "disabled:pointer-events-none disabled:opacity-disabled aria-disabled:pointer-events-none aria-disabled:opacity-disabled",
        ],
        false: "",
      },
    },
    defaultVariants: { variant: "default", interactive: false },
  },
);

/** Two refs as one, for a `render` element that brings its own. Hook-free on purpose. */
function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.Ref<T> | undefined {
  const defined = refs.filter((ref): ref is React.Ref<T> => ref != null);
  if (defined.length <= 1) return defined[0];
  return (node: T | null) => {
    for (const ref of defined) {
      if (typeof ref === "function") ref(node);
      else (ref as React.RefObject<T | null>).current = node;
    }
  };
}

/**
 * The `render` composition pattern without a hook, so Card stays server-safe (no
 * `"use client"`) — it is the layout primitive most often rendered from a Server Component.
 * Same contract as Base UI's `useRender`: an element is cloned with the card's props merged
 * under its own (handlers chained, classes joined, the element's own props winning), and a
 * function receives the props plus the state.
 */
function renderPart<State>(
  render: useRender.ComponentProps<"div", State>["render"],
  fallback: "div",
  props: React.ComponentPropsWithRef<"div">,
  state: State,
) {
  if (typeof render === "function") return render(props, state);
  if (React.isValidElement<Record<string, unknown> & { ref?: React.Ref<HTMLElement> }>(render)) {
    const own = render.props;
    const merged = mergeProps<"div">(props, own as React.ComponentPropsWithRef<"div">);
    return React.cloneElement(render, {
      ...merged,
      className: cn(props.className, own.className as string | undefined),
      ref: composeRefs(props.ref as React.Ref<HTMLElement> | undefined, own.ref),
    });
  }
  return React.createElement(fallback, props);
}

/**
 * A surface that groups related content, with an optional header (title, description and an
 * action slot), content and footer, in default, outline and elevated styles.
 */
function Card({
  className,
  size = "default",
  variant = "default",
  interactive = false,
  selected = false,
  render,
  ...props
}: CardProps) {
  const state: CardState = { size, variant, interactive, selected };
  return renderPart(
    render,
    "div",
    {
      "data-slot": "card",
      "data-size": size,
      "data-variant": variant,
      "data-interactive": interactive ? "true" : undefined,
      // `"true"`, not presence: the shared `data-selected:` variant matches `[data-selected="true"]`.
      "data-selected": selected ? "true" : undefined,
      className: cn(cardVariants({ variant, interactive }), className),
      ...props,
    } as React.ComponentPropsWithRef<"div">,
    state,
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // `minmax(0,1fr)` rather than `1fr`: a long unbroken title must wrap or truncate, never
        // push the action out of the card.
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-(--qx-component-card-corner) px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto] has-data-[slot=card-action]:gap-x-2 has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:border-(--qx-component-card-ring) [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The card's title. A `div` by default, because the right heading level depends on the page
 * around the card; pass `render={<h3 />}` (or whichever level fits the outline) so the card
 * is reachable by heading navigation.
 */
function CardTitle({ className, render, ...props }: useRender.ComponentProps<"div">) {
  return renderPart(
    render,
    "div",
    {
      "data-slot": "card-title",
      className: cn(
        "font-heading text-base leading-snug font-medium wrap-break-word group-data-[size=sm]/card:text-sm",
        className,
      ),
      ...props,
    } as React.ComponentPropsWithRef<"div">,
    {},
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm wrap-break-word text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        // No corner rounding of its own: the card's clip rounds the band into the corners.
        "flex items-center gap-2 border-t border-(--qx-component-card-ring) bg-(--qx-component-card-footer-background) p-4 group-data-[size=sm]/card:p-3",
        className,
      )}
      {...props}
    />
  );
}

export type { CardProps, CardState };
export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
