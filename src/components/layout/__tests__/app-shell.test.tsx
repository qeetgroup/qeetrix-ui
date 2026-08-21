import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
} from "@/components/layout/app-shell";

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
