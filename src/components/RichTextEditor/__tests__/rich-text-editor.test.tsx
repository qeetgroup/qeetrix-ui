import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/Input/field";
import { RichTextEditor } from "@/components/RichTextEditor/rich-text-editor";
import { DirectionProvider } from "@/providers/direction-provider";
import { MessagesProvider } from "@/providers/messages-provider";

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
    // Wraps backwards to the last *enabled* control (Undo/Redo start disabled).
    fireEvent.keyDown(toolbar, { key: "ArrowLeft" });
    expect(screen.getByRole("button", { name: "Link" })).toHaveFocus();
  });

  it("jumps to the first and last enabled control with Home and End", async () => {
    render(<RichTextEditor aria-label="Notes" />);
    await screen.findByRole("textbox", { name: "Notes" });
    const toolbar = screen.getByRole("toolbar", { name: "Formatting" });
    act(() => screen.getByRole("button", { name: "Heading 2" }).focus());

    fireEvent.keyDown(toolbar, { key: "End" });
    // Undo/Redo start disabled with an empty history, so End lands on Link.
    expect(screen.getByRole("button", { name: "Link" })).toHaveFocus();
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

/* ── Modernisation: toolbar semantics, states, placeholder, links ───────────────────────────── */

describe("RichTextEditor toolbar controls", () => {
  it("renders formats as toggles and history as plain actions", async () => {
    render(<RichTextEditor aria-label="Notes" />);
    await screen.findByRole("textbox", { name: "Notes" });
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Code block" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    // Undo is a command, not a state — announcing "not pressed" for it was wrong.
    expect(screen.getByRole("button", { name: "Undo" })).not.toHaveAttribute("aria-pressed");
    expect(screen.getByRole("button", { name: "Link" })).not.toHaveAttribute("aria-pressed");
    expect(screen.getByRole("button", { name: "Link" })).toHaveAttribute("aria-expanded", "false");
  });

  it("states every shortcut through aria-keyshortcuts", async () => {
    render(<RichTextEditor aria-label="Notes" />);
    await screen.findByRole("textbox", { name: "Notes" });
    // jsdom reports a non-Apple platform, so Mod is Control.
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute(
      "aria-keyshortcuts",
      "Control+B",
    );
    expect(screen.getByRole("button", { name: "Heading 2" })).toHaveAttribute(
      "aria-keyshortcuts",
      "Control+Alt+2",
    );
    expect(screen.getByRole("button", { name: "Link" })).toHaveAttribute(
      "aria-keyshortcuts",
      "Control+K",
    );
  });

  it("points the toolbar at the surface it formats", async () => {
    render(<RichTextEditor aria-label="Notes" />);
    const box = await screen.findByRole("textbox", { name: "Notes" });
    expect(box.id).not.toBe("");
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toHaveAttribute(
      "aria-controls",
      box.id,
    );
  });

  it("mirrors the arrow keys in RTL", async () => {
    render(
      <DirectionProvider direction="rtl">
        <RichTextEditor aria-label="Notes" />
      </DirectionProvider>,
    );
    await screen.findByRole("textbox", { name: "Notes" });
    const toolbar = screen.getByRole("toolbar", { name: "Formatting" });
    act(() => screen.getByRole("button", { name: "Bold" }).focus());
    // In RTL the next control sits to the left.
    fireEvent.keyDown(toolbar, { key: "ArrowLeft" });
    expect(screen.getByRole("button", { name: "Italic" })).toHaveFocus();
    fireEvent.keyDown(toolbar, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Bold" })).toHaveFocus();
  });

  it("takes its toolbar name from a MessagesProvider when no prop is given", async () => {
    render(
      <MessagesProvider messages={{ richTextEditor: { toolbar: "Mise en forme" } }}>
        <RichTextEditor aria-label="Notes" />
      </MessagesProvider>,
    );
    await screen.findByRole("textbox", { name: "Notes" });
    expect(screen.getByRole("toolbar", { name: "Mise en forme" })).toBeInTheDocument();
  });

  it("turns the current block into a code block", async () => {
    const user = userEvent.setup();
    const { container } = render(<RichTextEditor aria-label="Notes" defaultValue="<p>x = 1</p>" />);
    await screen.findByRole("textbox", { name: "Notes" });
    await user.click(screen.getByRole("button", { name: "Code block" }));
    expect(surface(container).querySelector("pre > code")).toHaveTextContent("x = 1");
    expect(screen.getByRole("button", { name: "Code block" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Marks cannot apply inside a code block, so their controls say so instead of failing.
    expect(screen.getByRole("button", { name: "Bold" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Link" })).toBeDisabled();
  });
});

describe("RichTextEditor placeholder", () => {
  it("disappears once the document has content, without a parent re-render", async () => {
    const user = userEvent.setup();
    const { container } = render(<RichTextEditor aria-label="Notes" placeholder="Say hello" />);
    await screen.findByRole("textbox", { name: "Notes" });
    const placeholder = () => container.querySelector("[data-slot='rich-text-editor-placeholder']");
    expect(placeholder()).toHaveTextContent("Say hello");

    // An unnamed, uncontrolled editor never re-renders its host on input; the placeholder used
    // to read `editor.isEmpty` during that render and stayed painted over the text.
    await user.click(screen.getByRole("button", { name: "Bullet list" }));
    act(() => {
      const editorEl = surface(container);
      editorEl.focus();
    });
    await user.keyboard("Hi");
    await waitFor(() => expect(placeholder()).toBeNull());
  });

  it("is not rendered for an editor that starts with content", async () => {
    const { container } = render(
      <RichTextEditor aria-label="Notes" placeholder="Say hello" defaultValue="<p>Hi</p>" />,
    );
    await screen.findByRole("textbox", { name: "Notes" });
    expect(container.querySelector("[data-slot='rich-text-editor-placeholder']")).toBeNull();
  });
});

describe("RichTextEditor states", () => {
  it("disabled: not editable, not focusable, toolbar inert, reported and not submitted", async () => {
    render(
      <form aria-label="post">
        <RichTextEditor aria-label="Body" name="body" defaultValue="<p>Draft</p>" disabled />
      </form>,
    );
    const box = await screen.findByRole("textbox", { name: "Body" });
    expect(box).toHaveAttribute("contenteditable", "false");
    expect(box).toHaveAttribute("aria-disabled", "true");
    expect(box).not.toHaveAttribute("tabindex");
    expect(box).not.toHaveAttribute("aria-readonly");
    const buttons = screen
      .getAllByRole("button")
      .filter((b) => b.hasAttribute("data-toolbar-index"));
    expect(buttons.length).toBeGreaterThan(5);
    for (const button of buttons) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("tabindex", "-1");
    }
    expect(screen.getByRole("toolbar")).toHaveAttribute("aria-disabled", "true");
    // A disabled control does not submit, exactly as a native one does not.
    const data = new FormData(screen.getByRole("form", { name: "post" }) as HTMLFormElement);
    expect(data.get("body")).toBeNull();
  });

  it("read-only: stays focusable so the content can be reached and selected", async () => {
    render(<RichTextEditor aria-label="Frozen" editable={false} defaultValue="<p>x</p>" />);
    const box = await screen.findByRole("textbox", { name: "Frozen" });
    expect(box).toHaveAttribute("tabindex", "0");
    act(() => box.focus());
    expect(box).toHaveFocus();
  });

  it("marks the frame invalid when the Field is", async () => {
    const { container } = render(
      <Field>
        <FieldLabel>Notes</FieldLabel>
        <RichTextEditor />
        <FieldError>Required.</FieldError>
      </Field>,
    );
    await screen.findByRole("textbox", { name: "Notes" });
    expect(container.querySelector("[data-slot='rich-text-editor']")).toHaveAttribute(
      "data-invalid",
    );
  });

  it("has no axe violations when disabled", async () => {
    const { container } = render(<RichTextEditor aria-label="Comment" disabled />);
    await screen.findByRole("textbox", { name: "Comment" });
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/*
 * jsdom has no layout, so ProseMirror cannot read a pointer or keyboard selection here. These
 * tests drive the two paths that need none: a collapsed caret (the address is inserted as the
 * link text) and a caret inside an existing link (the whole link is re-pointed or removed).
 * Applying a link to a dragged selection is verified in a real browser.
 */
describe("RichTextEditor links", () => {
  const linkBar = () => screen.queryByRole("group", { name: "Edit link" });

  it("opens the link bar from the toolbar and focuses the address field", async () => {
    const user = userEvent.setup();
    render(<RichTextEditor aria-label="Notes" defaultValue="<p>Docs</p>" />);
    await screen.findByRole("textbox", { name: "Notes" });
    const link = screen.getByRole("button", { name: "Link" });
    await user.click(link);
    expect(linkBar()).toBeInTheDocument();
    expect(link).toHaveAttribute("aria-expanded", "true");
    expect(link).toHaveAttribute("aria-controls", linkBar()?.id);
    expect(screen.getByRole("textbox", { name: "Link address" })).toHaveFocus();
  });

  it("opens with Mod+K from the text", async () => {
    const { container } = render(<RichTextEditor aria-label="Notes" defaultValue="<p>Docs</p>" />);
    await screen.findByRole("textbox", { name: "Notes" });
    act(() => surface(container).focus());
    fireEvent.keyDown(surface(container), { key: "k", ctrlKey: true });
    expect(linkBar()).toBeInTheDocument();
  });

  it("inserts the address as the link text at a caret, normalising a bare domain to https", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <RichTextEditor aria-label="Notes" defaultValue="<p>Docs</p>" onChange={onChange} />,
    );
    await screen.findByRole("textbox", { name: "Notes" });
    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByRole("textbox", { name: "Link address" }), "qeet.in{Enter}");

    const anchor = surface(container).querySelector("a");
    expect(anchor).toHaveTextContent("qeet.in");
    expect(anchor).toHaveAttribute("href", "https://qeet.in");
    expect(linkBar()).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('href="https://qeet.in"'));
  });

  it("re-points an existing link without changing its text", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RichTextEditor
        aria-label="Notes"
        defaultValue='<p><a href="https://old.example">Docs</a></p>'
      />,
    );
    await screen.findByRole("textbox", { name: "Notes" });
    await user.click(screen.getByRole("button", { name: "Link" }));
    const field = screen.getByRole("textbox", { name: "Link address" });
    expect(field).toHaveValue("https://old.example");
    await user.clear(field);
    await user.type(field, "qeet.in/new{Enter}");

    const anchors = surface(container).querySelectorAll("a");
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toHaveTextContent("Docs");
    expect(anchors[0]).toHaveAttribute("href", "https://qeet.in/new");
  });

  it("links an email address with mailto:", async () => {
    const user = userEvent.setup();
    const { container } = render(<RichTextEditor aria-label="Notes" defaultValue="<p>x</p>" />);
    await screen.findByRole("textbox", { name: "Notes" });
    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByRole("textbox", { name: "Link address" }), "ops@qeet.in{Enter}");
    expect(surface(container).querySelector("a")).toHaveAttribute("href", "mailto:ops@qeet.in");
  });

  it("refuses a disallowed scheme and says why, without touching the document", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <RichTextEditor aria-label="Notes" defaultValue="<p>Docs</p>" onChange={onChange} />,
    );
    await screen.findByRole("textbox", { name: "Notes" });
    await user.click(screen.getByRole("button", { name: "Link" }));
    const field = screen.getByRole("textbox", { name: "Link address" });
    await user.type(field, "javascript:alert(1){Enter}");

    expect(surface(container).querySelector("a")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(/web address/i);
    expect(linkBar()).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the text", async () => {
    const user = userEvent.setup();
    const { container } = render(<RichTextEditor aria-label="Notes" defaultValue="<p>Docs</p>" />);
    await screen.findByRole("textbox", { name: "Notes" });
    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.keyboard("{Escape}");
    expect(linkBar()).toBeNull();
    // Tiptap restores focus on the next frame.
    await waitFor(() => expect(surface(container)).toHaveFocus());
  });

  it("never submits the surrounding form from the address field", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form aria-label="post" onSubmit={onSubmit}>
        <RichTextEditor aria-label="Body" defaultValue="<p>Docs</p>" />
      </form>,
    );
    await screen.findByRole("textbox", { name: "Body" });
    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByRole("textbox", { name: "Link address" }), "qeet.in{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("offers Remove for an existing link and unlinks it", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RichTextEditor
        aria-label="Notes"
        defaultValue='<p><a href="https://qeet.in">Docs</a></p>'
      />,
    );
    await screen.findByRole("textbox", { name: "Notes" });
    await user.click(screen.getByRole("button", { name: "Link" }));
    expect(screen.getByRole("textbox", { name: "Link address" })).toHaveValue("https://qeet.in");
    await user.click(screen.getByRole("button", { name: "Remove link" }));
    expect(surface(container).querySelector("a")).toBeNull();
    expect(surface(container)).toHaveTextContent("Docs");
  });

  it("has no axe violations with the link bar open", async () => {
    const user = userEvent.setup();
    const { container } = render(<RichTextEditor aria-label="Notes" defaultValue="<p>Docs</p>" />);
    await screen.findByRole("textbox", { name: "Notes" });
    await user.click(screen.getByRole("button", { name: "Link" }));
    expect(await a11y(container)).toHaveNoViolations();
  });
});
