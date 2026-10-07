"use client";

import { XIcon } from "@qeetrix/icons/icons/x";
import * as React from "react";

import { Badge } from "@/components/Badge/badge";
import { FieldHiddenInput, useFieldControl } from "@/components/Input/field";
import { fieldGroupInput, fieldGroupSurface } from "@/internal/field-styles";
import { VisuallyHidden } from "@/internal/visually-hidden";
import { logicalDirectionForKey } from "@/lib/direction";
import type { MessagesFor, TagInputMessages } from "@/lib/messages";
import { tagInputMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useResolvedDirection } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

interface TagInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "size"> {
  /** Current tags (controlled). */
  value: string[];
  /** Called with the next tag list whenever a tag is added or removed. */
  onChange: (next: string[]) => void;
  /** Also commit the current text when a comma is typed. Defaults to `true`. */
  addOnComma?: boolean;
  /** Reject case-insensitive duplicates. Defaults to `true`. */
  dedupe?: boolean;
  /** Hard cap on the number of tags. */
  maxTags?: number;
  /**
   * Validate/normalise a candidate tag before it is added. Return the
   * cleaned string to accept, or `null`/empty to reject silently.
   */
  validate?: (tag: string) => string | null;
  disabled?: boolean;
  /**
   * Submits the tags under this name, one value per tag (`FormData.getAll(name)`), not the text
   * being typed. Omit and nothing is serialised.
   */
  name?: string;
  /** Overrides for the built-in English strings (remove-button names, announcements). */
  messages?: MessagesFor<"tagInput">;
  className?: string;
}

/**
 * Free-form chips input: type and press Enter (or comma) to add a tag, Backspace on an empty
 * field to remove the last one. Controlled — the parent owns the `string[]`. For a fixed option
 * set, prefer `MultiSelect`.
 *
 * - **Many at once.** Typing or pasting `design, a11y, rtl` adds all three, in order, through
 *   one `onChange`; text after the last comma stays in the field as the next draft. Pasted
 *   line-separated lists split the same way.
 * - **Keyboard deletion.** ArrowLeft at the start of the field moves onto the tags (ArrowRight
 *   under RTL), arrows move between them, Backspace/Delete removes the focused tag and keeps
 *   focus in the list, and moving past the last tag returns to the field. Tags are not tab stops,
 *   so the control is one stop in the tab order.
 * - **Announcements.** Additions and removals are announced politely, so a removal by
 *   Backspace is never silent.
 * - **Overflow.** The field grows with its tags, and one very long tag truncates instead of
 *   widening the form.
 * - **Forms.** Inside a `Field`, the text input takes the label, description and error. `name`
 *   submits the tags themselves, never the draft.
 */
