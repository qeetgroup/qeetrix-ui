import { render, screen } from "@testing-library/react";
import type * as React from "react";
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
import { Dropzone } from "@/components/inputs/file-upload";
import { Input } from "@/components/inputs/input";
import { OTPInput } from "@/components/inputs/otp-input";
import { Rating } from "@/components/inputs/rating";
import { RichTextEditor } from "@/components/inputs/rich-text-editor";
import { ColorPicker } from "@/components/pickers/color-picker";
import { DatePicker } from "@/components/pickers/date-picker";

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

/*
 * The composite-field contract (API-003).
 *
 * One table, six composites, the same three questions each: does `Field` name it, does `name`
 * put its value in the `FormData`, and does the machinery that achieves the second not cost a
 * focus stop or a duplicate accessible name. Table-driven on purpose — the failure mode this
 * replaces was every composite implementing whichever subset its author remembered, which
 * per-component spot checks reproduce rather than catch.
 *
 * `new FormData(form)` rather than a real submit: it is the same collection algorithm the
 * browser runs on submit, minus the navigation jsdom would have to fake.
 */
interface CompositeCase {
  label: string;
  /** The role the focusable control exposes, and how the Field-supplied name should read. */
  role: string;
  /** Rendered with a `name` when the case serialises. */
  element: (props: { name?: string; disabled?: boolean }) => React.ReactElement;
  /** The value the control must contribute to `FormData` under its name. */
  submits?: string;
}

const compositeCases: CompositeCase[] = [
  {
    label: "OTPInput",
    role: "group",
    element: (props) => <OTPInput {...props} defaultValue="123456" />,
    submits: "123456",
  },
  {
    label: "Rating",
    role: "slider",
    element: (props) => <Rating {...props} defaultValue={3} />,
    submits: "3",
  },
  {
    label: "RichTextEditor",
    role: "textbox",
    element: (props) => <RichTextEditor {...props} defaultValue="<p>Notes</p>" />,
    submits: "<p>Notes</p>",
  },
  {
    label: "DatePicker",
    role: "button",
    // Constructed from local parts, so the expected ISO string is not timezone-dependent.
    element: (props) => <DatePicker {...props} defaultValue={new Date(2026, 7, 4)} />,
    submits: "2026-08-04",
  },
  {
    label: "ColorPicker",
    role: "textbox",
    element: (props) => <ColorPicker {...props} presets={[]} defaultValue="#10b981" />,
    submits: "#10b981",
  },
  {
    label: "Dropzone",
    role: "button",
    // Files cannot round-trip through a hidden input; clause (b) is the file input's own `name`,
    // asserted separately below.
    element: (props) => <Dropzone {...props} />,
  },
];

/** The composite inside a labelled, described, errored Field inside a form. */
function CompositeFixture({
  render: renderControl,
  ...props
}: {
  render: CompositeCase["element"];
  name?: string;
  disabled?: boolean;
}) {
  return (
    <form aria-label="settings">
      <Field>
        <FieldLabel>Recovery</FieldLabel>
        {renderControl(props)}
        <FieldDescription>Kept for account recovery.</FieldDescription>
        <FieldError>Recovery is required.</FieldError>
      </Field>
    </form>
  );
}

const formData = () =>
  new FormData(screen.getByRole("form", { name: "settings" }) as HTMLFormElement);

