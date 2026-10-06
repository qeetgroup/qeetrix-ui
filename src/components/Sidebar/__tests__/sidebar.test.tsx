import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/Sidebar/sidebar";
import { DirectionProvider } from "@/providers/direction-provider";

/**
 * jsdom's `matchMedia` never matches, so the desktop branch is the default; the mobile sheet has
 * to be forced through the hook.
 */
const mobile = vi.hoisted(() => ({ value: false }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mobile.value }));
afterEach(() => {
  mobile.value = false;
});

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

function Shell() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Dashboard</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive>Settings</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger />
        <p>Page content</p>
      </SidebarInset>
    </SidebarProvider>
  );
}

describe("Sidebar", () => {
  it("renders the SidebarInset main landmark", () => {
    render(<Shell />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders menu items as buttons", () => {
    render(<Shell />);
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });

  it("marks the active menu button with data-active", () => {
    render(<Shell />);
    // Base UI's useRender emits `data-active` as a valueless boolean attribute
    // when active, and omits it otherwise.
    expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("data-active");
    expect(screen.getByRole("button", { name: "Dashboard" })).not.toHaveAttribute("data-active");
  });

  it("exposes an accessible trigger that toggles the sidebar state", () => {
    const { container } = render(<Shell />);
    const sidebar = container.querySelector('[data-slot="sidebar"]') as HTMLElement;
    expect(sidebar).toHaveAttribute("data-state", "expanded");
    fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }));
    expect(sidebar).toHaveAttribute("data-state", "collapsed");
  });

  it("throws when a sidebar part is used outside SidebarProvider", () => {
    // useSidebar guards against a missing provider (contract for consumers).
    const spy = () => render(<SidebarTrigger />);
    expect(spy).toThrow(/useSidebar must be used within a SidebarProvider/);
  });

  it("has no axe violations", async () => {
    const { container } = render(<Shell />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/* SSR-002. The skeleton's width used to be `Math.random()`, drawn during render. */
describe("SidebarMenuSkeleton width", () => {
  const widths = (container: Element) =>
    [...container.querySelectorAll<HTMLElement>('[data-sidebar="menu-skeleton-text"]')].map(
      (element) => element.style.getPropertyValue("--skeleton-width"),
    );

  it("keeps each skeleton's width across re-renders", () => {
    const { container, rerender } = render(
      <ul>
        <SidebarMenuSkeleton />
        <SidebarMenuSkeleton />
        <SidebarMenuSkeleton />
      </ul>,
    );
    const before = widths(container);

    rerender(
      <ul>
        <SidebarMenuSkeleton />
        <SidebarMenuSkeleton />
        <SidebarMenuSkeleton />
      </ul>,
    );

    expect(widths(container)).toEqual(before);
    expect(before.every((width) => /^\d+%$/.test(width))).toBe(true);
  });

  it("still varies the widths between siblings", () => {
    const { container } = render(
      <ul>
        {["a", "b", "c", "d", "e", "f"].map((key) => (
          <SidebarMenuSkeleton key={key} />
        ))}
      </ul>,
    );

    expect(new Set(widths(container)).size).toBeGreaterThan(3);
  });
});

// The rail handle carried `ltr:-translate-x-1/2 rtl:-translate-x-1/2` — the same value under both
// variants, so the `rtl:` one was a no-op and the handle sat on the wrong side of the edge in RTL.
// jsdom computes no layout, so the assertion is on the emitted variants: the mirrored one must be
// the opposite sign of the base.
describe("Sidebar rail mirroring", () => {
  it("mirrors the rail handle offset under rtl", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar collapsible="offcanvas">
          <SidebarContent />
          <SidebarRail />
        </Sidebar>
      </SidebarProvider>,
    );

    const rail = container.querySelector('[data-slot="sidebar-rail"]');
    expect(rail).not.toBeNull();
    const className = rail?.getAttribute("class") ?? "";
    expect(className).toContain("ltr:-translate-x-1/2");
    expect(className).toContain("rtl:translate-x-1/2");
    expect(className).not.toContain("rtl:-translate-x-1/2");
  });
});

/*
 * ── The Qeet navigation signature ───────────────────────────────────────────────────────────
 *
 * jsdom applies no CSS, so what is pinned is the recipe each part emits: the selected tint,
 * the indicator bar and the foundation focus ring — and the absence of what they replaced (a
 * neutral "active" fill identical to hover, an alpha-borrowed ring, a box-shadow border).
 */
describe("Sidebar selection signature", () => {
  const classOf = (name: string) =>
    screen.getByRole("button", { name }).getAttribute("class") ?? "";

  it("draws the active item as a Qeet tint with an inline-start indicator, not the hover fill", () => {
    render(<Shell />);
    const active = classOf("Settings");
    expect(active).toContain("data-[active]:bg-sidebar-selected");
    expect(active).toContain("data-[active]:text-sidebar-selected-foreground");
    expect(active).toContain("before:bg-sidebar-indicator");
    expect(active).toContain("before:inset-s-0");
    expect(active).toContain("data-[active]:before:opacity-100");
    expect(active).not.toContain("data-active:bg-sidebar-accent");
    // Hover stays neutral, so hover and selection never read as the same state.
    expect(active).toContain("hover:bg-sidebar-accent");
  });

  it("uses the foundation inset focus ring", () => {
    render(<Shell />);
    expect(classOf("Dashboard")).toContain("focus-visible:focus-ring-inset");
    expect(classOf("Dashboard")).not.toContain("ring-sidebar-ring");
  });

  it("gives the outline variant a real border instead of a box-shadow", () => {
    render(
      <SidebarProvider>
        <SidebarMenuButton variant="outline">Outlined</SidebarMenuButton>
      </SidebarProvider>,
    );
    expect(classOf("Outlined")).toContain("border-sidebar-border");
    expect(classOf("Outlined")).not.toContain("shadow-[");
  });

  it("follows density on the default row and leaves explicit sizes fixed", () => {
    render(
      <SidebarProvider>
        <SidebarMenuButton>Default row</SidebarMenuButton>
        <SidebarMenuButton size="sm">Small row</SidebarMenuButton>
      </SidebarProvider>,
    );
    expect(classOf("Default row")).toContain("h-(--qx-control-height)");
    expect(classOf("Small row")).toContain("h-7");
  });

  it("puts the fixed container on the z-index ladder", () => {
    const { container } = render(<Shell />);
    const sidebarContainer = container.querySelector('[data-slot="sidebar-container"]');
    expect(sidebarContainer?.getAttribute("class")).toContain("z-(--qx-z-fixed)");
    expect(sidebarContainer?.getAttribute("class")).not.toMatch(/\bz-10\b/);
  });
});

describe("Sidebar current-page semantics", () => {
  it("announces the active item as the current page", () => {
    render(<Shell />);
    expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("lets an explicit aria-current win", () => {
    render(
      <SidebarProvider>
        <SidebarMenuButton isActive aria-current="location">
          Section
        </SidebarMenuButton>
      </SidebarProvider>,
    );
    expect(screen.getByRole("button", { name: "Section" })).toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  it("marks an active sub-item as the current page, and its parent as containing it", () => {
    const { container } = render(
      <SidebarProvider>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>Applications</SidebarMenuButton>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton href="/apps/pay" isActive>
                  Qeet Pay console
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarProvider>,
    );
    const sub = screen.getByRole("link", { name: "Qeet Pay console" });
    expect(sub).toHaveAttribute("aria-current", "page");
    expect(sub).toHaveAttribute("data-active");
    // The parent is not the page; it styles itself from its subtree.
    const parent = screen.getByRole("button", { name: "Applications" });
    expect(parent).not.toHaveAttribute("aria-current");
    expect(parent.getAttribute("class")).toContain(
      "group-has-[[data-sidebar=menu-sub-button][data-active]]/menu-item:font-medium",
    );
    // The indicator rides the sub-list's guide line.
    const item = container.querySelector('[data-slot="sidebar-menu-sub-item"]');
    expect(item?.getAttribute("class")).toContain("has-data-[active]:before:opacity-100");
  });

  it("reserves room for a count so a long label truncates before it", () => {
    render(
      <SidebarProvider>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>Users</SidebarMenuButton>
            <SidebarMenuBadge>1,842</SidebarMenuBadge>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarProvider>,
    );
    expect(screen.getByRole("button", { name: "Users" }).getAttribute("class")).toContain(
      "group-has-data-[sidebar=menu-badge]/menu-item:pe-10",
    );
  });

  it("labels sections in the muted text role, on the density rhythm", () => {
    render(
      <SidebarProvider>
        <SidebarGroupLabel>Directory</SidebarGroupLabel>
      </SidebarProvider>,
    );
    const label = screen.getByText("Directory");
    expect(label.getAttribute("class")).toContain("text-muted-foreground");
    expect(label.getAttribute("class")).toContain("text-xs");
    expect(label.getAttribute("class")).not.toContain("/70");
  });
});

// A disabled item with a tooltip rendered as an *enabled* button: `TooltipTrigger` reads
// `disabled` as "don't open the tooltip" and never forwarded it to the element.
describe("Sidebar disabled items", () => {
  it("disables the button when the item also has a tooltip", () => {
    const onClick = vi.fn();
    render(
      <SidebarProvider defaultOpen={false}>
        <SidebarMenuButton tooltip="Passkeys" disabled onClick={onClick}>
          Passkeys
        </SidebarMenuButton>
      </SidebarProvider>,
    );
    const button = screen.getByRole("button", { name: "Passkeys" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disables a custom-rendered element too", () => {
    render(
      <SidebarProvider>
        <SidebarMenuButton tooltip="Audit" disabled render={<button type="button" />}>
          Audit
        </SidebarMenuButton>
      </SidebarProvider>,
    );
    expect(screen.getByRole("button", { name: "Audit" })).toBeDisabled();
  });

  it("disables a plain item without a tooltip", () => {
    render(
      <SidebarProvider>
        <SidebarMenuButton disabled>Roles</SidebarMenuButton>
      </SidebarProvider>,
    );
    expect(screen.getByRole("button", { name: "Roles" })).toBeDisabled();
  });
});

describe("Sidebar collapsed-mode tooltips", () => {
  const openTooltip = async () => {
    const button = screen.getByRole("button", { name: "Users" });
    fireEvent.mouseEnter(button);
    fireEvent.pointerEnter(button);
    fireEvent.focus(button);
    return waitFor(() => {
      const positioner = document.querySelector('[data-slot="tooltip-content"]')?.parentElement;
      expect(positioner).toBeTruthy();
      return positioner as HTMLElement;
    });
  };

  function Collapsed({ side = "left" as "left" | "right" }) {
    return (
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible="icon" side={side}>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Users">Users</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
  }

  it("opens toward the content: right of a start-side rail in ltr", async () => {
    render(<Collapsed />);
    expect((await openTooltip()).getAttribute("data-side")).toBe("right");
  });

  it("opens toward the content: left of a start-side rail in rtl", async () => {
    render(
      <DirectionProvider direction="rtl">
        <Collapsed />
      </DirectionProvider>,
    );
    expect((await openTooltip()).getAttribute("data-side")).toBe("left");
  });

  it("opens toward the content: left of an end-side rail in ltr", async () => {
    render(<Collapsed side="right" />);
    expect((await openTooltip()).getAttribute("data-side")).toBe("left");
  });
});

/*
 * ── Direction ───────────────────────────────────────────────────────────────────────────────
 *
 * `side` is logical. The desktop container used to be pinned with physical `left-0` while the
 * gap reserving its space followed the flex row, so an RTL layout overlapped its own content.
 */
describe("Sidebar direction", () => {
  it("positions the desktop container with logical insets", () => {
    const { container } = render(<Shell />);
    const className =
      container.querySelector('[data-slot="sidebar-container"]')?.getAttribute("class") ?? "";
    expect(className).toContain("data-[side=left]:inset-s-0");
    expect(className).toContain("data-[side=right]:inset-e-0");
    expect(className).not.toContain("data-[side=left]:left-0");
    expect(className).not.toContain("data-[side=right]:right-0");
  });

  it("puts the rail handle on the content-facing edge with logical insets", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar>
          <SidebarRail />
        </Sidebar>
      </SidebarProvider>,
    );
    const className =
      container.querySelector('[data-slot="sidebar-rail"]')?.getAttribute("class") ?? "";
    expect(className).toContain("group-data-[side=left]:-inset-e-4");
    expect(className).not.toContain("-right-4");
  });

  it("opens the mobile sheet from the inline start in ltr", () => {
    mobile.value = true;
    render(
      <SidebarProvider defaultOpen>
        <Sidebar>
          <SidebarContent />
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }));
    const sheet = document.querySelector('[data-mobile="true"]');
    expect(sheet).toHaveAttribute("data-side", "left");
    expect(sheet).toHaveAttribute("dir", "ltr");
  });

  it("opens the mobile sheet from the inline start in rtl, and tells the portalled sheet", () => {
    mobile.value = true;
    render(
      <DirectionProvider direction="rtl">
        <SidebarProvider>
          <Sidebar>
            <SidebarContent />
          </Sidebar>
          <SidebarTrigger />
        </SidebarProvider>
      </DirectionProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }));
    const sheet = document.querySelector('[data-mobile="true"]');
    expect(sheet).toHaveAttribute("data-side", "right");
    expect(sheet).toHaveAttribute("dir", "rtl");
  });

  it("honours the mobile width token instead of the sheet's own width", () => {
    mobile.value = true;
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent />
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }));
    const className = document.querySelector('[data-mobile="true"]')?.getAttribute("class") ?? "";
    expect(className).toContain("data-[side=left]:w-(--sidebar-width)");
    // Sheet's own per-side width must not stack on top of the token.
    expect(className).not.toContain("data-[side=left]:w-3/4");
  });
});

