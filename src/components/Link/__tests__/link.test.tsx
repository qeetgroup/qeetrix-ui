import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Link, linkVariants } from "@/components/Link/link";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Link", () => {
  it("renders as an anchor element", () => {
    render(<Link href="https://example.com">Visit site</Link>);
    const link = screen.getByRole("link", { name: "Visit site" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("forwards data-slot attribute", () => {
    render(<Link href="#">Docs</Link>);
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("data-slot", "link");
  });

  it("applies variant classes", () => {
    render(
      <Link href="#" variant="destructive">
        Delete
      </Link>,
    );
    const link = screen.getByRole("link", { name: "Delete" });
    expect(link.className).toMatch(/text-destructive/);
    // Text role, not the bridge fill colour.
    expect(link).toHaveClass("text-destructive-text");
  });

  it("applies underline=always class", () => {
    render(
      <Link href="#" underline="always">
        Terms
      </Link>,
    );
    const link = screen.getByRole("link", { name: "Terms" });
    expect(link.className).toMatch(/underline/);
  });

  it("merges custom className", () => {
    render(
      <Link href="#" className="custom-class">
        Custom
      </Link>,
    );
    const link = screen.getByRole("link", { name: "Custom" });
    expect(link).toHaveClass("custom-class");
  });

  it("uses the link text role and the foundation focus recipe", () => {
    render(<Link href="#">Settings</Link>);
    const link = screen.getByRole("link", { name: "Settings" });
    expect(link).toHaveClass("text-link", "hover:text-link-hover", "focus-visible:focus-ring");
    expect(link.className).not.toMatch(/\btext-primary\b/);
    expect(link.className).not.toMatch(/ring-ring/);
  });

  it("forwards a ref to the anchor", () => {
    const ref = React.createRef<HTMLAnchorElement>();
    render(
      <Link ref={ref} href="#">
        Ref
      </Link>,
    );
    expect(ref.current?.tagName).toBe("A");
  });

  describe("standalone and inline layout", () => {
    it("is a hover-underlined inline-flex link by default", () => {
      render(<Link href="#">View all</Link>);
      const link = screen.getByRole("link", { name: "View all" });
      expect(link).toHaveClass("inline-flex", "hover:underline", "text-base");
    });

    it("lays out inline, inherits the sentence size and underlines at rest when `inline`", () => {
      render(
        <p>
          Read the{" "}
          <Link inline href="#guide">
            guide
          </Link>
          .
        </p>,
      );
      const link = screen.getByRole("link", { name: "guide" });
      expect(link).toHaveClass("inline", "underline");
      expect(link).not.toHaveClass("inline-flex");
      // No forced size: an inline link matches the text it sits in.
      expect(link.className).not.toMatch(/\btext-(sm|base|lg)\b/);
    });

    it("still honours an explicit size and underline on an inline link", () => {
      render(
        <Link inline size="sm" underline="hover" href="#">
          Small
        </Link>,
      );
      const link = screen.getByRole("link", { name: "Small" });
      expect(link).toHaveClass("text-sm", "hover:underline");
      expect(link).not.toHaveClass("underline");
    });

    it("exposes the inline axis through linkVariants", () => {
      expect(linkVariants({ inline: true })).toContain("inline");
      expect(linkVariants()).toContain("inline-flex");
    });
  });

  describe("external", () => {
    it("opens in a new tab safely and says so", () => {
      render(
        <Link external href="https://status.qeet.in">
          Status page
        </Link>,
      );
      // Chromium names it "Status page (opens in a new tab)"; jsdom's name computation drops
      // the space at the element boundary, so the separator is optional here.
      const link = screen.getByRole("link", { name: /^Status page ?\(opens in a new tab\)$/ });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveAttribute("data-external");
      const icon = link.querySelector('[data-slot="link-external-icon"]');
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("merges a consumer rel and translates the announcement", () => {
      render(
        <Link external rel="sponsored" externalLabel="(nouvel onglet)" href="https://x.test">
          Partenaire
        </Link>,
      );
      const link = screen.getByRole("link", { name: /^Partenaire ?\(nouvel onglet\)$/ });
      expect(link.getAttribute("rel")?.split(" ").sort()).toEqual([
        "noopener",
        "noreferrer",
        "sponsored",
      ]);
    });

    it("does not announce a new tab when the consumer keeps the same tab", () => {
      render(
        <Link external target="_self" href="https://x.test">
          Same tab
        </Link>,
      );
      expect(screen.getByRole("link", { name: "Same tab" })).toHaveAttribute("target", "_self");
    });
  });

  describe("disabled", () => {
    it("removes the destination and the tab stop but stays discoverable", () => {
      const onClick = vi.fn();
      render(
        <Link disabled href="/billing" onClick={onClick}>
          Billing
        </Link>,
      );
      const link = screen.getByRole("link", { name: "Billing" });
      expect(link).not.toHaveAttribute("href");
      expect(link).toHaveAttribute("aria-disabled", "true");
      expect(link).toHaveAttribute("tabindex", "-1");
      fireEvent.click(link);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("render composition", () => {
    function RouterLink({ to, ...props }: React.ComponentProps<"a"> & { to: string }) {
      return <a data-router="" href={`/app${to}`} {...props} />;
    }

    it("styles a router link with Qeet link styling and behaviour", () => {
      render(<Link render={<RouterLink to="/settings" />}>Settings</Link>);
      const link = screen.getByRole("link", { name: "Settings" });
      expect(link).toHaveAttribute("data-router");
      expect(link).toHaveAttribute("href", "/app/settings");
      expect(link).toHaveAttribute("data-slot", "link");
      expect(link).toHaveClass("text-link", "focus-visible:focus-ring");
    });
  });

  it("has no axe violations", async () => {
    const { container } = render(<Link href="https://example.com">Learn more</Link>);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations for inline, external and disabled links", async () => {
    const { container } = render(
      <p>
        See the{" "}
        <Link inline href="#a">
          guide
        </Link>
        , the{" "}
        <Link inline external href="https://x.test">
          status page
        </Link>{" "}
        or{" "}
        <Link inline disabled href="#b">
          billing
        </Link>
        .
      </p>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
