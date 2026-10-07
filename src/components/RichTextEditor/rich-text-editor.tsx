"use client";

import { BoldIcon } from "@qeetrix/icons/icons/bold";
import { CodeIcon } from "@qeetrix/icons/icons/code";
import { Heading1Icon } from "@qeetrix/icons/icons/heading-1";
import { Heading2Icon } from "@qeetrix/icons/icons/heading-2";
import { Heading3Icon } from "@qeetrix/icons/icons/heading-3";
import { ItalicIcon } from "@qeetrix/icons/icons/italic";
import { LinkIcon } from "@qeetrix/icons/icons/link";
import { ListIcon } from "@qeetrix/icons/icons/list";
import { ListOrderedIcon } from "@qeetrix/icons/icons/list-ordered";
import { QuoteIcon } from "@qeetrix/icons/icons/quote";
import { Redo2Icon } from "@qeetrix/icons/icons/redo-2";
import { SquareCodeIcon } from "@qeetrix/icons/icons/square-code";
import { StrikethroughIcon } from "@qeetrix/icons/icons/strikethrough";
import { Undo2Icon } from "@qeetrix/icons/icons/undo-2";
import { type Editor, EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import * as React from "react";
import { Button } from "@/components/Button/button";
import { Toggle } from "@/components/Button/toggle";
import { FieldHiddenInput, useFieldControl } from "@/components/Input/field";
import { Input } from "@/components/Input/input";
import { Kbd, KbdGroup } from "@/components/Kbd/kbd";
import { Separator } from "@/components/Separator/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip/tooltip";
import { proseClassName } from "@/components/Typography/typography";
import type { MessagesFor, RichTextEditorMessages } from "@/lib/messages";
import { richTextEditorMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useDirectionalKeys } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

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
  /**
   * `false` makes the editor read-only: no toolbar, `aria-readonly`, and a quiet frame. The
   * content stays focusable and selectable, as a native read-only field's does.
   */
  editable?: boolean;
  /**
   * Disables the field: nothing is editable or focusable, the toolbar is inert, the surface
   * reports `aria-disabled`, and — like a disabled native control — the value is not submitted.
   */
  disabled?: boolean;
  /**
   * Accessible name for the formatting toolbar. Falls back to the `richTextEditor.toolbar`
   * message (a `MessagesProvider` translates it), then to `"Formatting"`.
   */
  toolbarLabel?: string;
  /**
   * Overrides for this component's built-in English strings — control names, the link bar, the
   * surface name. Each key falls back to the nearest `MessagesProvider`, then to the default;
   * `toolbarLabel` still wins for the toolbar name.
   */
  messages?: MessagesFor<"richTextEditor">;
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

/*
 * Module scope, so the extension list keeps its identity across renders — Tiptap compares it by
 * reference and a fresh array would look like a configuration change on every render.
 *
 *   link.openOnClick   A click in an editable document places the caret; it must not open a
 *                      new tab. Read-only content is a plain anchor and navigates normally.
 *   dropcursor.color   ProseMirror's default is black, which disappears on the dark surface.
 */
const EXTENSIONS = [
  StarterKit.configure({
    link: { openOnClick: false },
    dropcursor: { color: "var(--qx-color-focus-ring)", width: 2 },
  }),
];

/** The catalogue keys that name a toolbar control (`richTextEditor` group). */
type ControlLabelKey =
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "quote"
  | "codeBlock"
  | "link"
  | "undo"
  | "redo";

type Modifier = "Mod" | "Shift" | "Alt";
type Shortcut = readonly [...Modifier[], string];

interface ControlSpec {
  key: ControlLabelKey;
  icon: React.ReactNode;
  run: () => void;
  /** Present for formats (rendered as a pressed/unpressed Toggle); absent for actions. */
  pressed?: boolean;
  disabled?: boolean;
  shortcut?: Shortcut;
  /** Disclosure state for a control that opens something (the link bar). */
  expanded?: boolean;
  controls?: string;
}

function isApplePlatform() {
  if (typeof navigator === "undefined") return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** `aria-keyshortcuts` for the current platform, in the ARIA key-name vocabulary. */
function ariaShortcut(shortcut: Shortcut, apple: boolean) {
  return shortcut
    .map((key) =>
      key === "Mod" ? (apple ? "Meta" : "Control") : key.length === 1 ? key.toUpperCase() : key,
    )
    .join("+");
}

function ShortcutKeys({ shortcut, apple }: { shortcut: Shortcut; apple: boolean }) {
  const glyph = (key: string) => {
    if (key === "Mod") return apple ? "⌘" : "Ctrl";
    if (key === "Shift") return apple ? "⇧" : "Shift";
    if (key === "Alt") return apple ? "⌥" : "Alt";
    return key.toUpperCase();
  };
  return (
    <KbdGroup>
      {shortcut.map((key) => (
        <Kbd key={key}>{glyph(key)}</Kbd>
      ))}
    </KbdGroup>
  );
}

/**
 * Where a typed link actually points. A bare domain becomes `https://`, a bare address
 * `mailto:`; anything with a scheme, a path, a fragment or a query is taken as written. Whether
 * the scheme is *allowed* is Tiptap's link policy (it refuses `javascript:` and friends), not
 * this function's.
 */
function normaliseHref(raw: string) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || /^[/#?.]/.test(raw)) return raw;
  if (/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(raw)) return `mailto:${raw}`;
  return `https://${raw}`;
}

/**
 * APG toolbar: one tab stop for the whole strip; the inline-direction arrow keys (mirrored in
 * RTL), Home and End move between controls. Thirteen individually tabbable buttons in front of
 * the editing surface is a wall a keyboard user has to cross on every visit.
 *
 * Formats are `Toggle`s (`aria-pressed`); Undo, Redo and Link are actions, so they are plain
 * buttons — Link with `aria-expanded`, since it discloses the link bar. Every control carries
 * `aria-keyshortcuts` and a tooltip with its name and shortcut.
 */
function ToolbarControls({
  editor,
  label,
  messages,
  surfaceId,
  disabled,
  linkBarId,
  linkBarOpen,
  onOpenLinkBar,
}: {
  editor: Editor;
  label: string;
  messages: RichTextEditorMessages;
  surfaceId: string;
  disabled: boolean;
  linkBarId: string;
  linkBarOpen: boolean;
  onOpenLinkBar: () => void;
}) {
  // Subscribes to the editor and re-renders only when a value below actually changes, rather
  // than on every transaction.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      heading1: e.isActive("heading", { level: 1 }),
      heading2: e.isActive("heading", { level: 2 }),
      heading3: e.isActive("heading", { level: 3 }),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      // Marks cannot apply inside a code block (or to a node selection); the controls say so
      // instead of silently failing.
      canMark: e.can().toggleBold(),
      canLink: e.can().setMark("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const [requestedIndex, setRequestedIndex] = React.useState(0);
  const { arrowKeys } = useDirectionalKeys(toolbarRef, "horizontal");
  const apple = isApplePlatform();
  const chain = () => editor.chain().focus();

  const groups: ControlSpec[][] = [
    [
      {
        key: "bold",
        icon: <BoldIcon aria-hidden />,
        pressed: state.bold,
        disabled: !state.canMark,
        run: () => chain().toggleBold().run(),
        shortcut: ["Mod", "B"],
      },
      {
        key: "italic",
        icon: <ItalicIcon aria-hidden />,
        pressed: state.italic,
        disabled: !state.canMark,
        run: () => chain().toggleItalic().run(),
        shortcut: ["Mod", "I"],
      },
      {
        key: "strike",
        icon: <StrikethroughIcon aria-hidden />,
        pressed: state.strike,
        disabled: !state.canMark,
        run: () => chain().toggleStrike().run(),
        shortcut: ["Mod", "Shift", "S"],
      },
      {
        key: "code",
        icon: <CodeIcon aria-hidden />,
        pressed: state.code,
        disabled: !state.canMark,
        run: () => chain().toggleCode().run(),
        shortcut: ["Mod", "E"],
      },
    ],
    [
      {
        key: "heading1",
        icon: <Heading1Icon aria-hidden />,
        pressed: state.heading1,
        run: () => chain().toggleHeading({ level: 1 }).run(),
        shortcut: ["Mod", "Alt", "1"],
      },
      {
        key: "heading2",
        icon: <Heading2Icon aria-hidden />,
        pressed: state.heading2,
        run: () => chain().toggleHeading({ level: 2 }).run(),
        shortcut: ["Mod", "Alt", "2"],
      },
      {
        key: "heading3",
        icon: <Heading3Icon aria-hidden />,
        pressed: state.heading3,
        run: () => chain().toggleHeading({ level: 3 }).run(),
        shortcut: ["Mod", "Alt", "3"],
      },
    ],
    [
      {
        key: "bulletList",
        icon: <ListIcon aria-hidden />,
        pressed: state.bulletList,
        run: () => chain().toggleBulletList().run(),
        shortcut: ["Mod", "Shift", "8"],
      },
      {
        key: "orderedList",
        icon: <ListOrderedIcon aria-hidden />,
        pressed: state.orderedList,
        run: () => chain().toggleOrderedList().run(),
        shortcut: ["Mod", "Shift", "7"],
      },
      {
        key: "quote",
        icon: <QuoteIcon aria-hidden />,
        pressed: state.quote,
        run: () => chain().toggleBlockquote().run(),
        shortcut: ["Mod", "Shift", "B"],
      },
      {
        key: "codeBlock",
        icon: <SquareCodeIcon aria-hidden />,
        pressed: state.codeBlock,
        run: () => chain().toggleCodeBlock().run(),
        shortcut: ["Mod", "Alt", "C"],
      },
    ],
    [
      {
        key: "link",
        icon: <LinkIcon aria-hidden />,
        disabled: !state.canLink,
        run: onOpenLinkBar,
        shortcut: ["Mod", "K"],
        expanded: linkBarOpen,
        controls: linkBarOpen ? linkBarId : undefined,
      },
    ],
    [
      {
        key: "undo",
        icon: <Undo2Icon aria-hidden />,
        run: () => chain().undo().run(),
        disabled: !state.canUndo,
        shortcut: ["Mod", "Z"],
      },
      {
        key: "redo",
        icon: <Redo2Icon aria-hidden />,
        run: () => chain().redo().run(),
        disabled: !state.canRedo,
        shortcut: ["Mod", "Shift", "Z"],
      },
    ],
  ];

  const flat = groups.flat();
  const isDisabled = (spec: ControlSpec) => disabled || Boolean(spec.disabled);
  const focusable = flat.flatMap((spec, index) => (isDisabled(spec) ? [] : [index]));
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
      case arrowKeys.next:
        event.preventDefault();
        focusIndex(focusable[(current + 1) % focusable.length]);
        break;
      case arrowKeys.previous:
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

  // Actions (ghost icon Buttons) take the Toggle's icon colour, so a format and an action side by
  // side read as one kind of control. Link mirrors Toggle's pressed vocabulary — brand-subtle
  // tint, foreground icon, brand hairline — while the caret is in a link or its bar is open: it
  // is not a toggle, but it must not look less "on" than the formats beside it.
  const actionClassName = cn(
    "text-muted-foreground hover:text-foreground",
    "data-[active]:bg-brand-subtle data-[active]:text-foreground data-[active]:inset-ring data-[active]:inset-ring-border-brand data-[active]:hover:bg-brand-subtle-hover data-[active]:active:bg-brand-subtle-active data-[active]:forced-colors-selected",
  );

  let offset = 0;
  return (
    <TooltipProvider>
      <div
        ref={toolbarRef}
        data-slot="rich-text-editor-toolbar"
        role="toolbar"
        aria-label={label}
        aria-orientation="horizontal"
        aria-controls={surfaceId}
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
        // Sticky, so the formatting strip stays in reach while a long document scrolls past.
        className="sticky top-0 z-1 flex flex-wrap items-center gap-0.5 rounded-t-[calc(var(--qx-component-rich-text-editor-corner)-1px)] border-b border-(--qx-component-rich-text-editor-divider) bg-(--qx-component-rich-text-editor-toolbar-background) p-1"
      >
        {groups.map((group, groupIndex) => {
          const start = offset;
          offset += group.length;
          const last = groupIndex === groups.length - 1;
          return (
            <React.Fragment key={group[0]?.key ?? groupIndex}>
              {groupIndex > 0 && (
                <Separator
                  orientation="vertical"
                  // History is pushed to the far edge of the strip, apart from formatting.
                  className={cn("mx-1 h-5 self-center", last && "ms-auto")}
                />
              )}
              {group.map((spec, indexInGroup) => {
                const index = start + indexInGroup;
                const name = messages[spec.key];
                const common = {
                  "aria-label": name,
                  "aria-keyshortcuts": spec.shortcut
                    ? ariaShortcut(spec.shortcut, apple)
                    : undefined,
                  "data-toolbar-index": index,
                  "data-control": spec.key,
                  tabIndex: index === tabStop ? 0 : -1,
                  onFocus: () => setRequestedIndex(index),
                  disabled: isDisabled(spec),
                };
                const control =
                  spec.pressed === undefined ? (
                    <Button
                      {...common}
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-expanded={spec.expanded}
                      aria-controls={spec.controls}
                      data-active={
                        spec.key === "link" && (state.link || linkBarOpen) ? "" : undefined
                      }
                      onClick={spec.run}
                      className={actionClassName}
                    >
                      {spec.icon}
                    </Button>
                  ) : (
                    <Toggle {...common} pressed={spec.pressed} onPressedChange={spec.run}>
                      {spec.icon}
                    </Toggle>
                  );
                return (
                  <Tooltip key={spec.key}>
                    <TooltipTrigger render={control} />
                    <TooltipContent>
                      {name}
                      {spec.shortcut && <ShortcutKeys shortcut={spec.shortcut} apple={apple} />}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

/**
 * The link bar: an inline row under the toolbar rather than a popover, so it never covers the
 * text being linked, needs no positioning, and works the same in a dialog, a drawer or a narrow
 * panel. Enter applies, Escape cancels; either returns focus to the text with its selection.
 */
function LinkBar({
  editor,
  id,
  onClose,
  messages,
}: {
  editor: Editor;
  id: string;
  onClose: (refocus: boolean) => void;
  messages: RichTextEditorMessages;
}) {
  const existing = editor.getAttributes("link").href as string | undefined;
  const [href, setHref] = React.useState(existing ?? "");
  const [invalid, setInvalid] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const errorId = `${id}-error`;

  React.useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const apply = () => {
    const raw = href.trim();
    if (!raw) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      onClose(false);
      return;
    }
    const url = normaliseHref(raw);
    // Validate through the link policy before touching the document: `setLink` refuses a
    // disallowed scheme, and a dry run asks it without applying anything.
    if (!editor.can().setLink({ href: url })) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    const { empty } = editor.state.selection;
    if (empty && !editor.isActive("link")) {
      // Nothing selected to turn into a link: insert the address itself as the link text.
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: raw, marks: [{ type: "link", attrs: { href: url } }] })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    onClose(false);
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose(false);
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a named editing row inside the editor; <fieldset> would make it part of the surrounding form's controls.
    <div
      id={id}
      role="group"
      aria-label={messages.linkBar}
      data-slot="rich-text-editor-link-bar"
      className="flex flex-wrap items-center gap-2 border-b border-(--qx-component-rich-text-editor-divider) bg-(--qx-component-rich-text-editor-toolbar-background) px-2 py-1.5"
    >
      <Input
        ref={inputRef}
        // `text`, not `url`: an unnamed `type="url"` field would still take part in constraint
        // validation and could block the surrounding form's submit with a half-typed address.
        type="text"
        inputMode="url"
        autoComplete="url"
        autoCapitalize="none"
        spellCheck={false}
        aria-label={messages.linkUrl}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        placeholder={messages.linkPlaceholder}
        value={href}
        onChange={(event) => {
          setHref(event.target.value);
          setInvalid(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            // Never an implicit submit of the form the editor sits in.
            event.preventDefault();
            apply();
          } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose(true);
          }
        }}
        className="min-w-48 flex-1"
      />
      <Button type="button" onClick={apply}>
        {messages.linkApply}
      </Button>
      {existing && (
        <Button type="button" variant="ghost" onClick={remove}>
          {messages.linkRemove}
        </Button>
      )}
      <Button type="button" variant="ghost" onClick={() => onClose(true)}>
        {messages.linkCancel}
      </Button>
      {invalid && (
        <p id={errorId} className="w-full text-xs text-destructive-text">
          {messages.linkInvalid}
        </p>
      )}
    </div>
  );
}

/**
 * The visible placeholder, `aria-hidden` because the surface already carries `aria-placeholder`.
 *
 * Emptiness is subscribed to, not read during the parent's render: the editor does not re-render
 * its host on its own transactions, so `editor.isEmpty` read there left the placeholder painted
 * over the first words typed. Mounted only once the editor exists — `useEditorState` does not
 * pick up an editor that arrives after its first render until the next transaction.
 */
function Placeholder({ editor, text }: { editor: Editor; text: string }) {
  const isEmpty = useEditorState({ editor, selector: ({ editor: e }) => e.isEmpty });
  if (!isEmpty) return null;
  return (
    <p
      aria-hidden
      data-slot="rich-text-editor-placeholder"
      className="pointer-events-none absolute inset-x-0 top-0 px-3 py-2 text-start text-base leading-6 text-muted-foreground md:text-sm"
    >
      {text}
    </p>
  );
}

/*
 * The editing surface's typography. Content styling comes from the shared `proseClassName`, so a
 * document looks the same here as wherever it is rendered with `Prose`; on top of that the editor
 * sets field-sized body text (16px on small screens so iOS does not zoom, 14px from `md` — the
 * Input/Textarea convention), a compact heading scale suited to a form field, the Qeet caret,
 * and the Qeet focus ring on a selected node (a horizontal rule, for instance).
 */
const surfaceClassName = cn(
  proseClassName,
  "min-h-40 px-3 py-2 text-base outline-none md:text-sm [&_p]:leading-6",
  "caret-(--qx-component-rich-text-editor-caret)",
  "[&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold",
  "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold",
  "[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold",
  "[&_.ProseMirror-selectednode]:focus-ring",
);

/**
 * WYSIWYG rich-text editor built on Tiptap (StarterKit) with a `Toggle`-based
 * toolbar. Outputs HTML (`onChange`) and/or ProseMirror JSON (`onChangeJSON`),
 * styled with the shared {@link proseClassName}. Controlled or uncontrolled,
 * and SSR-safe (`immediatelyRender: false`).
 *
 * The frame is a form field: the 3:1 control boundary, a hover boundary, the field focus
 * treatment while focus is anywhere inside it, a destructive boundary when invalid, a sunken
 * fill when disabled and a quiet frame when read-only.
 *
 * Accessibility: the formatting strip is a named APG `toolbar` with a single tab stop, mirrored
 * arrow keys in RTL, `aria-keyshortcuts` and tooltips; `placeholder` is exposed as
 * `aria-placeholder` (the visible copy stays `aria-hidden` so it is not read twice);
 * `editable={false}` reports `aria-readonly` and stays focusable; `disabled` reports
 * `aria-disabled` and leaves the tab order. Mod+K opens the link bar.
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
  disabled = false,
  toolbarLabel,
  messages: messageOverrides,
  className,
  name,
  form,
  required,
  id,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: RichTextEditorProps) {
  const overrides = React.useMemo(
    () =>
      toolbarLabel === undefined
        ? messageOverrides
        : { ...messageOverrides, toolbar: toolbarLabel },
    [messageOverrides, toolbarLabel],
  );
  const messages = useMessages("richTextEditor", richTextEditorMessages, overrides);
  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });
  const generatedId = React.useId();
  const surfaceId = field.id ?? `${generatedId}-surface`;
  const linkBarId = `${generatedId}-link`;
  // A Field label wins over the built-in fallback; without one the surface still needs a name.
  const surfaceLabel = field["aria-labelledby"] ? undefined : (ariaLabel ?? messages.surface);
  const canEdit = editable && !disabled;
  const invalid =
    field["aria-invalid"] !== undefined &&
    field["aria-invalid"] !== false &&
    field["aria-invalid"] !== "false";

  const [linkBarOpen, setLinkBarOpen] = React.useState(false);
  const openLinkBar = React.useRef(() => {});

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
    extensions: EXTENSIONS,
    content: value ?? defaultValue ?? "",
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      // Re-applied on every render (Tiptap's React binding calls `setOptions` when they change),
      // so the ARIA state below always tracks the current props.
      attributes: {
        class: surfaceClassName,
        role: "textbox",
        "aria-multiline": "true",
        id: surfaceId,
        "data-slot": "rich-text-editor-content",
        ...(surfaceLabel ? { "aria-label": surfaceLabel } : null),
        ...(field["aria-labelledby"] ? { "aria-labelledby": field["aria-labelledby"] } : null),
        ...(field["aria-describedby"] ? { "aria-describedby": field["aria-describedby"] } : null),
        ...(field["aria-errormessage"]
          ? { "aria-errormessage": field["aria-errormessage"] }
          : null),
        ...(field["aria-invalid"] ? { "aria-invalid": String(field["aria-invalid"]) } : null),
        ...(required ? { "aria-required": "true" } : null),
        ...(placeholder ? { "aria-placeholder": placeholder } : null),
        ...(disabled ? { "aria-disabled": "true" } : null),
        // Read-only content is still content: focusable and selectable, like a native
        // read-only field. A disabled one leaves the tab order.
        ...(!editable && !disabled ? { "aria-readonly": "true", tabindex: "0" } : null),
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
          event.preventDefault();
          openLinkBar.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (latest.current.named) setOwnHtml(html);
      latest.current.onChange?.(html);
      latest.current.onChangeJSON?.(editor.getJSON());
    },
  });

  openLinkBar.current = () => {
    // Same availability as the toolbar control, so Mod+K cannot open a bar that can only fail.
    if (canEdit && editor?.can().setMark("link")) setLinkBarOpen(true);
  };

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
    // change was dirty from the first paint. The toolbar tracks state, not `update`, so
    // suppressing the emit costs nothing.
    if (editor && editor.isEditable !== canEdit) {
      editor.setEditable(canEdit, false);
    }
  }, [editor, canEdit]);

  React.useEffect(() => {
    if (!canEdit) setLinkBarOpen(false);
  }, [canEdit]);

  const closeLinkBar = (refocus: boolean) => {
    setLinkBarOpen(false);
    if (refocus) editor?.commands.focus();
  };

  return (
    <div
      data-slot="rich-text-editor"
      data-invalid={invalid ? "" : undefined}
      data-readonly={!editable && !disabled ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      className={cn(
        "relative flex flex-col rounded-(--qx-component-rich-text-editor-corner) border border-(--qx-component-rich-text-editor-border) bg-(--qx-component-rich-text-editor-background) text-foreground transition-[border-color] duration-(--qx-motion-duration-fast) ease-standard",
        // The field focus treatment while focus is anywhere in the editor — text or toolbar —
        // because the whole frame is one field. The focused control adds its own ring on top.
        "focus-within:focus-ring-field",
        canEdit && "hover:border-(--qx-component-rich-text-editor-border-hover)",
        // State variants rather than conditional classes, so each outranks hover and focus.
        "data-invalid:border-destructive data-invalid:hover:border-destructive data-invalid:focus-within:border-destructive data-invalid:focus-within:outline-destructive",
        "data-readonly:border-(--qx-component-rich-text-editor-border-readonly)",
        "data-disabled:cursor-not-allowed data-disabled:bg-(--qx-component-rich-text-editor-background-disabled) data-disabled:opacity-disabled",
        className,
      )}
    >
      <FieldHiddenInput name={name} value={value ?? ownHtml} form={form} disabled={disabled} />
      {editable && editor && (
        <ToolbarControls
          editor={editor}
          label={messages.toolbar}
          messages={messages}
          surfaceId={surfaceId}
          disabled={disabled}
          linkBarId={linkBarId}
          linkBarOpen={linkBarOpen}
          onOpenLinkBar={() => openLinkBar.current()}
        />
      )}
      {linkBarOpen && editor && (
        <LinkBar editor={editor} id={linkBarId} onClose={closeLinkBar} messages={messages} />
      )}
      <div className="relative">
        {editor && placeholder && <Placeholder editor={editor} text={placeholder} />}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export type { RichTextEditorProps };
export { RichTextEditor };
