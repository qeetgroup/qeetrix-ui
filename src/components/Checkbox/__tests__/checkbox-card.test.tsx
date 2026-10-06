import { CheckboxGroup as CheckboxGroupPrimitive } from "@base-ui/react/checkbox-group";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CheckboxCard, CheckboxCardGroup } from "@/components/Checkbox/checkbox-card";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("CheckboxCard", () => {
  it("renders children", () => {
    render(
      <CheckboxCardGroup>
        <CheckboxCard value="plan-pro">Pro plan</CheckboxCard>
      </CheckboxCardGroup>,
    );
    expect(screen.getByText("Pro plan")).toBeInTheDocument();
  });

  it("clicking fires onCheckedChange", () => {
    const onCheckedChange = vi.fn();
    render(
      <CheckboxCard value="feature-x" onCheckedChange={onCheckedChange}>
        Feature X
      </CheckboxCard>,
    );
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <CheckboxCardGroup>
        <CheckboxCard value="option-a">Option A</CheckboxCard>
        <CheckboxCard value="option-b">Option B</CheckboxCard>
      </CheckboxCardGroup>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("CheckboxCard selection", () => {
  // The selected look used to be driven by the `checked` prop alone, so an uncontrolled card
  // (`defaultChecked`) or one inside a CheckboxGroup never looked selected. It now keys off the
  // checkbox's own data-checked, via :has().
  it("an uncontrolled card reflects its state, and the styling keys off the checkbox", () => {
    render(
      <CheckboxCard value="sso" defaultChecked>
        Single sign-on
      </CheckboxCard>,
    );
    const card = screen.getByText("Single sign-on").closest("[data-slot=checkbox-card]");
    const box = screen.getByRole("checkbox", { name: "Single sign-on" });
    expect(box).toHaveAttribute("data-checked");
    expect(card?.className).toContain("has-[[data-slot=checkbox][data-checked]]:bg-brand-subtle");
    fireEvent.click(box);
    expect(box).toHaveAttribute("data-unchecked");
  });

  it("is named by its content, so the whole card is the label", () => {
    render(<CheckboxCard value="audit">Audit log export</CheckboxCard>);
    expect(screen.getByRole("checkbox", { name: "Audit log export" })).toBeInTheDocument();
  });

  it("toggles when the card body is clicked", () => {
    const onCheckedChange = vi.fn();
    render(
      <CheckboxCard value="scim" onCheckedChange={onCheckedChange}>
        <span>SCIM provisioning</span>
      </CheckboxCard>,
    );
    fireEvent.click(screen.getByText("SCIM provisioning"));
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it("participates in a CheckboxGroup by value", () => {
    render(
      <CheckboxGroupPrimitive defaultValue={["b"]}>
        <CheckboxCard value="a">Alpha</CheckboxCard>
        <CheckboxCard value="b">Beta</CheckboxCard>
      </CheckboxGroupPrimitive>,
    );
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("checkbox", { name: "Beta" })).toHaveAttribute("aria-checked", "true");
  });

  it("submits its value under `name`", () => {
    render(
      <form aria-label="features">
        <CheckboxCard value="sso" name="features" defaultChecked>
          Single sign-on
        </CheckboxCard>
      </form>,
    );
    const data = new FormData(screen.getByRole("form", { name: "features" }) as HTMLFormElement);
    expect(data.getAll("features")).toEqual(["sso"]);
  });

  it("forwards invalid, required and description wiring to the checkbox", () => {
    render(
      <>
        <CheckboxCard value="terms" required aria-invalid aria-describedby="terms-error">
          Accept the terms
        </CheckboxCard>
        <p id="terms-error">You must accept the terms.</p>
      </>,
    );
    const box = screen.getByRole("checkbox", { name: "Accept the terms" });
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAccessibleDescription("You must accept the terms.");
    expect(box).toHaveAttribute("aria-required", "true");
  });

  it("marks a disabled card and blocks the change", () => {
    const onCheckedChange = vi.fn();
    render(
      <CheckboxCard value="x" disabled onCheckedChange={onCheckedChange}>
        Disabled option
      </CheckboxCard>,
    );
    const card = screen.getByText("Disabled option").closest("[data-slot=checkbox-card]");
    expect(card).toHaveAttribute("data-disabled");
    fireEvent.click(screen.getByText("Disabled option"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("has no axe violations when checked, invalid and disabled", async () => {
    const { container } = render(
      <CheckboxCardGroup>
        <CheckboxCard value="a" defaultChecked>
          Checked
        </CheckboxCard>
        <CheckboxCard value="b" aria-invalid>
          Invalid
        </CheckboxCard>
        <CheckboxCard value="c" disabled>
          Disabled
        </CheckboxCard>
      </CheckboxCardGroup>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
