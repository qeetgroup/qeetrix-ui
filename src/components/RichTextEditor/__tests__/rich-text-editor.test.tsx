import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/Input/field";
import { RichTextEditor } from "@/components/RichTextEditor/rich-text-editor";

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

describe("RichTextEditor toolbar and field semantics", () => {
  const toolbarButtons = () =>
    screen.getAllByRole("button").filter((b) => b.hasAttribute("data-toolbar-index"));

  it("exposes the formatting controls as a named toolbar", async () => {
    render(<RichTextEditor aria-label="Notes" />);
    await screen.findByRole("textbox", { name: "Notes" });
    const toolbar = screen.getByRole("toolbar", { name: "Formatting" });
    expect(toolbar).toHaveAttribute("aria-orientation", "horizontal");
    expect(toolbar).toContainElement(screen.getByRole("button", { name: "Bold" }));
  });

  it("accepts a translated toolbar label", async () => {
    render(<RichTextEditor aria-label="Notes" toolbarLabel="Mise en forme" />);
    await screen.findByRole("textbox", { name: "Notes" });
    expect(screen.getByRole("toolbar", { name: "Mise en forme" })).toBeInTheDocument();
  });

  it("takes a single tab stop for the whole toolbar", async () => {
    render(<RichTextEditor aria-label="Notes" />);
    await screen.findByRole("textbox", { name: "Notes" });
    const buttons = toolbarButtons();
    expect(buttons.length).toBeGreaterThan(5);
    const tabbable = buttons.filter((b) => b.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAccessibleName("Bold");
  });

  it("moves between controls with the arrow keys and wraps", async () => {
    render(<RichTextEditor aria-label="Notes" />);
    await screen.findByRole("textbox", { name: "Notes" });
    const toolbar = screen.getByRole("toolbar", { name: "Formatting" });
    const bold = screen.getByRole("button", { name: "Bold" });
    act(() => bold.focus());

    fireEvent.keyDown(toolbar, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Italic" })).toHaveFocus();
    fireEvent.keyDown(toolbar, { key: "ArrowLeft" });
    expect(bold).toHaveFocus();
    // Wraps backwards to the last *enabled* control.
    fireEvent.keyDown(toolbar, { key: "ArrowLeft" });
    expect(screen.getByRole("button", { name: "Quote" })).toHaveFocus();
  });

  it("jumps to the first and last enabled control with Home and End", async () => {
    render(<RichTextEditor aria-label="Notes" />);
    await screen.findByRole("textbox", { name: "Notes" });
    const toolbar = screen.getByRole("toolbar", { name: "Formatting" });
    act(() => screen.getByRole("button", { name: "Heading 2" }).focus());

    fireEvent.keyDown(toolbar, { key: "End" });
    // Undo/Redo start disabled with an empty history, so End lands on Quote.
    expect(screen.getByRole("button", { name: "Quote" })).toHaveFocus();
    fireEvent.keyDown(toolbar, { key: "Home" });
    expect(screen.getByRole("button", { name: "Bold" })).toHaveFocus();
  });

  it("never leaves the tab stop on a disabled control", async () => {
    render(<RichTextEditor aria-label="Notes" />);
    await screen.findByRole("textbox", { name: "Notes" });
    // Undo and Redo are disabled with an empty history.
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    for (const button of toolbarButtons()) {
      if (button.hasAttribute("disabled")) {
        expect(button).toHaveAttribute("tabindex", "-1");
      }
    }
  });

  it("reports the placeholder through aria-placeholder and hides the visible copy", async () => {
    const { container } = render(
      <RichTextEditor aria-label="Bio" placeholder="Tell us about yourself" />,
    );
    const box = await screen.findByRole("textbox", { name: "Bio" });
    expect(box).toHaveAttribute("aria-placeholder", "Tell us about yourself");
    // The visible paragraph stays aria-hidden so it is not announced twice.
    const visible = [...container.querySelectorAll("p")].find(
      (p) => p.textContent === "Tell us about yourself",
    );
    expect(visible).toHaveAttribute("aria-hidden", "true");
  });

  it("omits aria-placeholder when there is no placeholder", async () => {
    render(<RichTextEditor aria-label="Bio" />);
    expect(await screen.findByRole("textbox", { name: "Bio" })).not.toHaveAttribute(
      "aria-placeholder",
    );
  });

  it("reports aria-readonly when not editable", async () => {
    render(<RichTextEditor aria-label="Frozen" editable={false} defaultValue="<p>x</p>" />);
    const box = await screen.findByRole("textbox", { name: "Frozen" });
    expect(box).toHaveAttribute("aria-readonly", "true");
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("does not claim aria-readonly while editable", async () => {
    render(<RichTextEditor aria-label="Open" />);
    expect(await screen.findByRole("textbox", { name: "Open" })).not.toHaveAttribute(
      "aria-readonly",
    );
  });

  it("has no axe violations with a placeholder and a toolbar", async () => {
    const { container } = render(<RichTextEditor aria-label="Comment" placeholder="Say hello" />);
    await screen.findByRole("textbox", { name: "Comment" });
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/*
 * Editing outcomes (TEST-002).
 *
 * The suite above proves the toolbar's shape; this one proves it edits. Node commands
 * (list/heading/quote) are used rather than mark commands because they act on the block holding
 * the caret, which exists from creation — a mark toggle on an empty selection only stores a
 * pending mark and changes no document, so it can pass while formatting is broken.
 *
 * jsdom performs no layout, so ProseMirror's `scrollToSelection` throws on the `Range` it asks
 * for rectangles from. The two stubs below are that missing geometry, and nothing else: they
 * return empty, which is what a zero-layout document should report.
 */
beforeAll(() => {
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
});

const surface = (container: HTMLElement) => container.querySelector(".ProseMirror") as HTMLElement;

describe("RichTextEditor editing", () => {
  it("does not report a change before the user has made one", async () => {
    const onChange = vi.fn();
    render(<RichTextEditor aria-label="Notes" defaultValue="<p>Hello</p>" onChange={onChange} />);
    await screen.findByRole("textbox", { name: "Notes" });
    // `setEditable` emits an update unless suppressed; this fired once on mount with the
    // component's own initial value, which marked every consumer's form dirty on first paint.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("turns the current block into a list item and reports the new HTML once", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <RichTextEditor aria-label="Notes" defaultValue="<p>Hello</p>" onChange={onChange} />,
    );
    await screen.findByRole("textbox", { name: "Notes" });
    await user.click(screen.getByRole("button", { name: "Bullet list" }));

    expect(surface(container).querySelector("ul > li")).toHaveTextContent("Hello");
    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("<ul><li><p>Hello</p></li></ul>"),
    );
  });

  it("promotes the current block to a heading and reports the control as pressed", async () => {
    const user = userEvent.setup();
    const { container } = render(<RichTextEditor aria-label="Notes" defaultValue="<p>Title</p>" />);
    await screen.findByRole("textbox", { name: "Notes" });
    await user.click(screen.getByRole("button", { name: "Heading 2" }));

    expect(surface(container).querySelector("h2")).toHaveTextContent("Title");
    expect(screen.getByRole("button", { name: "Heading 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Heading 1" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("un-applies a format when the same control is pressed again", async () => {
    const user = userEvent.setup();
    const { container } = render(<RichTextEditor aria-label="Notes" defaultValue="<p>Quote</p>" />);
    await screen.findByRole("textbox", { name: "Notes" });
    const quote = screen.getByRole("button", { name: "Quote" });

    await user.click(quote);
    expect(surface(container).querySelector("blockquote")).not.toBeNull();
    await user.click(quote);
    expect(surface(container).querySelector("blockquote")).toBeNull();
    expect(quote).toHaveAttribute("aria-pressed", "false");
  });

  it("undoes and redoes a real document change", async () => {
    const user = userEvent.setup();
    const { container } = render(<RichTextEditor aria-label="Notes" defaultValue="<p>Hello</p>" />);
    await screen.findByRole("textbox", { name: "Notes" });
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Bullet list" }));
    const undo = screen.getByRole("button", { name: "Undo" });
    await waitFor(() => expect(undo).not.toBeDisabled());

    await user.click(undo);
    expect(surface(container).querySelector("ul")).toBeNull();
    expect(surface(container).querySelector("p")).toHaveTextContent("Hello");

    const redo = screen.getByRole("button", { name: "Redo" });
    await waitFor(() => expect(redo).not.toBeDisabled());
    await user.click(redo);
    expect(surface(container).querySelector("ul > li")).toHaveTextContent("Hello");
  });

  it("calls the latest onChange, not the one it was constructed with", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<RichTextEditor aria-label="Notes" onChange={first} />);
    await screen.findByRole("textbox", { name: "Notes" });
    rerender(<RichTextEditor aria-label="Notes" onChange={second} />);
    await user.click(screen.getByRole("button", { name: "Bullet list" }));

    // Tiptap binds its `update` listener once, at construction. Reading the callback through a
    // ref is what keeps a consumer's inline arrow from going stale for the editor's lifetime.
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("replaces the content when a controlled value changes, without echoing it back", async () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <RichTextEditor aria-label="Notes" value="<p>First</p>" onChange={onChange} />,
    );
    await screen.findByRole("textbox", { name: "Notes" });
    rerender(<RichTextEditor aria-label="Notes" value="<p>Second</p>" onChange={onChange} />);

    await waitFor(() => expect(surface(container)).toHaveTextContent("Second"));
    expect(surface(container)).not.toHaveTextContent("First");
    // A programmatic sync must not look like user input.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps a local edit on screen while controlled — the documented exception", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <RichTextEditor aria-label="Notes" value="<p>Hello</p>" onChange={onChange} />,
    );
    await screen.findByRole("textbox", { name: "Notes" });
    await user.click(screen.getByRole("button", { name: "Bullet list" }));

    // Unlike every other controlled component in the library, the surface does not snap back:
    // reverting a contenteditable per keystroke destroys the caret. The parent is still told.
    expect(surface(container).querySelector("ul > li")).toHaveTextContent("Hello");
    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("<ul><li><p>Hello</p></li></ul>"),
    );
  });
});

describe("RichTextEditor form participation", () => {
  const data = () => new FormData(screen.getByRole("form", { name: "post" }) as HTMLFormElement);

  it("submits its HTML under its name", async () => {
    render(
      <form aria-label="post">
        <RichTextEditor aria-label="Body" name="body" defaultValue="<p>Draft</p>" />
      </form>,
    );
    await screen.findByRole("textbox", { name: "Body" });
    expect(data().get("body")).toBe("<p>Draft</p>");
  });

  it("submits the edited HTML, not the initial HTML", async () => {
    const user = userEvent.setup();
    render(
      <form aria-label="post">
        <RichTextEditor aria-label="Body" name="body" defaultValue="<p>Draft</p>" />
      </form>,
    );
    await screen.findByRole("textbox", { name: "Body" });
    await user.click(screen.getByRole("button", { name: "Bullet list" }));
    expect(data().get("body")).toContain("<ul><li><p>Draft</p></li></ul>");
  });

  it("submits the controlled value when there is one", async () => {
    render(
      <form aria-label="post">
        <RichTextEditor aria-label="Body" name="body" value="<p>Owned</p>" onChange={() => {}} />
      </form>,
    );
    await screen.findByRole("textbox", { name: "Body" });
    expect(data().get("body")).toBe("<p>Owned</p>");
  });

  it("associates with a Field's label, description, error and invalid state", async () => {
    render(
      <Field>
        <FieldLabel>Release notes</FieldLabel>
        <RichTextEditor name="notes" required />
        <FieldDescription>Markdown is not supported.</FieldDescription>
        <FieldError>Release notes are required.</FieldError>
      </Field>,
    );
    const box = await screen.findByRole("textbox", { name: "Release notes" });
    const description = screen.getByText("Markdown is not supported.");
    const error = screen.getByRole("alert");

    expect(box.getAttribute("aria-describedby")?.split(" ")).toEqual(
      expect.arrayContaining([description.id, error.id]),
    );
    expect(box).toHaveAttribute("aria-errormessage", error.id);
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAttribute("aria-required", "true");
  });

  it("keeps its own name and reports nothing invalid outside a Field", async () => {
    render(<RichTextEditor name="notes" />);
    const box = await screen.findByRole("textbox", { name: "Rich text editor" });
    expect(box).not.toHaveAttribute("aria-invalid");
    expect(box).not.toHaveAttribute("aria-required");
  });
});
