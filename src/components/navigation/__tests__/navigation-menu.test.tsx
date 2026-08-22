import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/navigation/navigation-menu";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function NavExample() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink className={navigationMenuTriggerStyle()} href="/docs">
            Documentation
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className={navigationMenuTriggerStyle()} href="/api">
            API Reference
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

describe("NavigationMenu", () => {
  it("renders navigation links", () => {
    render(<NavExample />);
    expect(screen.getByRole("link", { name: "Documentation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "API Reference" })).toBeInTheDocument();
  });

  it("renders as a nav element", () => {
    render(<NavExample />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("links have correct href attributes", () => {
    render(<NavExample />);
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute("href", "/docs");
    expect(screen.getByRole("link", { name: "API Reference" })).toHaveAttribute("href", "/api");
  });

  it("has no axe violations", async () => {
    const { container } = render(<NavExample />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
