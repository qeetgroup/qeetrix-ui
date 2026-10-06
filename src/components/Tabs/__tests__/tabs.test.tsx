import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Tabs/tabs";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function Example() {
  return (
    <Tabs defaultValue="account">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account panel</TabsContent>
      <TabsContent value="password">Password panel</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("renders tab semantics and switches the active tab", () => {
    render(<Example />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Account" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "Password" }));
    expect(screen.getByRole("tab", { name: "Password" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Account" })).toHaveAttribute("aria-selected", "false");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Example />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

function Line({ orientation }: { orientation?: "horizontal" | "vertical" }) {
  return (
    <Tabs defaultValue="members" orientation={orientation}>
      <TabsList variant="line">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="audit" disabled>
          Audit
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Overview panel</TabsContent>
      <TabsContent value="members">Members panel</TabsContent>
      <TabsContent value="audit">Audit panel</TabsContent>
    </Tabs>
  );
}

const classOf = (name: string) => screen.getByRole("tab", { name }).getAttribute("class") ?? "";

describe("Tabs variants", () => {
  it("defaults to the contained treatment: a sunken well with a raised selected tab", () => {
    render(<Example />);
    expect(screen.getByRole("tablist")).toHaveAttribute("data-variant", "default");
    expect(screen.getByRole("tablist").getAttribute("class")).toContain("bg-surface-sunken");
    expect(classOf("Account")).toContain("data-[active]:bg-surface-elevated");
    // Semantic surfaces in both themes: no dark-only patch.
    expect(classOf("Account")).not.toContain("dark:");
  });

  it("draws the line treatment as a track with a Qeet indicator on the selected tab", () => {
    render(<Line />);
    expect(screen.getByRole("tablist")).toHaveAttribute("data-variant", "line");
    expect(screen.getByRole("tablist").getAttribute("class")).toContain(
      "data-[orientation=horizontal]:border-b",
    );
    expect(classOf("Members")).toContain("data-[active]:after:bg-border-brand");
    expect(classOf("Members")).toContain("forced-colors:data-[active]:after:bg-[Highlight]");
  });

  it("moves the line indicator to the inline-start track when vertical", () => {
    render(<Line orientation="vertical" />);
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
    expect(classOf("Members")).toContain("data-[orientation=vertical]:after:-inset-s-px");
  });

  it("scrolls an overflowing horizontal list instead of spilling out of its container", () => {
    render(<Example />);
    const className = screen.getByRole("tablist").getAttribute("class") ?? "";
    expect(className).toContain("data-[orientation=horizontal]:overflow-x-auto");
    expect(className).toContain("max-w-full");
  });

  it("uses the foundation focus recipes, not the alpha-borrowed ring", () => {
    const { container } = render(<Example />);
    expect(classOf("Account")).toContain("focus-visible:focus-ring-inset");
    expect(classOf("Account")).not.toContain("ring-ring/disabled");
    expect(container.querySelector('[data-slot="tabs-content"]')?.getAttribute("class")).toContain(
      "focus-visible:focus-ring",
    );
  });

  it("has no axe violations in the line treatment", async () => {
    const { container } = render(<Line />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

// Base UI marks a disabled tab with `aria-disabled` and `data-disabled`, never the native
// attribute — so the old `disabled:opacity-disabled` never matched and a disabled tab looked live.
describe("Tabs disabled state", () => {
  it("dims a disabled tab through the attribute Base UI actually sets", () => {
    render(<Line />);
    const audit = screen.getByRole("tab", { name: "Audit" });
    expect(audit).toHaveAttribute("aria-disabled", "true");
    expect(audit).toHaveAttribute("data-disabled");
    expect(audit.getAttribute("class")).toContain("data-disabled:opacity-disabled");
    expect(audit.getAttribute("class")).not.toMatch(/(^|\s)disabled:opacity-disabled/);
  });

  it("does not select a disabled tab", () => {
    render(<Line />);
    fireEvent.click(screen.getByRole("tab", { name: "Audit" }));
    expect(screen.getByRole("tab", { name: "Audit" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Members" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("Tabs keyboard", () => {
  it("moves focus with the arrow keys and activates on Enter", async () => {
    render(<Example />);
    const account = screen.getByRole("tab", { name: "Account" });
    account.focus();
    fireEvent.keyDown(account, { key: "ArrowRight" });
    const password = screen.getByRole("tab", { name: "Password" });
    await waitFor(() => expect(password).toHaveFocus());
    fireEvent.keyDown(password, { key: "Enter" });
    fireEvent.click(password);
    expect(password).toHaveAttribute("aria-selected", "true");
  });
});
