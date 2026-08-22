import { render, screen } from "@testing-library/react";
import { SearchIcon } from "lucide-react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Icon } from "@/components/Icon/icon";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Icon", () => {
  it("is decorative (aria-hidden) at the default md size", () => {
    const { container } = render(<Icon icon={SearchIcon} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "20");
  });

  it("applies size and stroke tokens", () => {
    const { container } = render(<Icon icon={SearchIcon} size="lg" stroke="thin" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("stroke-width", "1.5");
  });

  it("exposes an accessible name when titled", () => {
    render(<Icon icon={SearchIcon} title="Search" />);
    expect(screen.getByRole("img", { name: "Search" })).toBeInTheDocument();
  });

  it("has no axe violations when labelled", async () => {
    const { container } = render(<Icon icon={SearchIcon} title="Search" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
