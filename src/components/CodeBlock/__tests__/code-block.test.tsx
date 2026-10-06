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

describe("CodeBlock highlighting", () => {
  const roleOf = (container: HTMLElement, text: string) =>
    Array.from(container.querySelectorAll("[data-slot=code-block-line] span span")).find(
      (el) => el.textContent === text,
    )?.className;

  it("colours JSON punctuation and comments through their own roles", () => {
    const { container } = render(
      <CodeBlock value={'{\n  // note\n  "a": [1, true]\n}'} language="json" />,
    );
    expect(roleOf(container, "{")).toBe("text-syntax-punctuation");
    expect(roleOf(container, "// note")).toBe("text-syntax-comment");
    expect(roleOf(container, '"a"')).toBe("text-syntax-key");
    expect(roleOf(container, "true")).toBe("text-syntax-literal");
  });

  it("highlights shell comments, flags, strings and variables", () => {
    const { container } = render(
      <CodeBlock
        value={'# fetch\ncurl -H "Accept: json" https://x.qeet.in/#frag $TOKEN'}
        language="shell"
      />,
    );
    expect(roleOf(container, "# fetch")).toBe("text-syntax-comment");
    expect(roleOf(container, "-H")).toBe("text-syntax-key");
    expect(roleOf(container, '"Accept: json"')).toBe("text-syntax-string");
    expect(roleOf(container, "$TOKEN")).toBe("text-syntax-literal");
    // A `#` inside a word is part of the URL, not a comment.
    expect(roleOf(container, "#frag $TOKEN")).toBeUndefined();
  });

  it("highlights an HTTP exchange and its JSON body", () => {
    const { container } = render(
      <CodeBlock
        value={'HTTP/1.1 201 Created\nContent-Type: application/json\n\n{"ok": true}'}
        language="http"
      />,
    );
    expect(roleOf(container, "201")).toBe("text-syntax-number");
    expect(roleOf(container, "Content-Type")).toBe("text-syntax-key");
    expect(roleOf(container, '"ok"')).toBe("text-syntax-key");
  });

  it("keeps line numbers out of the text, so a selection copies only code", () => {
    const { container } = render(<CodeBlock value={"alpha\nbeta"} lineNumbers />);
    const lines = container.querySelectorAll("[data-slot=code-block-line]");
    expect(lines).toHaveLength(2);
    expect(container.querySelector("code")?.textContent).toBe("alphabeta");
    expect(lines[0].className).toContain("[counter-increment:line]");
  });

  it("soft-wraps long lines only when asked", () => {
    const { container, rerender } = render(<CodeBlock value="x" />);
    const content = () => container.querySelector("[data-slot=code-block-line] > span");
    expect(content()).toHaveClass("whitespace-pre");
    rerender(<CodeBlock value="x" wrap />);
    expect(content()).toHaveClass("whitespace-pre-wrap", "wrap-anywhere");
  });

  it("shows the language identifier in the header, never for plain text", () => {
    const { rerender } = render(<CodeBlock value="{}" language="json" showLanguage />);
    expect(screen.getByText("json")).toBeInTheDocument();
    rerender(<CodeBlock value="hi" language="text" showLanguage />);
    expect(screen.queryByText("text")).not.toBeInTheDocument();
  });

  it("lays code out left to right in an rtl document", () => {
    const { container } = render(
      <div dir="rtl">
        <CodeBlock value="{}" />
      </div>,
    );
    expect(container.querySelector("pre")).toHaveAttribute("dir", "ltr");
  });

  it("announces a successful copy in a live region", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    render(<CodeBlock value="echo hi" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("");
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await screen.findByRole("button", { name: "Copied" });
    expect(status).toHaveTextContent("Copied");
    expect(writeText).toHaveBeenCalledWith("echo hi");

    vi.unstubAllGlobals();
  });

  it("has no axe violations with a header, line numbers and highlighting", async () => {
    const { container } = render(
      <CodeBlock value={'{"a": 1}'} language="json" caption="a.json" showLanguage lineNumbers />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
