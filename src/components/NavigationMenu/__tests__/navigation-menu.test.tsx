import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/NavigationMenu/navigation-menu";

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

/** Two disclosure items, which is the configuration the component actually exists for. */
function MegaMenu() {
  return (
    // Named, because a `<nav>` landmark that shares a document with another one is only
    // distinguishable by its accessible name — axe's `landmark-unique` rule, and the reason
    // the open-panel scan below is run over the whole document.
    <NavigationMenu aria-label="Main">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/id">Qeet ID</NavigationMenuLink>
            <NavigationMenuLink href="/pay">Qeet Pay</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/guides">Guides</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const trigger = (name: string) => screen.getByRole("button", { name: new RegExp(name) });

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

/*
 * ── Disclosure behaviour ────────────────────────────────────────────────────────────────────
 *
 * The suite above renders a menu with no triggers at all, so it could not tell a working
 * disclosure from two static links — the defect `TEST-002` names. These tests drive the
 * disclosure: they open it, read the ARIA relationship it publishes, move between items, and
 * close it.
 *
 * The floating viewport is positioned by Base UI's collision logic, which needs real
 * measurements; jsdom reports every rect as zero, so *where* the popup lands is a browser
 * assertion (`TEST-001`). Presence, ownership and state are all observable here.
 */
describe("NavigationMenu disclosure", () => {
  it("starts closed, with the content absent from the tree", () => {
    render(<MegaMenu />);
    expect(trigger("Products")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Qeet ID" })).toBeNull();
  });

  it("opens the matching panel and only that panel", async () => {
    render(<MegaMenu />);
    fireEvent.click(trigger("Products"));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Qeet ID" })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Qeet Pay" })).toBeInTheDocument();
    // The other item's content must not come along for the ride.
    expect(screen.queryByRole("link", { name: "Guides" })).toBeNull();
    expect(trigger("Docs")).toHaveAttribute("aria-expanded", "false");
  });

  it("publishes the trigger→popup relationship while open", async () => {
    render(<MegaMenu />);
    const products = trigger("Products");
    fireEvent.click(products);

    await waitFor(() => expect(products).toHaveAttribute("aria-expanded", "true"));
    // `aria-controls` is what lets a screen reader user find the panel the trigger opened;
    // without it the popup is an unowned region somewhere else in the document.
    const controls = products.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(products).toHaveAttribute("data-popup-open");
  });

  it("closes when the same trigger is activated again", async () => {
    render(<MegaMenu />);
    const products = trigger("Products");
    fireEvent.click(products);
    await waitFor(() => expect(products).toHaveAttribute("aria-expanded", "true"));

    fireEvent.click(products);
    await waitFor(() => expect(products).toHaveAttribute("aria-expanded", "false"));
    await waitFor(() => expect(screen.queryByRole("link", { name: "Qeet ID" })).toBeNull());
  });

  it("moves the open panel when a different trigger is activated", async () => {
    render(<MegaMenu />);
    fireEvent.click(trigger("Products"));
    await waitFor(() => expect(screen.getByRole("link", { name: "Qeet ID" })).toBeInTheDocument());

    fireEvent.click(trigger("Docs"));
    // Exactly one panel is open at a time: the previous content has to go, or a mega-menu
    // accumulates every panel the user has ever hovered.
    await waitFor(() => expect(screen.getByRole("link", { name: "Guides" })).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Qeet ID" })).toBeNull();
    expect(trigger("Products")).toHaveAttribute("aria-expanded", "false");
    expect(trigger("Docs")).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on Escape", async () => {
    render(<MegaMenu />);
    const products = trigger("Products");
    fireEvent.click(products);
    await waitFor(() => expect(products).toHaveAttribute("aria-expanded", "true"));

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(products).toHaveAttribute("aria-expanded", "false"));
  });

  it("turns the trigger chevron with the open state", async () => {
    const { container } = render(<MegaMenu />);
    const chevron = container.querySelector('[data-slot="navigation-menu-trigger"] svg');
    // A state-driven class rather than a state-driven render: the rotation is expressed as
    // `group-data-popup-open:rotate-180`, so what is assertable is that the group hook and
    // the state attribute both exist. The turn itself is CSS — a browser assertion.
    expect(chevron?.getAttribute("class")).toContain("group-data-popup-open:rotate-180");
    expect(container.querySelector('[data-slot="navigation-menu-trigger"]')).toHaveClass("group");

    fireEvent.click(trigger("Products"));
    await waitFor(() =>
      expect(container.querySelector('[data-slot="navigation-menu-trigger"]')).toHaveAttribute(
        "data-popup-open",
      ),
    );
  });

  it("has no axe violations with a panel open", async () => {
    const { container, baseElement } = render(<MegaMenu />);
    fireEvent.click(trigger("Products"));
    await waitFor(() => expect(screen.getByRole("link", { name: "Qeet ID" })).toBeInTheDocument());
    // The popup is portalled, so the whole document has to be scanned, not just `container`.
    expect(container).toBeInTheDocument();
    expect(await a11y(baseElement)).toHaveNoViolations();
  });
});

describe("NavigationMenu current page", () => {
  function WithCurrent() {
    return (
      <NavigationMenu aria-label="Main">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink className={navigationMenuTriggerStyle()} href="/pricing" active>
              Pricing
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink className={navigationMenuTriggerStyle()} href="/customers">
              Customers
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );
  }

  it("announces the active link as the current page", () => {
    render(<WithCurrent />);
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Customers" })).not.toHaveAttribute("aria-current");
  });

  it("draws the current page in the Qeet selection tint, not the disabled opacity", () => {
    render(<WithCurrent />);
    const className = screen.getByRole("link", { name: "Pricing" }).getAttribute("class") ?? "";
    expect(className).toContain("data-[active]:bg-brand-subtle");
    expect(className).not.toContain("/disabled");
  });

  it("uses the foundation focus ring on triggers and links", () => {
    render(<MegaMenu />);
    const triggerClass = trigger("Products").getAttribute("class") ?? "";
    expect(triggerClass).toContain("focus-visible:focus-ring");
    expect(triggerClass).not.toContain("ring-ring/disabled");
    expect(navigationMenuTriggerStyle()).toContain("focus-visible:focus-ring");
  });

  it("caps the floating panel at the space available, so it stays on a phone's screen", async () => {
    render(<MegaMenu />);
    fireEvent.click(trigger("Products"));
    await waitFor(() =>
      expect(document.querySelector('[data-slot="navigation-menu-popup"]')).not.toBeNull(),
    );
    expect(document.querySelector('[data-slot="navigation-menu-popup"]')).toHaveClass(
      "max-w-(--available-width)",
    );
  });
});

describe("NavigationMenu trigger disabled (integration pass)", () => {
  it("dims on data-disabled: Base UI's trigger is focusableWhenDisabled, so :disabled never matches", () => {
    expect(navigationMenuTriggerStyle()).toContain("data-disabled:opacity-disabled");
    expect(navigationMenuTriggerStyle()).toContain("data-disabled:pointer-events-none");
  });

  it("paints the current page with the library forced-colours selection recipe", () => {
    expect(navigationMenuTriggerStyle()).toContain("data-[active]:forced-colors-selected");
  });
});
