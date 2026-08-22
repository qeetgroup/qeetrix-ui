import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/navigation/sidebar";

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
