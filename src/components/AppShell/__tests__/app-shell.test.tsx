import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from "@/components/AppShell/app-shell";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function Shell() {
  return (
    <AppShell>
      <AppShellMain>
        <AppShellHeader>
          <h1>Dashboard</h1>
        </AppShellHeader>
        <AppShellContent>
          <p>Page body</p>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  );
}

describe("AppShell", () => {
  it("renders header, main content, and text", () => {
    render(<Shell />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Page body")).toBeInTheDocument();
  });

  it("renders correct landmark roles", () => {
    render(<Shell />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("sets data-slot attributes", () => {
    const { container } = render(<Shell />);
    expect(container.querySelector('[data-slot="app-shell"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="app-shell-main"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="app-shell-header"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="app-shell-content"]')).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Shell />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("AppShell layering and density", () => {
  it("puts the sticky header on the z-index ladder and the density-aware height token", () => {
    render(<Shell />);
    const header = screen.getByRole("banner");
    expect(header).toHaveClass(
      "sticky",
      "z-(--qx-z-sticky)",
      "h-(--qx-component-app-shell-header-height)",
    );
    expect(header.getAttribute("class")).not.toMatch(/\bz-30\b/);
  });

  it("lets the header scroll away with a class, through tailwind-merge", () => {
    render(
      <AppShell>
        <AppShellMain>
          <AppShellHeader className="static">Bar</AppShellHeader>
        </AppShellMain>
      </AppShell>,
    );
    expect(screen.getByRole("banner")).toHaveClass("static");
    expect(screen.getByRole("banner")).not.toHaveClass("sticky");
  });
});

describe("AppShell inside a sidebar layout", () => {
  // `SidebarInset` is already the <main> landmark, so the content region must be able to
  // render as something else — two main landmarks is an axe violation and a real
  // screen-reader problem (which one is the page?).
  it("renders the content region as a plain element on request, keeping one main landmark", async () => {
    const { container } = render(
      <AppShell>
        <main>
          <AppShellHeader>
            <h1>Users</h1>
          </AppShellHeader>
          <AppShellContent render={<div />}>
            <p>Page body</p>
          </AppShellContent>
        </main>
      </AppShell>,
    );
    expect(screen.getAllByRole("main")).toHaveLength(1);
    const content = container.querySelector('[data-slot="app-shell-content"]');
    expect(content?.tagName).toBe("DIV");
    expect(content).toHaveClass("flex-1", "overflow-auto");
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("keeps <main> and <header> as the defaults", () => {
    const { container } = render(<Shell />);
    expect(container.querySelector('[data-slot="app-shell-content"]')?.tagName).toBe("MAIN");
    expect(container.querySelector('[data-slot="app-shell-header"]')?.tagName).toBe("HEADER");
  });
});
