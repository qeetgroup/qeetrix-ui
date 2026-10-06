"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/Button/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/Drawer/sheet";
import { Input } from "@/components/Input/input";
import { Separator } from "@/components/Separator/separator";
import { Skeleton } from "@/components/Spinner/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { sidebarMessages } from "@/lib/messages";
import { COMPONENT } from "@/lib/token-values";
import { cn } from "@/lib/utils";
import { type Direction, useResolvedDirection } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = COMPONENT.sidebar.width.default;
const SIDEBAR_WIDTH_MOBILE = COMPONENT.sidebar.width.mobile;
const SIDEBAR_WIDTH_ICON = COMPONENT.sidebar.width.icon;
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

/**
 * Where an event came from someone typing. The toggle shortcut stands down there: ⌘/Ctrl+B is
 * "bold" in every rich-text editor, and a sidebar that collapses mid-sentence is a bug.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/**
 * The resolved reading direction, read once by `SidebarProvider` from the subtree it renders.
 * Internal: the parts that need it (the mobile sheet's physical edge, the collapsed-mode tooltip
 * side) read it here instead of each re-deriving direction from the DOM.
 */
const SidebarDirectionContext = React.createContext<Direction>("ltr");

/** Which inline edge the nearest `Sidebar` sits on. Internal, read by the menu buttons. */
const SidebarSideContext = React.createContext<"left" | "right">("left");

/**
 * The physical edge a logical sidebar side lands on. `side` names the inline start ("left") or
 * end ("right") of the layout, so it mirrors under RTL like the rest of the sidebar's styling.
 * Sheet and tooltip placement take physical sides, which is the only reason this exists.
 */
function physicalSide(side: "left" | "right", direction: Direction): "left" | "right" {
  if (direction !== "rtl") return side;
  return side === "left" ? "right" : "left";
}

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ref,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  // Direction is resolved here, once, against the wrapper this provider renders — the sidebar's
  // mobile sheet is portalled out of the tree, so it has no node of its own to read `dir` from.
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const direction = useResolvedDirection(
    wrapperRef,
    props.dir === "rtl" || props.dir === "ltr" ? props.dir : undefined,
  );
  const setWrapperRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      wrapperRef.current = node;
      if (typeof ref === "function") return ref(node);
      if (ref) ref.current = node;
    },
    [ref],
  );

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      // Persist sidebar state in a cookie so the server can read the initial
      // value for SSR. document.cookie is used deliberately (universally
      // supported + synchronous); the Cookie Store API lacks Firefox/Safari
      // support. noDocumentCookie is disabled for this file in biome.json.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open],
  );

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen]);

  // ⌘/Ctrl+B toggles the sidebar — unless someone is typing (it is "bold" in an editor), another
  // handler already claimed the key, or a modifier makes it a different shortcut (Ctrl+Shift+B
  // is the browser's bookmarks bar).
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== SIDEBAR_KEYBOARD_SHORTCUT) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.defaultPrevented || event.repeat || isEditableTarget(event.target)) return;
      event.preventDefault();
      toggleSidebar();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <SidebarDirectionContext.Provider value={direction}>
        <div
          ref={setWrapperRef}
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            "group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </SidebarDirectionContext.Provider>
    </SidebarContext.Provider>
  );
}

/**
 * The navigation rail itself.
 *
 * **`side` is logical.** `"left"` is the inline *start* of the layout and `"right"` the inline
 * end, so a sidebar declared once mirrors under `dir="rtl"` the way the rest of Qeetrix does:
 * the desktop rail, its border, the rail handle, the collapsed-mode tooltips and the mobile
 * sheet all follow the reading direction. Place the `Sidebar` before `SidebarInset` for the
 * start and after it for the end. (Before this, the container was pinned physically while the
 * gap that reserves its space followed the flex row, so an RTL layout overlapped its own
 * content.)
 */
