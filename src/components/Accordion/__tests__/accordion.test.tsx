import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/Accordion/accordion";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function Example() {
  return (
    <Accordion>
      <AccordionItem value="a">
        <AccordionTrigger>Shipping</AccordionTrigger>
        <AccordionContent>Ships in 2–3 days.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Returns</AccordionTrigger>
        <AccordionContent>30-day returns.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion", () => {
  it("expands a section on trigger click", () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Shipping" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Example />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Accordion keyboard and focus", () => {
  it("is reached with Tab and toggled with Enter and Space", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    const shipping = screen.getByRole("button", { name: "Shipping" });
    expect(shipping).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(shipping).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(shipping).toHaveAttribute("aria-expanded", "false");
  });

  it("uses the Qeet focus ring rather than the legacy translucent halo", () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Shipping" });
    expect(trigger.className).toContain("focus-visible:focus-ring");
    expect(trigger.className).not.toMatch(/ring-ring\/disabled|hover:underline/);
  });

  it("wires the open panel to its trigger and names it from the trigger", () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Shipping" });
    fireEvent.click(trigger);
    const panelId = trigger.getAttribute("aria-controls") ?? "";
    const panel = document.getElementById(panelId);
    expect(panel).toHaveAttribute("data-slot", "accordion-content");
    expect(panel).toHaveTextContent("Ships in 2–3 days.");
  });

  it("keeps a disabled item out of reach", async () => {
    const user = userEvent.setup();
    render(
      <Accordion>
        <AccordionItem value="a" disabled>
          <AccordionTrigger>Locked</AccordionTrigger>
          <AccordionContent>Hidden</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Open</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const locked = screen.getByRole("button", { name: "Locked" });
    await user.click(locked);
    expect(locked).toHaveAttribute("aria-expanded", "false");
    expect(locked.className).toContain("data-disabled:opacity-disabled");
  });
});

describe("Accordion panel", () => {
  it("animates height from Base UI's measurement and does not clip focus rings with overflow", () => {
    render(
      <Accordion defaultValue={["a"]}>
        <AccordionItem value="a">
          <AccordionTrigger>Shipping</AccordionTrigger>
          <AccordionContent>
            <button type="button">Track</button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const panel = document.querySelector("[data-slot='accordion-content']") as HTMLElement;
    expect(panel.className).toContain("h-(--accordion-panel-height)");
    expect(panel.className).toContain("transition-[height]");
    // `overflow-hidden` cut the ring of any control flush with the panel's edge.
    expect(panel.className).not.toMatch(/(^|\s)overflow-hidden(\s|$)/);
    expect(panel.className).toContain("flow-root");
  });

  it("sets panel content in primary text, not muted", () => {
    render(
      <Accordion defaultValue={["a"]}>
        <AccordionItem value="a">
          <AccordionTrigger>Shipping</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const panel = document.querySelector("[data-slot='accordion-content']") as HTMLElement;
    expect(panel).toHaveClass("text-foreground");
    expect(panel).not.toHaveClass("text-muted-foreground");
  });

  it("keeps nested accordions independent", () => {
    render(
      <Accordion defaultValue={["outer"]}>
        <AccordionItem value="outer">
          <AccordionTrigger>Directory sync</AccordionTrigger>
          <AccordionContent>
            <Accordion>
              <AccordionItem value="inner">
                <AccordionTrigger>SCIM</AccordionTrigger>
                <AccordionContent>Token rotation</AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const outer = screen.getByRole("button", { name: "Directory sync" });
    const inner = screen.getByRole("button", { name: "SCIM" });
    fireEvent.click(inner);
    expect(inner).toHaveAttribute("aria-expanded", "true");
    expect(outer).toHaveAttribute("aria-expanded", "true");
    act(() => {
      fireEvent.click(inner);
    });
    expect(inner).toHaveAttribute("aria-expanded", "false");
    expect(outer).toHaveAttribute("aria-expanded", "true");
  });

  it("marks the indicator decorative", () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Shipping" });
    const indicator = trigger.querySelector("[data-slot='accordion-indicator']");
    expect(indicator).toHaveAttribute("aria-hidden", "true");
  });

  it("has no axe violations with a nested, open accordion", async () => {
    const { container } = render(
      <Accordion defaultValue={["outer"]}>
        <AccordionItem value="outer">
          <AccordionTrigger>Directory sync</AccordionTrigger>
          <AccordionContent>
            <Accordion defaultValue={["inner"]}>
              <AccordionItem value="inner">
                <AccordionTrigger>SCIM</AccordionTrigger>
                <AccordionContent>Token rotation</AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
