import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { CodeBlock } from "@/components/ui/code-block";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("CodeBlock", () => {
  it("renders a caption and a copy button", () => {
    render(<CodeBlock value={'{"ok":true}'} language="json" caption="response.json" />);
    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    expect(screen.getByText("response.json")).toBeInTheDocument();
  });

  it("can hide the copy button", () => {
    render(<CodeBlock value="echo hi" language="shell" copy={false} />);
    expect(screen.queryByRole("button", { name: "Copy code" })).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<CodeBlock value={"line 1\nline 2"} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