function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  dir,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
}) {
  const messages = useMessages("sidebar", sidebarMessages);
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
  const providerDirection = React.useContext(SidebarDirectionContext);
  const direction: Direction = dir === "rtl" || dir === "ltr" ? dir : providerDirection;

  if (collapsible === "none") {
    return (
      <SidebarSideContext.Provider value={side}>
        <div
          data-slot="sidebar"
          data-side={side}
          className={cn(
            "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
            className,
          )}
          dir={dir}
          {...props}
        >
          {children}
        </div>
      </SidebarSideContext.Provider>
    );
  }

  if (isMobile) {
    return (
      <SidebarSideContext.Provider value={side}>
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            // The sheet is portalled out of the subtree that carries `dir`, so it is told.
            dir={direction}
            data-sidebar="sidebar"
            data-slot="sidebar"
            data-mobile="true"
            // Sheet's own width (`w-3/4`) is replaced, not stacked: the published mobile width
            // token is the width, capped so a phone always keeps a strip of scrim to tap.
            className="max-w-[85vw] bg-sidebar p-0 text-sidebar-foreground data-[side=left]:w-(--sidebar-width) data-[side=right]:w-(--sidebar-width) [&>button]:hidden"
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
              } as React.CSSProperties
            }
            side={physicalSide(side, direction)}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{messages.mobileTitle}</SheetTitle>
              <SheetDescription>{messages.mobileDescription}</SheetDescription>
            </SheetHeader>
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      </SidebarSideContext.Provider>
    );
  }

  return (
    <SidebarSideContext.Provider value={side}>
      <div
        className="group peer hidden text-sidebar-foreground md:block"
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
        data-slot="sidebar"
      >
        {/* This is what handles the sidebar gap on desktop */}
        <div
          data-slot="sidebar-gap"
          className={cn(
            "relative w-(--sidebar-width) bg-transparent transition-[width] duration-normal ease-standard",
            "group-data-[collapsible=offcanvas]:w-0",
            "group-data-[side=right]:rotate-180",
            variant === "floating" || variant === "inset"
              ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
              : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
          )}
        />
        <div
          data-slot="sidebar-container"
          data-side={side}
          className={cn(
            // Logical insets, so the container lands where the gap above reserved its space in
            // either direction. Fixed-layer z-index from the token ladder: above sticky page
            // chrome, below every overlay.
            "fixed inset-y-0 z-(--qx-z-fixed) hidden h-svh w-(--sidebar-width) transition-[left,right,inset-inline-start,inset-inline-end,width] duration-normal ease-standard data-[side=left]:inset-s-0 data-[side=left]:group-data-[collapsible=offcanvas]:-inset-s-(--sidebar-width) data-[side=right]:inset-e-0 data-[side=right]:group-data-[collapsible=offcanvas]:-inset-e-(--sidebar-width) md:flex",
            // Adjust the padding for floating and inset variants.
            variant === "floating" || variant === "inset"
              ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
              : "border-sidebar-border group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-e group-data-[side=right]:border-s",
            className,
          )}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            data-slot="sidebar-inner"
            // A real border, not a box-shadow ring: forced-colors mode strips shadows, and the
            // floating panel would lose its edge entirely.
            className="flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-rest"
          >
            {children}
          </div>
        </div>
      </div>
    </SidebarSideContext.Provider>
  );
}

/**
 * The collapse/expand control. Its accessible name comes from the message catalogue: the
 * sidebar parts take no `messages` prop of their own — there are a dozen of them sharing three
 * strings, and a prop on each would be more surface than the strings are worth. Translate them
 * with a `MessagesProvider`.
 */
