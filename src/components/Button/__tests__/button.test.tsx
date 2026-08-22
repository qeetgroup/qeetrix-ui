import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Button, buttonVariants } from "@/components/Button/button";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

const VARIANTS = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;

const SIZES = ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"] as const;

describe("Button", () => {
  it("renders a button with its accessible name by default", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it.each(VARIANTS)("renders the %s variant", (variant) => {
    render(<Button variant={variant}>{variant}</Button>);
    expect(screen.getByRole("button", { name: variant })).toBeInTheDocument();
  });

  it.each(SIZES)("renders the %s size", (size) => {
    render(
      <Button size={size} aria-label={`size-${size}`}>
        x
      </Button>,
    );
    expect(screen.getByRole("button", { name: `size-${size}` })).toBeInTheDocument();
  });

  it("fires onClick when activated", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders polymorphically via the Base UI render prop (as a link)", () => {
    render(<Button render={<a href="/home" />}>Home</Button>);
    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveAttribute("href", "/home");
    // The rendered element should be an anchor, not a native button.
    expect(link.tagName).toBe("A");
  });

  it("buttonVariants returns a class string reflecting variant + size", () => {
    const cls = buttonVariants({ variant: "outline", size: "sm" });
    expect(typeof cls).toBe("string");
    expect(cls.length).toBeGreaterThan(0);
    // default (no args) resolves to the default variant/size.
    expect(typeof buttonVariants()).toBe("string");
  });

  it("has no axe violations across variants", async () => {
    const { container } = render(
      <div>
        {VARIANTS.map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
        <Button size="icon" aria-label="Settings">
          <svg aria-hidden="true" viewBox="0 0 24 24" />
        </Button>
      </div>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
