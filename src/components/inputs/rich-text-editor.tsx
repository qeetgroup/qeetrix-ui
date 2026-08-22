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
import { Toggle } from "@/components/actions/toggle";
import { Separator } from "@/components/utility/separator";
import { proseClassName } from "@/components/utility/typography";
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
  className?: string;
  "aria-label"?: string;
}

function ToolbarControls({ editor }: { editor: Editor }) {
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

  const item = (
    pressed: boolean,
    run: () => void,
    label: string,
    icon: React.ReactNode,
    disabled?: boolean,
  ) => (
    <Toggle
      size="sm"
      pressed={pressed}
      disabled={disabled}
      onPressedChange={run}
      aria-label={label}
    >
      {icon}
    </Toggle>
  );

  return (
    <>
      {item(
        editor.isActive("bold"),
        () => editor.chain().focus().toggleBold().run(),
        "Bold",
        <BoldIcon aria-hidden />,
      )}
      {item(
        editor.isActive("italic"),
        () => editor.chain().focus().toggleItalic().run(),
        "Italic",
        <ItalicIcon aria-hidden />,
      )}
      {item(
        editor.isActive("strike"),
        () => editor.chain().focus().toggleStrike().run(),
        "Strikethrough",
        <StrikethroughIcon aria-hidden />,
      )}
      {item(
        editor.isActive("code"),
        () => editor.chain().focus().toggleCode().run(),
        "Inline code",
        <CodeIcon aria-hidden />,
      )}
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      {item(
        editor.isActive("heading", { level: 1 }),
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        "Heading 1",
        <Heading1Icon aria-hidden />,
      )}
      {item(
        editor.isActive("heading", { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        "Heading 2",
        <Heading2Icon aria-hidden />,
      )}
      {item(
        editor.isActive("heading", { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        "Heading 3",
        <Heading3Icon aria-hidden />,
      )}
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      {item(
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
        "Bullet list",
        <ListIcon aria-hidden />,
      )}
      {item(
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
        "Numbered list",
        <ListOrderedIcon aria-hidden />,
      )}
      {item(
        editor.isActive("blockquote"),
        () => editor.chain().focus().toggleBlockquote().run(),
        "Quote",
        <QuoteIcon aria-hidden />,
      )}
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      {item(
        false,
        () => editor.chain().focus().undo().run(),
        "Undo",
        <Undo2Icon aria-hidden />,
        !editor.can().undo(),
      )}
      {item(
        false,
        () => editor.chain().focus().redo().run(),
        "Redo",
        <Redo2Icon aria-hidden />,
        !editor.can().redo(),
      )}
    </>
  );
}

/**
 * WYSIWYG rich-text editor built on Tiptap (StarterKit) with a `Toggle`-based
 * toolbar. Outputs HTML (`onChange`) and/or ProseMirror JSON (`onChangeJSON`),
 * styled with the shared {@link proseClassName}. Controlled or uncontrolled,
 * and SSR-safe (`immediatelyRender: false`).
 */
function RichTextEditor({
  value,
  defaultValue,
  onChange,
  onChangeJSON,
  placeholder,
  editable = true,
  className,
  "aria-label": ariaLabel,
}: RichTextEditorProps) {
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
        "aria-label": ariaLabel ?? "Rich text editor",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
      onChangeJSON?.(editor.getJSON());
    },
  });

  // Sync external (controlled) value changes without emitting an update.
  React.useEffect(() => {
    if (!editor || value === undefined) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  React.useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  return (
    <div
      data-slot="rich-text-editor"
      className={cn(
        "rounded-lg border bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        className,
      )}
    >
      {editable && editor && (
        <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
          <ToolbarControls editor={editor} />
        </div>
      )}
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