function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const messages = useMessages("sidebar", sidebarMessages);
  const { toggleSidebar, isMobile, open, openMobile } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      // A toggle that does not say which way it is set is half a control for a screen reader.
      // `aria-pressed` (a toggle button) rather than `aria-expanded`: the label already names
      // the action, and ghost Buttons paint `aria-expanded` as an open menu trigger.
      aria-pressed={isMobile ? openMobile : open}
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon aria-hidden className="rtl:rotate-180" />
      <span className="sr-only">{messages.toggle}</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const messages = useMessages("sidebar", sidebarMessages);
  const { toggleSidebar } = useSidebar();

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label={messages.toggle}
      tabIndex={-1}
      onClick={toggleSidebar}
      title={messages.toggle}
      className={cn(
        // Logical, like the container it hangs off: `-inset-e-4` / `inset-s-0` put the handle on the
        // edge that faces the content in either direction, and the translate centres it there.
        // `z-20` is local — the container's fixed z-index already makes it a stacking context.
        "absolute inset-y-0 z-20 hidden w-4 transition-all duration-normal ease-standard group-data-[side=left]:-inset-e-4 group-data-[side=right]:inset-s-0 after:absolute after:inset-y-0 after:inset-s-1/2 after:w-0.5 after:transition-colors hover:after:bg-sidebar-border sm:flex ltr:-translate-x-1/2 rtl:translate-x-1/2",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize rtl:in-data-[side=left]:cursor-e-resize rtl:in-data-[side=right]:cursor-w-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize rtl:[[data-side=left][data-state=collapsed]_&]:cursor-w-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize rtl:[[data-side=right][data-state=collapsed]_&]:cursor-e-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:inset-s-full hover:group-data-[collapsible=offcanvas]:bg-sidebar rtl:group-data-[collapsible=offcanvas]:translate-x-0",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-inset-e-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-inset-s-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        // The inset sheet is drawn by its shadow; forced-colors mode removes shadows, so it gets
        // a real border there instead.
        "relative flex w-full min-w-0 flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ms-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-rest md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ms-2 forced-colors:md:peer-data-[variant=inset]:border",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn("h-(--qx-control-height) w-full bg-background shadow-none", className)}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div"> & React.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          // Section labels sit on the density rhythm with the items they head, in the muted text
          // role (≥4.5:1 on the sidebar in both themes) rather than an alpha of the foreground.
          // `text-xs`, not `text-caption`: tailwind-merge does not know the type-role sizes,
          // reads `text-caption` as a colour, and drops it in favour of `text-muted-foreground`.
          "flex h-(--qx-control-height) shrink-0 items-center rounded-md px-2 text-xs font-medium text-muted-foreground outline-none transition-[margin,opacity] duration-normal ease-standard group-data-[collapsible=icon]:-mt-(--qx-control-height) group-data-[collapsible=icon]:opacity-0 focus-visible:focus-ring-inset [&>svg]:size-4 [&>svg]:shrink-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "sidebar-group-label",
      sidebar: "group-label",
    },
  });
}

function SidebarGroupAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<"button"> & React.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(
          // Centred on the group label, whose height follows density: group padding + half the
          // difference between the label and this 1.25rem button.
          "absolute inset-e-3 top-[calc(var(--spacing)*2+(var(--qx-control-height)-var(--spacing)*5)/2)] flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none transition-colors duration-fast ease-standard group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:focus-ring md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "sidebar-group-action",
      sidebar: "group-action",
    },
  });
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-0", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
}

/*
 * The Qeet navigation signature.
 *
 * Selection is a quiet Qeet tint (`--sidebar-selected`) with the normal text colour, a brand
 * leading icon, and a 3:1 Qeet indicator bar at the inline start — never an orange block. The bar
 * is what carries selection for anyone who cannot see the tint, it survives the icon-only rail,
 * and in forced-colors mode the item takes the system selection (`forced-colors-selected`) while
 * the bar stays `Highlight`. Hover stays neutral
 * (`--sidebar-accent`), so hover and selection never read as the same thing.
 *
 * `data-[active]` rather than the shorter `data-active:` is deliberate: the shadcn variant wraps
 * its selector in `:where()`, which drops it below `hover:` in specificity, and a selected item
 * would turn grey under the pointer.
 */
