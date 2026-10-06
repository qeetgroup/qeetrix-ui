import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  DescriptionDetails,
  DescriptionItem,
  DescriptionList,
  DescriptionTerm,
} from "@/components/DescriptionList/description-list";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function Example() {
  return (
    <DescriptionList>
      <DescriptionTerm>Email</DescriptionTerm>
      <DescriptionDetails>ada@example.com</DescriptionDetails>
      <DescriptionTerm>Role</DescriptionTerm>
      <DescriptionDetails>Admin</DescriptionDetails>
    </DescriptionList>
  );
}

describe("DescriptionList", () => {
  it("renders term/detail pairs", () => {
    render(<Example />);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Example />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("DescriptionList layouts", () => {
  const pairs = [
    ["Plan", "Enterprise"],
    ["Region", "ap-south-1"],
    ["Owner", "Ada Lovelace"],
  ];

  function Grouped(props: React.ComponentProps<typeof DescriptionList>) {
    return (
      <DescriptionList {...props}>
        {pairs.map(([term, details]) => (
          <DescriptionItem key={term}>
            <DescriptionTerm>{term}</DescriptionTerm>
            <DescriptionDetails>{details}</DescriptionDetails>
          </DescriptionItem>
        ))}
      </DescriptionList>
    );
  }

  it("defaults to the responsive two-column layout", () => {
    const { container } = render(<Example />);
    const list = container.querySelector("dl");
    expect(list).toHaveAttribute("data-layout", "horizontal");
    expect(list?.className).toContain("sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)]");
  });

  it("spaces pairs by the density's cell padding", () => {
    const { container } = render(<Example />);
    expect(container.querySelector("dl")?.className).toContain(
      "gap-y-(--qx-control-cell-padding-y)",
    );
  });

  it.each(["horizontal", "vertical", "grid"] as const)(
    "groups pairs in %s layout without breaking dl semantics",
    async (layout) => {
      const { container } = render(<Grouped layout={layout} divided />);
      expect(container.querySelector("dl")).toHaveAttribute("data-layout", layout);
      expect(container.querySelectorAll('dl > [data-slot="description-item"]')).toHaveLength(3);
      expect(await a11y(container)).toHaveNoViolations();
    },
  );

  it("rules between grouped pairs, not above the first", () => {
    const { container } = render(<Grouped divided />);
    const items = container.querySelectorAll('[data-slot="description-item"]');
    expect(items[0]).toHaveClass("border-t", "first:border-t-0");
    expect(container.querySelector("dl")).toHaveClass("gap-y-0");
  });

  it("lets a long value wrap instead of widening the page", () => {
    render(
      <DescriptionList>
        <DescriptionTerm>Tenant ID</DescriptionTerm>
        <DescriptionDetails>tnt_01J9ZQ8K4WQ2V6Y3M7H5X0RBEPF8D2C</DescriptionDetails>
      </DescriptionList>,
    );
    expect(screen.getByText("tnt_01J9ZQ8K4WQ2V6Y3M7H5X0RBEPF8D2C")).toHaveClass(
      "min-w-0",
      "wrap-break-word",
    );
  });

  it("keeps a consumer's column template", () => {
    const { container } = render(
      <DescriptionList className="sm:grid-cols-[minmax(6rem,9rem)_1fr]">
        <DescriptionTerm>Plan</DescriptionTerm>
        <DescriptionDetails>Enterprise</DescriptionDetails>
      </DescriptionList>,
    );
    const className = container.querySelector("dl")?.className ?? "";
    expect(className).toContain("sm:grid-cols-[minmax(6rem,9rem)_1fr]");
    expect(className).not.toContain("sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)]");
  });
});
