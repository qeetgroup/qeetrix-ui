"use client";

import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  Undo2Icon,
} from "lucide-react";
import * as React from "react";
import { Toggle } from "@/components/Button/toggle";
import { FieldHiddenInput, useFieldControl } from "@/components/Input/field";
import { Separator } from "@/components/Separator/separator";
import { proseClassName } from "@/components/Typography/typography";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  /** Controlled HTML value. */
  value?: string;
  /** Initial HTML for uncontrolled use. */
  defaultValue?: string;
  /** Fires with the editor's HTML on every change. */
  onChange?: (html: string) => void;
  /** Fires with the editor's ProseMirror JSON on every change. */
  onChangeJSON?: (json: object) => void;
  placeholder?: string;
  editable?: boolean;
  /** Accessible name for the formatting toolbar. @default "Formatting" */
  toolbarLabel?: string;
  className?: string;
  /** Submits the editor's HTML under this name. Omit and nothing is serialised. */
  name?: string;
  /** Associate the submitted value with a form it is not nested inside, by form `id`. */
  form?: string;
  /**
   * Reports `aria-required` on the editing surface. **Advisory only** — the value submits from
   * a hidden input, which the HTML standard exempts from constraint validation, so an empty
   * editor does not block submission and `:invalid` does not match. Validate on submit and
   * surface the result through `FieldError` + `aria-invalid`.
   */
  required?: boolean;
  /** Applied to the editing surface, so a `Field` label and description resolve against it. */
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

interface ToolbarToggleSpec {
  label: string;
  icon: React.ReactNode;
  pressed: boolean;
  run: () => void;
  disabled?: boolean;
}

/**
 * APG toolbar: one tab stop for the whole strip, arrow keys / Home / End move
 * between controls. Thirteen individually tabbable buttons in front of the
 * editing surface is a wall a keyboard user has to cross on every visit.
 */
