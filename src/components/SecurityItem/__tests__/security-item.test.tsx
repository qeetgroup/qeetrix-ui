import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { Badge } from "@/components/Badge/badge";
import { Button } from "@/components/Button/button";
import { SecurityItem } from "@/components/SecurityItem/security-item";

const a11y = (container: Element) =>
  axe(container, { rules: { "color-contrast": { enabled: false } } });

describe("SecurityItem", () => {
  it("exposes status, details, and caller-owned actions", () => {
    render(
      <SecurityItem
        title="MacBook Pro"
        description="Current browser session"
        status="active"
        details={[
          { label: "Location", value: "Minneapolis, MN" },
          { label: "Last active", value: "Just now" },
        ]}
        actions={<Button variant="destructive">Revoke session</Button>}
      />,
    );

    expect(screen.getByRole("article", { name: "MacBook Pro" })).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Location").tagName).toBe("DT");
    expect(screen.getByText("Minneapolis, MN").tagName).toBe("DD");
    expect(screen.getByRole("button", { name: "Revoke session" })).toBeInTheDocument();
  });

  it("describes the article by its status, then its description", () => {
    render(<SecurityItem title="Deploy key" status="expired" description="Expired 3 days ago" />);
    expect(screen.getByRole("article", { name: "Deploy key" })).toHaveAccessibleDescription(
      "Expired Expired 3 days ago",
    );
  });

  it("raises warning and danger states with a tinted tile and an inline-start rule", () => {
    const { container, rerender } = render(
      <SecurityItem title="Deploy key" status="revoked" icon={<svg />} />,
    );
    const article = () => container.querySelector('[data-slot="security-item"]');
    const tile = () => container.querySelector('[data-slot="security-item-icon"]');
    expect(article()).toHaveAttribute("data-kind", "danger");
    expect(article()).toHaveClass("before:bg-destructive");
    expect(tile()).toHaveClass("bg-destructive-subtle", "text-destructive-text");

    rerender(<SecurityItem title="YubiKey" status="unverified" icon={<svg />} />);
    expect(article()).toHaveAttribute("data-kind", "warning");
    expect(tile()).toHaveClass("bg-warning-subtle");

    // A healthy credential stays graphite.
    rerender(<SecurityItem title="Passkey" status="active" icon={<svg />} />);
    expect(article()).toHaveAttribute("data-kind", "success");
    expect(article()?.className).not.toContain("before:bg-");
    expect(tile()).toHaveClass("bg-surface-sunken", "text-muted-foreground");
  });

  it("follows an explicit statusKind", () => {
    const { container } = render(
      <SecurityItem title="Token" status="rotating" statusKind="warning" />,
    );
    expect(container.querySelector('[data-slot="security-item"]')).toHaveAttribute(
      "data-kind",
      "warning",
    );
  });

  it("renders the title at the requested heading level and a badge beside it", () => {
    render(
      <SecurityItem
        title="MacBook Pro"
        headingLevel={4}
        badge={<Badge variant="brand">This device</Badge>}
      />,
    );
    expect(screen.getByRole("heading", { level: 4, name: "MacBook Pro" })).toBeInTheDocument();
    expect(screen.getByText("This device")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <>
        <SecurityItem title="Passkey" status="verified" description="Added August 18" />
        <SecurityItem
          title="Deploy key"
          status="expired"
          icon={<svg />}
          badge={<Badge variant="secondary">CI</Badge>}
          actions={<Button variant="destructive">Revoke</Button>}
        />
      </>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
