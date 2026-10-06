import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/Breadcrumb/breadcrumb";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function Example() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Settings</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

describe("Breadcrumb", () => {
  it("is a labelled navigation landmark with a current page", () => {
    render(<Example />);
    expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Settings")).toHaveAttribute("aria-current", "page");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Example />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Breadcrumb collapsed items", () => {
  // The ellipsis span was `aria-hidden`, which hid its own "More" text too — so the button a
  // consumer wraps around it to reveal the collapsed crumbs had no accessible name.
  it("names a trigger wrapped around the ellipsis", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <button type="button">
              <BreadcrumbEllipsis />
            </button>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
  });

  it("has no axe violations with a collapsed-items trigger", async () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <button type="button">
              <BreadcrumbEllipsis />
            </button>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Breadcrumb truncation and separators", () => {
  it("lets every crumb shrink and truncate, so a single-line trail never overflows", () => {
    const { container } = render(<Example />);
    for (const item of container.querySelectorAll('[data-slot="breadcrumb-item"]')) {
      expect(item).toHaveClass("min-w-0");
    }
    expect(screen.getByRole("link", { name: "Home" })).toHaveClass("min-w-0", "truncate");
    expect(screen.getByText("Settings")).toHaveClass("min-w-0", "truncate");
  });

  it("gives links the foundation focus ring", () => {
    render(<Example />);
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("class")).toContain(
      "focus-visible:focus-ring",
    );
  });

  it("keeps separators out of the accessibility tree, mirrored, and unshrinkable", () => {
    const { container } = render(<Example />);
    const separator = container.querySelector('[data-slot="breadcrumb-separator"]');
    expect(separator).toHaveAttribute("aria-hidden", "true");
    expect(separator).toHaveClass("shrink-0");
    expect(separator?.querySelector("svg")?.getAttribute("class")).toContain("rtl:rotate-180");
  });
});
