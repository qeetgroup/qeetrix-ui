import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Spoiler } from "@/components/ui/spoiler";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("Spoiler", () => {
  it("toggles expanded state and label", () => {
    render(
      <Spoiler maxLines={2}>
        <p>Long content that would be clamped to two lines until expanded.</p>
      </Spoiler>,
    );
    const toggle = screen.getByRole("button", { name: "Show more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("wires the toggle to the content region via aria-controls", () => {
    render(
      <Spoiler maxLines={2}>
        <p>Clamped content.</p>
      </Spoiler>,
    );
    const toggle = screen.getByRole("button", { name: "Show more" });
    const controls = toggle.getAttribute("aria-controls") ?? "";
    expect(controls).not.toBe("");
    expect(document.getElementById(controls)).toHaveAttribute("data-slot", "spoiler-content");
  });

  it("has no axe violations when collapsed and expanded", async () => {
    const { container } = render(
      <Spoiler maxLines={2}>
        <p>Long content that would be clamped to two lines until expanded.</p>
      </Spoiler>,
    );
    expect(await a11y(container)).toHaveNoViolations();

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(await a11y(container)).toHaveNoViolations();
  });
});
