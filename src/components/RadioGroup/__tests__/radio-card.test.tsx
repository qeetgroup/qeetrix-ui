import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { RadioCard, RadioCardGroup } from "@/components/RadioGroup/radio-card";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("RadioCardGroup / RadioCard", () => {
  it("renders with radiogroup role", () => {
    render(
      <RadioCardGroup aria-label="Plan selection">
        <RadioCard value="starter">Starter</RadioCard>
        <RadioCard value="pro">Pro</RadioCard>
      </RadioCardGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Plan selection" })).toBeInTheDocument();
  });

  it("selecting a card fires onValueChange", () => {
    const onValueChange = vi.fn();
    render(
      <RadioCardGroup onValueChange={onValueChange}>
        <RadioCard value="starter">Starter</RadioCard>
        <RadioCard value="pro">Pro</RadioCard>
      </RadioCardGroup>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Pro" }));
    expect(onValueChange).toHaveBeenCalledWith("pro");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <RadioCardGroup aria-label="Role assignment">
        <RadioCard value="viewer">Viewer</RadioCard>
        <RadioCard value="editor">Editor</RadioCard>
      </RadioCardGroup>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("RadioCard selection and group state", () => {
  it("marks the chosen card, uncontrolled", () => {
    render(
      <RadioCardGroup aria-label="Plan" defaultValue="starter">
        <RadioCard value="starter">Starter</RadioCard>
        <RadioCard value="pro">Pro</RadioCard>
      </RadioCardGroup>,
    );
    const card = (name: string) => screen.getByText(name).closest("[data-slot=radio-card]");
    expect(card("Starter")).toHaveAttribute("data-checked");
    expect(card("Pro")).not.toHaveAttribute("data-checked");
    fireEvent.click(screen.getByText("Pro"));
    expect(card("Pro")).toHaveAttribute("data-checked");
    expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked();
  });

  it("keeps the native radio as the control, restyled — so roving and forms stay the browser's", () => {
    render(
      <RadioCardGroup aria-label="Plan" name="plan">
        <RadioCard value="starter">Starter</RadioCard>
        <RadioCard value="pro">Pro</RadioCard>
      </RadioCardGroup>,
    );
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.tagName).toBe("INPUT");
      expect(radio).toHaveAttribute("name", "plan");
      expect(radio.className).toMatch(/(^|\s)appearance-none(\s|$)/);
      // `accent-primary` drew a browser radio: white-on-orange, ~3:1, and unlike `Radio`.
      expect(radio.className).not.toMatch(/accent-primary/);
    }
  });

  it("disables every card from the group", () => {
    const onValueChange = vi.fn();
    render(
      <RadioCardGroup aria-label="Plan" disabled onValueChange={onValueChange}>
        <RadioCard value="starter">Starter</RadioCard>
        <RadioCard value="pro">Pro</RadioCard>
      </RadioCardGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Plan" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    fireEvent.click(screen.getByText("Pro"));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("makes the group required, browser-enforced on the native radios", () => {
    render(
      <RadioCardGroup aria-label="Plan" required>
        <RadioCard value="starter">Starter</RadioCard>
      </RadioCardGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Plan" })).toHaveAttribute(
      "aria-required",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Starter" })).toBeRequired();
  });

  it("passes aria-invalid to the group, which the cards read", async () => {
    const { container } = render(
      <RadioCardGroup aria-label="Plan" aria-invalid>
        <RadioCard value="starter">Starter</RadioCard>
      </RadioCardGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Plan" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    const card = screen.getByText("Starter").closest("[data-slot=radio-card]");
    expect(card?.className).toContain(
      "in-[[data-slot=radio-card-group][aria-invalid=true]]:border-(--qx-component-input-border-invalid)!",
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
