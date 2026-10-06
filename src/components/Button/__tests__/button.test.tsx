import { fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
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

describe("Button interaction language", () => {
  it("focuses with the foundation ring, never the legacy box-shadow halo", () => {
    for (const variant of VARIANTS) {
      const cls = buttonVariants({ variant });
      expect(cls).toContain("focus-visible:focus-ring");
      expect(cls).not.toContain("ring-ring/disabled");
      // The disabled opacity token is for disabled things only.
      expect(cls).not.toMatch(/\/disabled\b/);
    }
  });

  it("walks the neutral surface ladder for secondary, outline and ghost", () => {
    expect(buttonVariants({ variant: "secondary" })).toContain("bg-surface-interactive");
    expect(buttonVariants({ variant: "secondary" })).toContain(
      "hover:bg-surface-interactive-hover",
    );
    for (const variant of ["outline", "ghost"] as const) {
      expect(buttonVariants({ variant })).toContain("hover:bg-surface-interactive-hover");
      expect(buttonVariants({ variant })).toContain("active:bg-surface-interactive-active");
    }
  });

  it("presses the primary with the semantic active tone", () => {
    expect(buttonVariants({ variant: "default" })).toContain(
      "active:bg-(--qx-component-button-primary-background-active)",
    );
  });

  it("keeps destructive labels on AA-safe pairs: subtle at rest, solid on intent", () => {
    const cls = buttonVariants({ variant: "destructive" });
    expect(cls).toContain("bg-destructive-subtle text-destructive-text");
    expect(cls).toContain("hover:bg-destructive hover:text-destructive-foreground");
    // The /20 and /30 tints put the label under 4.5:1 in both themes.
    expect(cls).not.toMatch(/bg-destructive\/\d/);
  });

  it("exposes its variant for styling hooks", () => {
    render(<Button variant="outline">Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "data-variant",
      "outline",
    );
  });
});

describe("Button loading", () => {
  it("reports busy, blocks activation and keeps the label as its name", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save changes
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Save changes" });
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toHaveAttribute("data-loading");
    expect(btn).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps focus: it is aria-disabled, not natively disabled", () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).not.toBeDisabled();
    btn.focus();
    expect(btn).toHaveFocus();
  });

  it("stays focusable when the consumer also passes disabled", () => {
    render(
      <Button loading disabled>
        Save
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveAttribute("aria-disabled", "true");
  });

  it("lets an explicit focusableWhenDisabled={false} restore native disabled", () => {
    render(
      <Button loading focusableWhenDisabled={false}>
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("does not submit its form while loading", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" loading>
          Submit
        </Button>
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders a decorative spinner in the leading slot", () => {
    const { container } = render(<Button loading>Save</Button>);
    const spinner = container.querySelector('[data-slot="button-spinner"]');
    expect(spinner).not.toBeNull();
    expect(spinner).toHaveAttribute("aria-hidden", "true");
    expect(spinner).toHaveAttribute("data-icon", "inline-start");
  });

  it("swaps a leading icon for the spinner, so the width does not change", () => {
    const { container } = render(
      <Button loading>
        <svg data-testid="lead" data-icon="inline-start" aria-hidden />
        Save
      </Button>,
    );
    expect(screen.queryByTestId("lead")).toBeNull();
    expect(container.querySelectorAll('[data-slot="button-spinner"]')).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("treats an aria-hidden first child as the leading icon", () => {
    render(
      <Button loading>
        <svg data-testid="lead" aria-hidden="true" />
        Save
      </Button>,
    );
    expect(screen.queryByTestId("lead")).toBeNull();
  });

  it("keeps a trailing icon", () => {
    render(
      <Button loading>
        Options
        <svg data-testid="trail" data-icon="inline-end" aria-hidden />
      </Button>,
    );
    expect(screen.getByTestId("trail")).toBeInTheDocument();
  });

  it("shows loadingLabel as the name while reserving the resting label's width", () => {
    const { container } = render(
      <Button loading loadingLabel="Saving…">
        Save changes
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Saving…" })).toBeInTheDocument();
    const stack = container.querySelector('[data-slot="button-loading-label"]');
    // The resting label is still laid out (it holds the width) but hidden from AT.
    const resting = stack?.querySelector('[aria-hidden="true"]');
    expect(resting).toHaveTextContent("Save changes");
    expect(resting).toHaveClass("invisible");
  });

  it("drops back to its label when loading ends", () => {
    const { rerender } = render(
      <Button loading loadingLabel="Saving…">
        Save changes
      </Button>,
    );
    rerender(<Button loadingLabel="Saving…">Save changes</Button>);
    const btn = screen.getByRole("button", { name: "Save changes" });
    expect(btn).not.toHaveAttribute("aria-busy");
    expect(btn).not.toHaveAttribute("aria-disabled");
  });

  it("keeps an icon-only button's aria-label and ignores loadingLabel", () => {
    const { container } = render(
      <Button size="icon" aria-label="Refresh" loading loadingLabel="Refreshing">
        <svg aria-hidden />
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="button-loading-label"]')).toBeNull();
  });

  it("has no axe violations while loading", async () => {
    const { container } = render(
      <div>
        <Button loading>Save</Button>
        <Button loading loadingLabel="Saving…" variant="outline">
          Save
        </Button>
        <Button size="icon" aria-label="Refresh" loading>
          <svg aria-hidden="true" viewBox="0 0 24 24" />
        </Button>
      </div>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Button press", () => {
  // A `translate-y-px` press nudge rewrote --tw-translate-y, so an absolutely positioned button
  // centred with `-translate-y-1/2` (a carousel arrow, an input adornment) jumped on press.
  it("presses without a transform, so a consumer's own translate survives", () => {
    for (const variant of VARIANTS) {
      expect(buttonVariants({ variant })).not.toMatch(/active:[^\s]*translate/);
    }
    expect(buttonVariants()).toContain("active:shadow-none");
  });
});
