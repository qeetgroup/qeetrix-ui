import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Field,
  FieldContent,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/inputs/field";
import { Input } from "@/components/inputs/input";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("Field", () => {
  it("renders as a group and associates its label with the control", () => {
    render(
      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input id="name" />
      </Field>,
    );
    expect(screen.getByRole("group")).toBeInTheDocument();
    // The label points at the input, so the input is reachable by its name.
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
  });

  it("renders a description", () => {
    render(
      <Field>
        <FieldLabel htmlFor="e">Email</FieldLabel>
        <Input id="e" aria-describedby="e-desc" />
        <FieldDescription id="e-desc">We never share it.</FieldDescription>
      </Field>,
    );
    expect(screen.getByText("We never share it.")).toBeInTheDocument();
  });

  it("automatically connects its control, description, and error", () => {
    render(
      <Field data-testid="field">
        <FieldLabel>Email</FieldLabel>
        <FieldControl render={<Input aria-describedby="external-hint" />} />
        <span id="external-hint">Use your work account.</span>
        <FieldDescription>We never share it.</FieldDescription>
        <FieldError>Email is required.</FieldError>
      </Field>,
    );

    const control = screen.getByRole("textbox", { name: "Email" });
    const label = screen.getByText("Email");
    const description = screen.getByText("We never share it.");
    const error = screen.getByRole("alert");
    const describedBy = control.getAttribute("aria-describedby")?.split(" ");

    expect(control.id).not.toBe("");
    expect(label).toHaveAttribute("for", control.id);
    expect(describedBy).toEqual(
      expect.arrayContaining(["external-hint", description.id, error.id]),
    );
    expect(control).toHaveAttribute("aria-errormessage", error.id);
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId("field")).toHaveAttribute("data-invalid", "true");
  });

  describe("FieldError", () => {
    it("renders children in an alert region", () => {
      render(<FieldError>This field is required</FieldError>);
      expect(screen.getByRole("alert")).toHaveTextContent("This field is required");
    });

    it("renders a single message from the errors prop", () => {
      render(<FieldError errors={[{ message: "Too short" }]} />);
      expect(screen.getByRole("alert")).toHaveTextContent("Too short");
    });

    it("de-duplicates identical error messages", () => {
      render(<FieldError errors={[{ message: "Required" }, { message: "Required" }]} />);
      const alert = screen.getByRole("alert");
      // Deduped to a single message => rendered as plain text, no list.
      expect(alert).toHaveTextContent("Required");
      expect(alert.querySelectorAll("li")).toHaveLength(0);
    });

    it("renders multiple distinct errors as a list", () => {
      render(<FieldError errors={[{ message: "Required" }, { message: "Too short" }]} />);
      const items = screen.getAllByRole("listitem");
      expect(items.map((i) => i.textContent)).toEqual(["Required", "Too short"]);
    });

    it("renders nothing when there are no errors and no children", () => {
      const { container } = render(<FieldError />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  it("renders a fieldset with a legend (FieldSet + FieldLegend)", () => {
    render(
      <FieldSet>
        <FieldLegend>Preferences</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="a">Alerts</FieldLabel>
            <Input id="a" />
          </Field>
        </FieldGroup>
      </FieldSet>,
    );
    // A <fieldset>/<legend> exposes a grouping with the legend as its name.
    expect(screen.getByRole("group", { name: "Preferences" })).toBeInTheDocument();
  });

  it("renders content + title composition slots", () => {
    render(
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>Marketing emails</FieldTitle>
          <FieldDescription>Occasional product news.</FieldDescription>
        </FieldContent>
      </Field>,
    );
    expect(screen.getByText("Marketing emails")).toBeInTheDocument();
    expect(screen.getByText("Occasional product news.")).toBeInTheDocument();
  });

  it("has no axe violations for a complete labelled field", async () => {
    const { container } = render(
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="full-name">Full name</FieldLabel>
          <Input id="full-name" aria-describedby="full-name-desc" />
          <FieldDescription id="full-name-desc">As it appears on your ID.</FieldDescription>
        </Field>
        <FieldSeparator>or</FieldSeparator>
        <Field>
          <FieldLabel htmlFor="nick">Nickname</FieldLabel>
          <Input id="nick" aria-invalid="true" aria-describedby="nick-err" />
          <FieldError>
            <span id="nick-err">Nickname is required</span>
          </FieldError>
        </Field>
      </FieldGroup>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
