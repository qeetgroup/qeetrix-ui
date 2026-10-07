import { QeetLogo as QeetMark } from "@qeetrix/icons";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QeetLogo, QeetLogoOnDark, QeetLogoOnLight } from "@/brand";

/** The `src` `@qeetrix/icons` renders for one file of the mark. */
const srcOf = (variant: "default" | "dark") =>
  render(<QeetMark variant={variant} />)
    .container.querySelector("img")
    ?.getAttribute("src");

describe("QeetLogo", () => {
  it("renders both files in auto mode and lets the .dark class pick one", () => {
    const { container } = render(<QeetLogo />);
    const [light, dark] = container.querySelectorAll("img");
    expect(light?.getAttribute("src")).toBe(srcOf("default"));
    expect(light).toHaveClass("dark:hidden");
    expect(dark?.getAttribute("src")).toBe(srcOf("dark"));
    expect(dark).toHaveClass("hidden", "dark:block");
  });

  it("forces one file with on-light and on-dark", () => {
    const onLight = render(<QeetLogo variant="on-light" />).container.querySelectorAll("img");
    expect(onLight).toHaveLength(1);
    expect(onLight[0]?.getAttribute("src")).toBe(srcOf("default"));
    const onDark = render(<QeetLogoOnDark />).container.querySelectorAll("img");
    expect(onDark).toHaveLength(1);
    expect(onDark[0]?.getAttribute("src")).toBe(srcOf("dark"));
  });

  it("is named Qeet by default and decorative with title={null}", () => {
    const named = render(<QeetLogoOnLight />).container.querySelector("img");
    expect(named).toHaveAttribute("alt", "Qeet");
    expect(named).not.toHaveAttribute("aria-hidden");
    const decorative = render(<QeetLogoOnLight title={null} />).container.querySelector("img");
    expect(decorative).toHaveAttribute("alt", "");
    expect(decorative).toHaveAttribute("aria-hidden", "true");
  });

  it("is a square of `size`, 32 by default", () => {
    const fallback = render(<QeetLogoOnLight />).container.querySelector("img");
    expect([fallback?.getAttribute("width"), fallback?.getAttribute("height")]).toEqual([
      "32",
      "32",
    ]);
    const sized = render(<QeetLogoOnLight size={20} />).container.querySelector("img");
    expect([sized?.getAttribute("width"), sized?.getAttribute("height")]).toEqual(["20", "20"]);
  });
});
