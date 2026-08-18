import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// color-contrast needs real layout/getComputedStyle, which jsdom can't provide,
// so disable just that rule; everything else (labels, roles, names) still runs.
async function a11y(container: Element) {
  return axe(container, { rules: { "color-contrast": { enabled: false } } });
}

describe("accessibility (axe)", () => {
  it("Button has no violations", async () => {
    const { container } = render(<Button>Save changes</Button>);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("Badge has no violations", async () => {
    const { container } = render(<Badge>New</Badge>);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("Alert has no violations", async () => {
    const { container } = render(
      <Alert variant="info">
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Your trial ends in 3 days.</AlertDescription>
      </Alert>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("a labelled form field has no violations", async () => {
    const { container } = render(
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" />
        </Field>
      </FieldGroup>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
