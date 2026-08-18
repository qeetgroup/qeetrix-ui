import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { Button } from "@/components/ui/button";
import { SecurityItem } from "@/components/ui/security-item";

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

  it("has no axe violations", async () => {
    const { container } = render(
      <SecurityItem title="Passkey" status="verified" description="Added August 18" />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});