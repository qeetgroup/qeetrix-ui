import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/Accordion/collapsible";
import { Button } from "@/components/Button/button";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function Example() {
  return (
    <Collapsible>
      <CollapsibleTrigger>Details</CollapsibleTrigger>
      <CollapsibleContent>Hidden body</CollapsibleContent>
    </Collapsible>
  );
}

describe("Collapsible", () => {
  it("toggles expanded state from the trigger", () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Details" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Example />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("toggles from the keyboard and points the trigger at the open panel", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    const trigger = screen.getByRole("button", { name: "Details" });
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(trigger.getAttribute("aria-controls") ?? "");
    expect(panel).toHaveAttribute("data-slot", "collapsible-content");
    expect(panel).toHaveTextContent("Hidden body");
  });

  it("shares the accordion's panel motion, without clipping focus rings", () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Details</CollapsibleTrigger>
        <CollapsibleContent>
          <button type="button">Edit</button>
        </CollapsibleContent>
      </Collapsible>,
    );
    const panel = document.querySelector("[data-slot='collapsible-content']") as HTMLElement;
    expect(panel.className).toContain("h-(--collapsible-panel-height)");
    expect(panel.className).toContain("duration-(--qx-component-accordion-duration)");
    expect(panel.className).not.toMatch(/(^|\s)overflow-hidden(\s|$)/);
  });

  it("lets a consumer opt out of the motion", () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Details</CollapsibleTrigger>
        <CollapsibleContent className="transition-none">Body</CollapsibleContent>
      </Collapsible>,
    );
    const panel = document.querySelector("[data-slot='collapsible-content']") as HTMLElement;
    expect(panel).toHaveClass("transition-none");
    expect(panel).not.toHaveClass("transition-[height]");
  });

  it("composes a styled trigger through render", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger render={<Button variant="ghost" />}>More filters</CollapsibleTrigger>
        <CollapsibleContent>Body</CollapsibleContent>
      </Collapsible>,
    );
    const trigger = screen.getByRole("button", { name: "More filters" });
    expect(trigger).toHaveAttribute("data-slot", "collapsible-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