describe("Sidebar toggle", () => {
  it("states the toggle's position as pressed / not pressed", () => {
    render(<Shell />);
    const trigger = screen.getByRole("button", { name: /toggle sidebar/i });
    expect(trigger).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-pressed", "false");
  });

  const state = (container: HTMLElement) =>
    container.querySelector('[data-slot="sidebar"]')?.getAttribute("data-state");

  it("toggles on Ctrl+B and on ⌘B", () => {
    const { container } = render(<Shell />);
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(state(container)).toBe("collapsed");
    fireEvent.keyDown(window, { key: "b", metaKey: true });
    expect(state(container)).toBe("expanded");
  });

  it("stands down while someone is typing — Ctrl+B is bold in an editor", () => {
    const { container } = render(
      <>
        <Shell />
        <div contentEditable suppressContentEditableWarning data-testid="editor" />
        <input aria-label="Search" />
      </>,
    );
    const editor = screen.getByTestId("editor");
    // jsdom does not implement `isContentEditable`; the browser derives it from the attribute.
    Object.defineProperty(editor, "isContentEditable", { value: true });
    fireEvent.keyDown(editor, { key: "b", ctrlKey: true });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Search" }), {
      key: "b",
      ctrlKey: true,
    });
    expect(state(container)).toBe("expanded");
  });

  it("leaves a key another handler already claimed, and other chords, alone", () => {
    const { container } = render(<Shell />);
    const claim = (event: KeyboardEvent) => event.preventDefault();
    document.body.addEventListener("keydown", claim);
    fireEvent.keyDown(document.body, { key: "b", ctrlKey: true });
    document.body.removeEventListener("keydown", claim);
    fireEvent.keyDown(window, { key: "b", ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(window, { key: "b", ctrlKey: true, altKey: true });
    expect(state(container)).toBe("expanded");
  });
});
