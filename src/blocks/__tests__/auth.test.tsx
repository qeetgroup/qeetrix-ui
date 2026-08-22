import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ForgotPasswordForm, LoginForm, SignupForm } from "@/blocks/auth";

/** Every `id` in the container, so duplicates are visible as duplicates. */
function ids(container: HTMLElement) {
  return [...container.querySelectorAll("[id]")].map((el) => el.id);
}

/** The control a `<label>` actually points at, resolved through the document. */
function labelTarget(label: HTMLElement) {
  const forAttr = label.getAttribute("for");
  return forAttr ? label.ownerDocument.getElementById(forAttr) : null;
}

describe("Auth block instance-scoped IDs", () => {
  it("gives two LoginForms disjoint control IDs", () => {
    const { container } = render(
      <>
        <LoginForm />
        <LoginForm />
      </>,
    );
    const all = ids(container);
    expect(all.length).toBeGreaterThan(0);
    expect(new Set(all).size).toBe(all.length);
    // The pre-fix implementation hard-coded id="email"/id="password".
    expect(container.querySelector("#email")).toBeNull();
    expect(container.querySelector("#password")).toBeNull();
  });

  it("associates each LoginForm label with its own instance's control", () => {
    const { container } = render(
      <>
        <LoginForm />
        <LoginForm />
      </>,
    );
    const forms = [...container.querySelectorAll("form")];
    expect(forms).toHaveLength(2);

    for (const form of forms) {
      for (const text of ["Email", "Password"]) {
        const label = [...form.querySelectorAll("label")].find((l) => l.textContent === text);
        expect(label, `${text} label in this form`).toBeDefined();
        const target = labelTarget(label as HTMLElement);
        expect(target).not.toBeNull();
        // The resolved control must live inside the *same* form, not the first one.
        expect(form.contains(target as Node)).toBe(true);
      }
    }
  });

  it("keeps the name attributes stable so form serialisation is unchanged", () => {
    const { container } = render(<LoginForm />);
    expect(container.querySelector('input[name="email"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="password"]')).toBeInTheDocument();
  });

  it("reports submitted values by name from either instance", () => {
    const values: Array<{ email: string; password: string }> = [];
    const { container } = render(
      <>
        <LoginForm onSubmit={(v) => values.push(v)} />
        <LoginForm onSubmit={(v) => values.push(v)} />
      </>,
    );
    const forms = [...container.querySelectorAll("form")];
    const second = forms[1] as HTMLFormElement;
    const email = second.querySelector('input[name="email"]') as HTMLInputElement;
    const password = second.querySelector('input[name="password"]') as HTMLInputElement;
    fireEvent.change(email, { target: { value: "b@example.com" } });
    fireEvent.change(password, { target: { value: "hunter2" } });
    fireEvent.submit(second);
    expect(values).toEqual([{ email: "b@example.com", password: "hunter2" }]);
  });

  it("gives two SignupForms disjoint control IDs and correct associations", () => {
    const { container } = render(
      <>
        <SignupForm showStrength={false} />
        <SignupForm showStrength={false} />
      </>,
    );
    const all = ids(container);
    expect(new Set(all).size).toBe(all.length);
    expect(container.querySelector("#name")).toBeNull();
    expect(container.querySelector("#signup-email")).toBeNull();
    expect(container.querySelector("#signup-password")).toBeNull();

    for (const form of container.querySelectorAll("form")) {
      for (const text of ["Name", "Email", "Password"]) {
        const label = [...form.querySelectorAll("label")].find((l) => l.textContent === text);
        expect(form.contains(labelTarget(label as HTMLElement) as Node)).toBe(true);
      }
    }
  });

  it("gives two ForgotPasswordForms disjoint control IDs", () => {
    const { container } = render(
      <>
        <ForgotPasswordForm />
        <ForgotPasswordForm />
      </>,
    );
    const all = ids(container);
    expect(new Set(all).size).toBe(all.length);
    expect(container.querySelector("#reset-email")).toBeNull();
    expect(screen.getAllByLabelText("Email")).toHaveLength(2);
  });
});