const sidebarMenuButtonVariants = cva(
  [
    "peer/menu-button group/menu-button relative flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-start text-sm text-sidebar-foreground outline-none",
    "transition-[width,height,padding,background-color,color] duration-fast ease-standard",
    "group-has-data-[sidebar=menu-action]/menu-item:pe-8 group-has-data-[sidebar=menu-badge]/menu-item:pe-10",
    "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground",
    "focus-visible:focus-ring-inset",
    "disabled:pointer-events-none disabled:opacity-disabled aria-disabled:pointer-events-none aria-disabled:opacity-disabled",
    // Selected: tint + label weight + brand leading icon.
    "data-[active]:bg-sidebar-selected data-[active]:font-medium data-[active]:text-sidebar-selected-foreground data-[active]:[&>svg:first-child]:text-brand",
    // The indicator bar. Present on every item so selection changes fade rather than pop.
    "before:pointer-events-none before:absolute before:inset-y-1/4 before:inset-s-0 before:w-(--qx-component-sidebar-indicator-width) before:rounded-full before:bg-sidebar-indicator before:opacity-0 before:transition-opacity before:duration-fast before:ease-standard data-[active]:before:opacity-100",
    // A parent whose sub-item is current: weight and icon only while the sub-menu shows the
    // selection; the full treatment once the rail collapses to icons and hides the sub-menu.
    // (Spelled out in full — Tailwind cannot see a class assembled from a template string.)
    "group-has-[[data-sidebar=menu-sub-button][data-active]]/menu-item:font-medium group-has-[[data-sidebar=menu-sub-button][data-active]]/menu-item:[&>svg:first-child]:text-brand",
    "group-data-[collapsible=icon]:group-has-[[data-sidebar=menu-sub-button][data-active]]/menu-item:bg-sidebar-selected group-data-[collapsible=icon]:group-has-[[data-sidebar=menu-sub-button][data-active]]/menu-item:before:opacity-100",
    // Forced colours: hover paints nothing (the bridge maps the sidebar tints to Canvas); the
    // selected item, and a collapsed-rail parent of the current sub-item, take the system
    // selection — the library recipe, theming.md § Forced colours.
    "data-[active]:forced-colors-selected group-data-[collapsible=icon]:group-has-[[data-sidebar=menu-sub-button][data-active]]/menu-item:forced-colors-selected",
    "[&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate",
  ],
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        // A real 1px border: the previous box-shadow "border" vanished in forced-colors mode.
        outline:
          "border border-sidebar-border bg-background hover:border-sidebar-accent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      },
      size: {
        // The default row follows density; `sm` and `lg` are explicit sizes and stay put.
        default: "h-(--qx-control-height) text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * Puts `disabled` on the element a tooltip trigger renders. `TooltipTrigger` takes `disabled`
 * as *its own* prop — "don't open the tooltip" — and does not forward it, so a disabled menu
 * item with a tooltip used to render as an enabled, clickable button.
 */
function withDisabled(
  render: useRender.ComponentProps<"button">["render"],
  disabled: boolean | undefined,
): useRender.ComponentProps<"button">["render"] {
  if (!disabled) return render;
  if (render === undefined) return <button type="button" disabled />;
  if (typeof render === "function") {
    // The render function's props are typed as generic HTML props; it renders a button here.
    return (props, state) => render({ ...props, disabled: true } as typeof props, state);
  }
  return React.cloneElement(render as React.ReactElement<{ disabled?: boolean }>, {
    disabled: true,
  });
}

/**
 * A top-level navigation item.
 *
 * `isActive` marks the current page: it draws the Qeet selection and sets
 * `aria-current="page"` (an explicit `aria-current` still wins). Mark the page itself, not the
 * group that contains it — a parent whose `SidebarMenuSubButton` is active styles itself as
 * "contains current" without being told.
 *
 * `tooltip` is shown only while the sidebar is collapsed to icons, on the side facing the
 * content.
 */
function SidebarMenuButton({
  render,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  disabled,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>) {
  const { isMobile, state } = useSidebar();
  const direction = React.useContext(SidebarDirectionContext);
  const side = React.useContext(SidebarSideContext);
  const comp = useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(sidebarMenuButtonVariants({ variant, size }), className),
        "aria-current": isActive ? "page" : undefined,
        disabled,
      },
      props,
    ),
    render: !tooltip ? render : <TooltipTrigger render={withDisabled(render, disabled)} />,
    state: {
      slot: "sidebar-menu-button",
      sidebar: "menu-button",
      size,
      active: isActive,
    },
  });

  if (!tooltip) {
    return comp;
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    };
  }

  // Toward the content: the inline end of a start-side sidebar, resolved to a physical side
  // because the positioner's own `inline-end` only knows about a Base UI direction provider.
  const contentSide = physicalSide(side === "left" ? "right" : "left", direction);

  return (
    <Tooltip>
      {comp}
      <TooltipContent
        side={contentSide}
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltip}
      />
    </Tooltip>
  );
}