function ToolbarControls({ editor, label }: { editor: Editor; label: string }) {
  // Re-render this control strip on every editor transaction so the active
  // states stay in sync. `useEditorState` would be lighter, but a forced tick
  // keeps the dependency surface minimal.
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    editor.on("transaction", force);
    return () => {
      editor.off("transaction", force);
    };
  }, [editor]);

  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const [requestedIndex, setRequestedIndex] = React.useState(0);

  const groups: ToolbarToggleSpec[][] = [
    [
      {
        label: "Bold",
        icon: <BoldIcon aria-hidden />,
        pressed: editor.isActive("bold"),
        run: () => editor.chain().focus().toggleBold().run(),
      },
      {
        label: "Italic",
        icon: <ItalicIcon aria-hidden />,
        pressed: editor.isActive("italic"),
        run: () => editor.chain().focus().toggleItalic().run(),
      },
      {
        label: "Strikethrough",
        icon: <StrikethroughIcon aria-hidden />,
        pressed: editor.isActive("strike"),
        run: () => editor.chain().focus().toggleStrike().run(),
      },
      {
        label: "Inline code",
        icon: <CodeIcon aria-hidden />,
        pressed: editor.isActive("code"),
        run: () => editor.chain().focus().toggleCode().run(),
      },
    ],
    [
      {
        label: "Heading 1",
        icon: <Heading1Icon aria-hidden />,
        pressed: editor.isActive("heading", { level: 1 }),
        run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        label: "Heading 2",
        icon: <Heading2Icon aria-hidden />,
        pressed: editor.isActive("heading", { level: 2 }),
        run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        label: "Heading 3",
        icon: <Heading3Icon aria-hidden />,
        pressed: editor.isActive("heading", { level: 3 }),
        run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      },
    ],
    [
      {
        label: "Bullet list",
        icon: <ListIcon aria-hidden />,
        pressed: editor.isActive("bulletList"),
        run: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        label: "Numbered list",
        icon: <ListOrderedIcon aria-hidden />,
        pressed: editor.isActive("orderedList"),
        run: () => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        label: "Quote",
        icon: <QuoteIcon aria-hidden />,
        pressed: editor.isActive("blockquote"),
        run: () => editor.chain().focus().toggleBlockquote().run(),
      },
    ],
    [
      {
        label: "Undo",
        icon: <Undo2Icon aria-hidden />,
        pressed: false,
        run: () => editor.chain().focus().undo().run(),
        disabled: !editor.can().undo(),
      },
      {
        label: "Redo",
        icon: <Redo2Icon aria-hidden />,
        pressed: false,
        run: () => editor.chain().focus().redo().run(),
        disabled: !editor.can().redo(),
      },
    ],
  ];

  const flat = groups.flat();
  const focusable = flat.flatMap((spec, index) => (spec.disabled ? [] : [index]));
  // Derived, so a control that becomes disabled (undo with nothing to undo)
  // cannot take the toolbar's only tab stop with it.
  const tabStop = focusable.includes(requestedIndex) ? requestedIndex : (focusable[0] ?? -1);

  const focusIndex = (index: number | undefined) => {
    if (index === undefined) return;
    setRequestedIndex(index);
    toolbarRef.current?.querySelector<HTMLElement>(`[data-toolbar-index="${index}"]`)?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (focusable.length === 0) return;
    const current = focusable.indexOf(tabStop);
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusIndex(focusable[(current + 1) % focusable.length]);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusIndex(focusable[(current - 1 + focusable.length) % focusable.length]);
        break;
      case "Home":
        event.preventDefault();
        focusIndex(focusable[0]);
        break;
      case "End":
        event.preventDefault();
        focusIndex(focusable[focusable.length - 1]);
        break;
    }
  };

  let offset = 0;
  return (
    <div
      ref={toolbarRef}
      data-slot="rich-text-editor-toolbar"
      role="toolbar"
      aria-label={label}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className="flex flex-wrap items-center gap-0.5 border-b p-1"
    >
      {groups.map((group, groupIndex) => {
        const start = offset;
        offset += group.length;
        return (
          <React.Fragment key={group[0]?.label ?? groupIndex}>
            {groupIndex > 0 && <Separator orientation="vertical" className="mx-0.5 h-5" />}
            {group.map((spec, indexInGroup) => {
              const index = start + indexInGroup;
              return (
                <Toggle
                  key={spec.label}
                  size="sm"
                  pressed={spec.pressed}
                  disabled={spec.disabled}
                  onPressedChange={spec.run}
                  aria-label={spec.label}
                  data-toolbar-index={index}
                  tabIndex={index === tabStop ? 0 : -1}
                  onFocus={() => setRequestedIndex(index)}
                >
                  {spec.icon}
                </Toggle>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * WYSIWYG rich-text editor built on Tiptap (StarterKit) with a `Toggle`-based
 * toolbar. Outputs HTML (`onChange`) and/or ProseMirror JSON (`onChangeJSON`),
 * styled with the shared {@link proseClassName}. Controlled or uncontrolled,
 * and SSR-safe (`immediatelyRender: false`).
 *
 * Accessibility: the formatting strip is a named APG `toolbar` with a single tab
 * stop; `placeholder` is exposed as `aria-placeholder` (the visible copy stays
 * `aria-hidden` so it is not read twice); and `editable={false}` reports
 * `aria-readonly` rather than looking like an editable textbox that silently
 * refuses input.
 *
 * Forms: implements the composite-field contract (see `field.tsx`). Inside a `Field` the editing
 * surface takes the label, description, error and `aria-invalid` association; `name` submits the
 * HTML. `required` is advisory — see the prop.
 */
function RichTextEditor({
  value,
  defaultValue,
  onChange,
  onChangeJSON,
  placeholder,
  editable = true,
  toolbarLabel = "Formatting",
  className,
  name,
  form,
  required,
  id,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: RichTextEditorProps) {
  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });
  // A Field label wins over the built-in fallback; without one the surface still needs a name.
  const surfaceLabel = field["aria-labelledby"] ? undefined : (ariaLabel ?? "Rich text editor");

  // Tiptap binds the `update` listener once, at construction (`Editor` calls
  // `this.on("update", this.options.onUpdate)` and `setOptions` never rebinds it). A handler that
  // closed over `onChange` therefore kept calling the *first* render's callback for the editor's
  // whole life — a consumer passing an inline arrow that reads current state saw stale state
  // forever. The listener now reads the latest props through a ref instead.
  const latest = React.useRef({ onChange, onChangeJSON, named: Boolean(name) });
  latest.current = { onChange, onChangeJSON, named: Boolean(name) };

  // The submitted HTML, tracked only when there is a `name` to submit it under: an unnamed
  // editor must not re-render its consumer on every keystroke for a value nobody reads.
  const [ownHtml, setOwnHtml] = React.useState(value ?? defaultValue ?? "");

  const editor = useEditor({
    extensions: [StarterKit],
    content: value ?? defaultValue ?? "",
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(proseClassName, "min-h-40 px-3 py-2 focus:outline-none"),
        role: "textbox",
        "aria-multiline": "true",
        ...(field.id ? { id: field.id } : null),
        ...(surfaceLabel ? { "aria-label": surfaceLabel } : null),
        ...(field["aria-labelledby"] ? { "aria-labelledby": field["aria-labelledby"] } : null),
        ...(field["aria-describedby"] ? { "aria-describedby": field["aria-describedby"] } : null),
        ...(field["aria-errormessage"]
          ? { "aria-errormessage": field["aria-errormessage"] }
          : null),
        ...(field["aria-invalid"] ? { "aria-invalid": String(field["aria-invalid"]) } : null),
        ...(required ? { "aria-required": "true" } : null),
        ...(placeholder ? { "aria-placeholder": placeholder } : null),
        ...(editable ? null : { "aria-readonly": "true" }),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (latest.current.named) setOwnHtml(html);
      latest.current.onChange?.(html);
      latest.current.onChangeJSON?.(editor.getJSON());
    },
  });

  /*
   * Sync external (controlled) value changes without emitting an update.
   *
   * **The one documented exception to the library's controlled contract.** Everywhere else, a
   * controlled component whose parent ignores the callback does not move. Here it does: the
   * editing surface keeps the user's text until `value` itself changes. Reverting a
   * contenteditable on every keystroke destroys the caret and the browser's own undo stack, so
   * a parent that debounces its state would make the editor unusable rather than merely
   * surprising. `onChange` still reports every change, so the parent is never out of date —
   * it is authority over *display*, not over notification, that is deferred here.
   */
  React.useEffect(() => {
    if (!editor || value === undefined) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  React.useEffect(() => {
    // `setEditable` emits an `update` unless told not to, and it used to be called
    // unconditionally on mount — so an uncontrolled editor fired `onChange` once with its own
    // initial value before the user had touched it, and a consumer marking the form dirty on
    // change was dirty from the first paint. The toolbar tracks `transaction`, not `update`, so
    // suppressing the emit costs nothing.
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable, false);
    }
  }, [editor, editable]);

  return (
    <div
      data-slot="rich-text-editor"
      className={cn(
        "rounded-lg border bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        className,
      )}
    >
      <FieldHiddenInput name={name} value={value ?? ownHtml} form={form} />
      {editable && editor && <ToolbarControls editor={editor} label={toolbarLabel} />}
      <div className="relative">
        {editor && placeholder && editor.isEmpty && (
          <p aria-hidden className="pointer-events-none absolute px-3 py-2 text-muted-foreground">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export type { RichTextEditorProps };
export { RichTextEditor };
