import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Textarea } from "@/components/Input/textarea";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Textarea", () => {
  it("accepts input", () => {
    render(<Textarea aria-label="Bio" />);
    const ta = screen.getByRole("textbox", { name: "Bio" });
    fireEvent.change(ta, { target: { value: "hello" } });
    expect(ta).toHaveValue("hello");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Textarea aria-label="Bio" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