function SidebarMenuAction({
  className,
  render,
  showOnHover = false,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    showOnHover?: boolean;
  }) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(
          // Vertically centred on a default row whatever its density-resolved height; the
          // explicit sizes keep their fixed offsets.
          "absolute inset-e-1 top-[calc((var(--qx-control-height)-var(--spacing)*5)/2)] flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none transition-colors duration-fast ease-standard group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:focus-ring peer-data-[active]/menu-button:forced-colors-selected md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
          showOnHover &&
            "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-[active]/menu-button:text-sidebar-selected-foreground aria-expanded:opacity-100 md:opacity-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "sidebar-menu-action",
      sidebar: "menu-action",
    },
  });
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        // A count is secondary to the label it annotates, so it sits in the muted text role
        // (≥4.5:1 on the sidebar, its hover and its selected tint) and joins the label's colour
        // when the row is hovered or selected. The menu button reserves room for it (`pe-10`),
        // so a long label truncates before it runs under the count.
        "pointer-events-none absolute inset-e-1 top-[calc((var(--qx-control-height)-var(--spacing)*5)/2)] flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium text-muted-foreground tabular-nums select-none group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 peer-data-[active]/menu-button:text-sidebar-selected-foreground peer-data-[active]/menu-button:forced-colors-selected",
        className,
      )}
      {...props}
    />
  );
}

/** The narrowest and widest a skeleton text bar may be, as a percentage of the row. */
const SKELETON_TEXT_WIDTH_MIN = 50;
const SKELETON_TEXT_WIDTH_SPREAD = 40;

/**
 * A width in `[50%, 90%)` that depends only on `id`.
 *
 * The same id always yields the same width — that is the hydration contract — and two ids that
 * differ anywhere yield unrelated widths, which is what keeps a list of skeletons uneven. The
 * mixing step at the end earns its keep: React hands out ids that differ by one character, and
 * a plain rolling hash of those turns into a visible staircase of widths down the list.
 */
function skeletonTextWidth(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (Math.imul(hash, 31) + id.charCodeAt(index)) | 0;
  }
  // Murmur3's finalizer. React's ids differ in one character, and a rolling hash of those maps
  // several of them onto the same bucket: without this, six skeletons in a row could come out
  // with three identical widths.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;

  return `${((hash >>> 0) % SKELETON_TEXT_WIDTH_SPREAD) + SKELETON_TEXT_WIDTH_MIN}%`;
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean;
}) {
  // Varied, not random. A loading list wants uneven bars so it reads as a list of names rather
  // than a chart, but the width may not be drawn at render time: the server and the browser draw
  // different numbers, and React resolves a mismatched `style` attribute by keeping the server's
  // — so the element renders one width while the component believes another, for the life of the
  // row. `useId` is the one per-instance value React guarantees is identical in both renders, so
  // the variety comes from hashing it.
  const width = skeletonTextWidth(React.useId());

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn("flex h-(--qx-control-height) items-center gap-2 rounded-md px-2", className)}
      {...props}
    >
      {showIcon && <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-s border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden rtl:-translate-x-px",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn(
        // In a nested list the indicator rides the guide line: the segment beside the current
        // sub-item lights up in Qeet, centred on the parent list's 1px inline-start border
        // (its 0.625rem padding plus the border, plus half the bar's own overhang).
        "group/menu-sub-item relative before:pointer-events-none before:absolute before:inset-y-1 before:-inset-s-[calc(var(--spacing)*2.5+1.5px)] before:w-0.5 before:rounded-full before:bg-sidebar-indicator before:opacity-0 before:transition-opacity before:duration-fast before:ease-standard has-data-[active]:before:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A nested navigation item. `isActive` marks the current page: the Qeet tint on the item, the
 * indicator on the guide line beside it, and `aria-current="page"`.
 */
function SidebarMenuSubButton({
  render,
  size = "md",
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<"a"> &
  React.ComponentProps<"a"> & {
    size?: "sm" | "md";
    isActive?: boolean;
  }) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none transition-[background-color,color] duration-fast ease-standard group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:focus-ring-inset active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-disabled aria-disabled:pointer-events-none aria-disabled:opacity-disabled data-[size=md]:text-sm data-[size=sm]:text-xs rtl:translate-x-px data-[active]:bg-sidebar-selected data-[active]:font-medium data-[active]:text-sidebar-selected-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground data-[active]:forced-colors-selected",
          className,
        ),
        "aria-current": isActive ? "page" : undefined,
      },
      props,
    ),
    render,
    state: {
      slot: "sidebar-menu-sub-button",
      sidebar: "menu-sub-button",
      size,
      active: isActive,
    },
  });
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