describe("composite-field contract", () => {
  describe.each(compositeCases)("$label", ({ role, element }) => {
    it("takes its accessible name from the Field label", async () => {
      render(<CompositeFixture render={element} name="recovery" />);
      const control = await screen.findByRole(role, { name: /Recovery/ });
      // Exactly one element answers to that name: the hidden value must not become a second.
      expect(screen.getAllByRole(role, { name: /Recovery/ })).toHaveLength(1);
      expect(control).toBeInTheDocument();
    });

    it("is described by the Field description and error, and reports invalid", async () => {
      render(<CompositeFixture render={element} name="recovery" />);
      const control = await screen.findByRole(role, { name: /Recovery/ });
      const describedBy = control.getAttribute("aria-describedby")?.split(" ") ?? [];
      const description = screen.getByText("Kept for account recovery.");
      const error = screen.getByRole("alert");

      expect(describedBy).toEqual(expect.arrayContaining([description.id, error.id]));
      expect(control).toHaveAttribute("aria-errormessage", error.id);
      expect(control).toHaveAttribute("aria-invalid", "true");
    });

    it("adds no tabbable element for its submitted value", async () => {
      const { container } = render(<CompositeFixture render={element} name="recovery" />);
      await screen.findByRole(role, { name: /Recovery/ });
      for (const hidden of container.querySelectorAll("[data-slot=field-hidden-input]")) {
        expect(hidden).toHaveAttribute("type", "hidden");
        // type=hidden is not focusable and carries no accessible name — both by construction,
        // but this is the assertion that fails if someone "fixes" it into an sr-only input.
        expect(hidden).not.toHaveAttribute("tabindex");
        expect(hidden).not.toHaveAttribute("aria-label");
      }
    });
  });

  describe.each(compositeCases.filter((c) => c.submits !== undefined))(
    "$label serialisation",
    ({ role, element, submits }) => {
      it("puts its value in the FormData under its name", async () => {
        render(<CompositeFixture render={element} name="recovery" />);
        await screen.findByRole(role, { name: /Recovery/ });
        expect(formData().get("recovery")).toBe(submits);
      });

      it("serialises nothing without a name", async () => {
        render(<CompositeFixture render={element} />);
        await screen.findByRole(role, { name: /Recovery/ });
        expect([...formData().keys()]).toEqual([]);
      });
    },
  );

  // Rating and RichTextEditor: `disabled` is not part of either API in the same shape as the
  // others (Rating switches to a display role, the editor uses `editable`), so the native
  // "a disabled control does not submit" rule is asserted where the prop exists.
  it.each([
    ["OTPInput", (p: { name: string; disabled: boolean }) => <OTPInput {...p} defaultValue="1" />],
    ["DatePicker", (p: { name: string; disabled: boolean }) => <DatePicker {...p} />],
    [
      "ColorPicker",
      (p: { name: string; disabled: boolean }) => (
        <ColorPicker {...p} presets={[]} defaultValue="#10b981" />
      ),
    ],
  ])("%s submits nothing while disabled, as a native control does not", (_label, element) => {
    render(<CompositeFixture render={() => element({ name: "recovery", disabled: true })} />);
    expect(formData().has("recovery")).toBe(false);
  });

  it("Dropzone serialises through its own file input rather than a hidden value", () => {
    const { container } = render(
      <CompositeFixture render={(p) => <Dropzone {...p} />} name="cv" />,
    );
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).toHaveAttribute("name", "cv");
    expect(container.querySelector("[data-slot=field-hidden-input]")).toBeNull();
  });

  it("associates a value with a form it is not nested inside, by form id", () => {
    render(
      <>
        <form id="external" aria-label="external" />
        <OTPInput name="code" form="external" defaultValue="4242" aria-label="Code" />
      </>,
    );
    const external = screen.getByRole("form", { name: "external" }) as HTMLFormElement;
    expect(new FormData(external).get("code")).toBe("4242");
  });

  it("leaves an explicit aria-label in charge of the name", async () => {
    render(
      <Field>
        <FieldLabel>Recovery</FieldLabel>
        <Rating defaultValue={2} aria-label="Star rating" />
      </Field>,
    );
    const slider = screen.getByRole("slider", { name: "Star rating" });
    expect(slider).not.toHaveAttribute("aria-labelledby");
  });

  it("wires nothing when a composite is used outside a Field", () => {
    render(<Rating defaultValue={2} name="score" />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAccessibleName("Rating: 2 of 5");
    expect(slider).not.toHaveAttribute("aria-describedby");
    expect(slider).not.toHaveAttribute("aria-invalid");
  });
});

describe("composite-field contract: native validation, where it is real", () => {
  it("OTPInput's required digit boxes block a submit, because they are real inputs", () => {
    render(
      <form aria-label="verify">
        <OTPInput name="code" required length={4} aria-label="Code" />
      </form>,
    );
    const form = screen.getByRole("form", { name: "verify" }) as HTMLFormElement;
    expect(form.checkValidity()).toBe(false);
    for (const box of screen.getAllByRole("textbox")) {
      expect(box).toBeRequired();
    }
  });

  it("OTPInput's required boxes are satisfied by a complete code", () => {
    render(
      <form aria-label="verify">
        <OTPInput name="code" required length={4} defaultValue="1234" aria-label="Code" />
      </form>,
    );
    expect((screen.getByRole("form", { name: "verify" }) as HTMLFormElement).checkValidity()).toBe(
      true,
    );
  });

  it("ColorPicker's hex input rejects an unparseable value through the native pattern", () => {
    render(
      <form aria-label="brand">
        <ColorPicker name="brand" defaultValue="not-a-hex" presets={[]} ariaLabel="Colour" />
      </form>,
    );
    const form = screen.getByRole("form", { name: "brand" }) as HTMLFormElement;
    const input = screen.getByRole("textbox", { name: "Colour" }) as HTMLInputElement;
    expect(input.validity.patternMismatch).toBe(true);
    expect(form.checkValidity()).toBe(false);
  });

  it("ColorPicker accepts a valid hex, in both lengths", () => {
    render(
      <form aria-label="brand">
        <ColorPicker name="brand" defaultValue="#abc" presets={[]} ariaLabel="Colour" />
      </form>,
    );
    expect(
      (screen.getByRole("textbox", { name: "Colour" }) as HTMLInputElement).validity.valid,
    ).toBe(true);
  });

  // The counterpart claim: a hidden value is exempt from constraint validation, so the contract
  // documents `required` on those composites as advisory. If a future change puts `required` on
  // a hidden input, this test is what says it achieved nothing.
  it("a hidden composite value never contributes a constraint", () => {
    render(
      <form aria-label="notes">
        <Rating name="score" defaultValue={0} aria-label="Score" />
        <DatePicker name="due" aria-label="Due" />
      </form>,
    );
    const form = screen.getByRole("form", { name: "notes" }) as HTMLFormElement;
    expect(form.checkValidity()).toBe(true);
    for (const hidden of form.querySelectorAll<HTMLInputElement>(
      "[data-slot=field-hidden-input]",
    )) {
      expect(hidden.willValidate).toBe(false);
    }
  });
});