function TagInput({
  value,
  onChange,
  addOnComma = true,
  dedupe = true,
  maxTags,
  validate,
  disabled,
  readOnly,
  name,
  form,
  messages: messageOverrides,
  className,
  onKeyDown,
  onBlur,
  onPaste,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-errormessage": ariaErrormessage,
  "aria-invalid": ariaInvalid,
  ...props
}: TagInputProps) {
  // Resolved, not spread: an `undefined` override falls back instead of blanking a name.
  const messages = useMessages("tagInput", tagInputMessages, messageOverrides);
  const [draft, setDraft] = React.useState("");
  const [announcement, setAnnouncement] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const tagRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const direction = useResolvedDirection(rootRef);

  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    "aria-errormessage": ariaErrormessage,
    "aria-invalid": ariaInvalid,
  });

  /** Add every candidate in order, against the list as it grows, through one `onChange`. */
  function addTags(candidates: string[]) {
    if (readOnly || disabled) return;
    const next = [...value];
    const added: string[] = [];
    for (const candidate of candidates) {
      let tag = candidate.trim();
      if (!tag) continue;
      if (validate) {
        const cleaned = validate(tag);
        if (!cleaned) continue;
        tag = cleaned;
      }
      if (dedupe && next.some((t) => t.toLowerCase() === tag.toLowerCase())) continue;
      if (maxTags != null && next.length >= maxTags) break;
      next.push(tag);
      added.push(tag);
    }
    if (added.length > 0) {
      onChange(next);
      setAnnouncement(added.map(messages.added).filter(Boolean).join(". "));
    }
  }

  function removeAt(index: number) {
    // Read-only shows the tags and keeps them: no Backspace, no remove button.
    if (readOnly || disabled) return;
    const removed = value[index];
    onChange(value.filter((_, i) => i !== index));
    if (removed !== undefined) setAnnouncement(messages.removed(removed));
  }

  /** Split typed or pasted text on its separators: the last piece is still being typed. */
  function commitText(text: string, keepTail: boolean) {
    const pieces = text.split(addOnComma ? /[,\n\r\t]/ : /[\n\r\t]/);
    const tail = keepTail ? (pieces.pop() ?? "") : "";
    addTags(pieces);
    setDraft(tail);
  }

  /** Focus the tag at `index`, or the text field when there is no such tag (any more). */
  function focusTag(index: number) {
    const tag = index >= 0 ? tagRefs.current[index] : null;
    if (tag?.isConnected) tag.focus();
    else inputRef.current?.focus();
  }

  function handleTagKeyDown(index: number, e: React.KeyboardEvent<HTMLButtonElement>) {
    const toward =
      e.key === "ArrowLeft" || e.key === "ArrowRight"
        ? logicalDirectionForKey(e.key, direction)
        : null;
    if (toward === "inline-start") {
      e.preventDefault();
      focusTag(Math.max(0, index - 1));
    } else if (toward === "inline-end") {
      e.preventDefault();
      focusTag(index + 1);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      removeAt(index);
      // Focus the tag that takes this one's place — the previous one for Backspace — or the
      // field once none are left. Deferred until the list has re-rendered.
      const target = e.key === "Backspace" ? Math.max(0, index - 1) : index;
      const remaining = value.length - 1;
      queueMicrotask(() => focusTag(target < remaining ? target : remaining - 1));
    } else if (e.key === "Escape" || e.key === "End") {
      e.preventDefault();
      inputRef.current?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      focusTag(0);
    }
  }

  return (
    <div
      ref={rootRef}
      data-slot="tag-input"
      data-disabled={disabled || undefined}
      className={cn(
        fieldGroupSurface,
        "flex min-h-(--qx-component-input-height) flex-wrap items-center gap-1 px-1 py-[calc((var(--qx-component-input-height)-1.5rem-2px)/2)] text-sm",
        className,
      )}
      onPointerDown={(e) => {
        // Clicking the field's empty area puts the caret in the text input, as in any field.
        if (e.target === e.currentTarget) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }}
    >
      {value.map((tag, i) => {
        // Tags may repeat when dedupe is disabled; disambiguate the React key
        // by how many identical tags precede this one (never the array index).
        const priorDupes = value.slice(0, i).filter((t) => t === tag).length;
        const tagKey = priorDupes === 0 ? tag : `${tag} ${priorDupes}`;
        return (
          <Badge
            key={tagKey}
            variant="secondary"
            data-slot="tag-input-tag"
            className={cn("h-6 max-w-full min-w-0 gap-1", !readOnly && "pe-0.5")}
          >
            <span className="min-w-0 truncate" title={tag}>
              {tag}
            </span>
            {!readOnly && (
              <button
                ref={(el) => {
                  tagRefs.current[i] = el;
                }}
                type="button"
                tabIndex={-1}
                disabled={disabled}
                aria-label={messages.remove(tag)}
                data-slot="tag-input-remove"
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors duration-fast hover:bg-foreground/10 hover:text-foreground focus-visible:focus-ring-inset focus-visible:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                  inputRef.current?.focus();
                }}
                onKeyDown={(e) => handleTagKeyDown(i, e)}
              >
                <XIcon aria-hidden className="size-3" />
              </button>
            )}
          </Badge>
        );
      })}
      <input
        ref={inputRef}
        data-slot="tag-input-field"
        value={draft}
        disabled={disabled}
        readOnly={readOnly}
        enterKeyHint="enter"
        id={field.id}
        aria-label={ariaLabel}
        aria-labelledby={field["aria-labelledby"]}
        aria-describedby={field["aria-describedby"]}
        aria-errormessage={field["aria-errormessage"]}
        aria-invalid={field["aria-invalid"]}
        className={cn(fieldGroupInput, "h-6 min-w-24 px-1.5")}
        onChange={(e) => {
          const next = e.target.value;
          if (addOnComma && next.includes(",")) {
            commitText(next, true);
          } else {
            setDraft(next);
          }
        }}
        onPaste={(e) => {
          onPaste?.(e);
          if (e.defaultPrevented) return;
          const text = e.clipboardData.getData("text");
          // Only a list needs handling here; a single word pastes as ordinary text.
          if (!/[\n\r\t]/.test(text) && !(addOnComma && text.includes(","))) return;
          e.preventDefault();
          const el = e.currentTarget;
          const start = el.selectionStart ?? draft.length;
          const end = el.selectionEnd ?? draft.length;
          commitText(draft.slice(0, start) + text + draft.slice(end), false);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          const el = e.currentTarget;
          const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
          if (e.key === "Enter") {
            e.preventDefault();
            commitText(draft, false);
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            removeAt(value.length - 1);
          } else if (
            (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
            logicalDirectionForKey(e.key, direction) === "inline-start" &&
            atStart &&
            value.length > 0
          ) {
            e.preventDefault();
            focusTag(value.length - 1);
          }
        }}
        onBlur={(e) => {
          commitText(draft, false);
          onBlur?.(e);
        }}
        {...props}
      />
      {name
        ? value.map((tag, i) => (
            <FieldHiddenInput
              // biome-ignore lint/suspicious/noArrayIndexKey: hidden values are positional
              key={i}
              name={name}
              value={tag}
              form={form}
              disabled={disabled}
            />
          ))
        : null}
      <VisuallyHidden role="status" aria-live="polite" data-slot="tag-input-status">
        {announcement}
      </VisuallyHidden>
    </div>
  );
}

export type { TagInputMessages, TagInputProps };
export { TagInput };
