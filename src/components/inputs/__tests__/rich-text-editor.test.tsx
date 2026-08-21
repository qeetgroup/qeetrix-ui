import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { RichTextEditor } from "@/components/inputs/rich-text-editor";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

// Tiptap uses `immediatelyRender: false`, so the editor (and its ProseMirror
// contenteditable) mount on an effect after the first paint — assertions wait
// for the textbox to appear rather than querying synchronously.

describe("RichTextEditor", () => {
  it("renders an accessible multiline textbox", async () => {
    render(<RichTextEditor aria-label="Description" />);
    const box = await screen.findByRole("textbox", { name: "Description" });
    expect(box).toHaveAttribute("aria-multiline", "true");
    expect(box).toHaveAttribute("contenteditable", "true");
  });

  it("falls back to a default accessible name", async () => {
    render(<RichTextEditor />);
    expect(await screen.findByRole("textbox", { name: /rich text editor/i })).toBeInTheDocument();
  });

  it("renders the formatting toolbar when editable", async () => {
    render(<RichTextEditor aria-label="Notes" />);
    expect(await screen.findByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Italic" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bullet list" })).toBeInTheDocument();
  });

  it("hides the toolbar and is not editable when editable={false}", async () => {
    render(<RichTextEditor aria-label="Read only" editable={false} />);
    const box = await screen.findByRole("textbox", { name: "Read only" });
    expect(box).toHaveAttribute("contenteditable", "false");
    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
  });

  it("renders provided initial content", async () => {
    render(<RichTextEditor aria-label="Bio" defaultValue="<p>Hello world</p>" />);
    await screen.findByRole("textbox", { name: "Bio" });
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("has no axe violations (editable)", async () => {
    const { container } = render(<RichTextEditor aria-label="Comment" />);
    await screen.findByRole("textbox", { name: "Comment" });
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations (read-only)", async () => {
    const { container } = render(
      <RichTextEditor aria-label="Comment" editable={false} defaultValue="<p>Frozen</p>" />,
    );
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Comment" })).toBeInTheDocument(),
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
