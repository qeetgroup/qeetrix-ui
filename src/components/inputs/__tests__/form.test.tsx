import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { Button } from "@/components/actions/button";
import {
  Form,
  FormActions,
  FormErrorSummary,
  focusFirstInvalidControl,
} from "@/components/inputs/form";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Form", () => {
  it("renders as a <form> element", () => {
    render(
      <Form aria-label="Settings form">
        <input aria-label="Name" />
      </Form>,
    );
    expect(screen.getByRole("form", { name: "Settings form" })).toBeInTheDocument();
  });

  it("passes through HTML form props", () => {
    const { container } = render(
      <Form aria-label="Test" noValidate>
        <input aria-label="Field" />
      </Form>,
    );
    expect(container.querySelector("form")).toHaveAttribute("novalidate");
  });

  it("renders FormActions with action buttons", () => {
    render(
      <Form aria-label="Actions form">
        <FormActions>
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </FormActions>
      </Form>,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders an error summary linked to invalid controls", () => {
    render(
      <>
        <FormErrorSummary
          errors={[
            { controlId: "email", message: "Enter an email address" },
            { controlId: "password", message: "Enter a password" },
          ]}
        />
        <input id="email" aria-label="Email" />
        <input id="password" aria-label="Password" />
      </>,
    );

    const summary = screen.getByRole("alert");
    expect(summary).toHaveAttribute("data-slot", "form-error-summary");
    expect(summary).toHaveTextContent("There is a problem");
    expect(screen.getByRole("link", { name: "Enter an email address" })).toHaveAttribute(
      "href",
      "#email",
    );
    expect(screen.getByRole("link", { name: "Enter a password" })).toHaveAttribute(
      "href",
      "#password",
    );
  });

  it("focuses the first enabled invalid control in document order", () => {
    render(
      <Form aria-label="Validation form">
        <input aria-label="Disabled invalid" aria-invalid="true" disabled />
        <input aria-label="First invalid" aria-invalid="true" />
        <input aria-label="Second invalid" aria-invalid="true" />
      </Form>,
    );

    const form = screen.getByRole<HTMLFormElement>("form", { name: "Validation form" });
    const target = focusFirstInvalidControl(form);

    expect(target).toBe(screen.getByRole("textbox", { name: "First invalid" }));
    expect(target).toHaveFocus();
  });

  it("focuses consumer-owned validation errors after an opted-in submit", async () => {
    const user = userEvent.setup();

    function ValidationForm() {
      const [invalid, setInvalid] = React.useState(false);

      return (
        <Form
          aria-label="Account form"
          focusInvalidOnSubmit
          onSubmit={(event) => {
            event.preventDefault();
            setInvalid(true);
          }}
        >
          <input aria-label="Email" aria-invalid={invalid} />
          <Button type="submit">Save</Button>
        </Form>
      );
    }

    render(<ValidationForm />);
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByRole("textbox", { name: "Email" })).toHaveFocus());
  });

  it("has no axe violations with an error summary", async () => {
    const { container } = render(
      <Form aria-label="Invalid account form">
        <FormErrorSummary errors={[{ controlId: "invalid-email", message: "Enter an email" }]} />
        <label htmlFor="invalid-email">Email</label>
        <input id="invalid-email" aria-invalid="true" aria-errormessage="invalid-email-error" />
        <span id="invalid-email-error" role="alert">
          Enter an email
        </span>
      </Form>,
    );

    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Form aria-label="Contact form">
        <label>
          Name
          <input type="text" name="name" />
        </label>
        <FormActions>
          <Button type="submit">Submit</Button>
        </FormActions>
      </Form>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
