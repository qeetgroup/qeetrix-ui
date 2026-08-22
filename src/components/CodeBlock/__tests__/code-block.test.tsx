import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { PALETTE_UTILITY } from "@/__tests__/palette-utility";
import { CodeBlock } from "@/components/CodeBlock/code-block";

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

  // The highlighter used named Tailwind palette classes (text-sky-700 dark:text-sky-400 …),
  // which check:token-usage could not see: the palette is not published to the runtime
  // stylesheet, so no brand theme, forced-colors mapping or contrast pair could reach them.
  // Assert the emitted class attributes, not the render — that is the byte that was wrong.
  it("colours JSON through semantic syntax roles, never the Tailwind palette", () => {
    const { container } = render(
      <CodeBlock value={'{"id":1,"name":"Ada","ok":true}'} language="json" />,
    );
    const classes = [...container.querySelectorAll("[class]")]
      .map((el) => el.getAttribute("class") ?? "")
      .join(" ");

    expect(classes).toContain("text-syntax-key");
    expect(classes).toContain("text-syntax-string");
    expect(classes).toContain("text-syntax-number");
    expect(classes).toContain("text-syntax-literal");
    expect(classes).not.toMatch(PALETTE_UTILITY);
  });

  it("marks the copied confirmation with the success role", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    const { container } = render(<CodeBlock value="echo hi" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await screen.findByRole("button", { name: "Copied" });

    const classes = [...container.querySelectorAll("[class]")]
      .map((el) => el.getAttribute("class") ?? "")
      .join(" ");
    expect(classes).toContain("text-success");
    expect(classes).not.toMatch(PALETTE_UTILITY);

    vi.unstubAllGlobals();
  });
});
