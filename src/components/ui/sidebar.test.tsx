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
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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
