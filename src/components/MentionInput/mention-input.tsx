"use client";

import * as React from "react";
import { Textarea } from "@/components/Input/textarea";
import type { MessagesFor } from "@/lib/messages";
import { mentionInputMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@/internal/visually-hidden";
import { useMessages } from "@/providers/messages-provider";

interface MentionPerson {
  id: string;
  label: string;
}

interface MentionInputProps extends Omit<React.ComponentProps<"textarea">, "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  people: MentionPerson[];
  onMention?: (person: MentionPerson) => void;
  /** Character that opens the suggestion list. Default "@". */
  trigger?: string;
  /**
   * Text announced politely whenever the suggestion count changes. Replace it
   * to translate. Return `""` to opt out of the announcement.
   *
   * Equivalent to `messages={{ suggestionCount }}` and wins over it.
   */
  suggestionCountLabel?: (count: number) => string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"mentionInput">;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Textarea with `@`-mention typeahead. On trigger, a filtered people list opens;
 * arrow keys + Enter (or click) insert the mention. Controlled via value/onValueChange.
 *
 * The control keeps native `textbox` semantics rather than becoming a
 * `combobox`: it is a multiline composer, and `role="combobox"` would drop
 * `aria-multiline`. ARIA does not allow `aria-expanded` on `textbox` either, so
 * the open/closed state and the number of matches are announced through a
 * polite live region instead (`suggestionCountLabel`).
 *
 * The popup closes on Escape, on selection, and when focus leaves the control —
 * a blur used to leave the suggestions floating over the page.
 */
function MentionInput({
  value,
  onValueChange,
  people,
  onMention,
  trigger = "@",
  className,
  onKeyDown,
  onBlur,
  suggestionCountLabel,
  messages: messageOverrides,
  ...props
}: MentionInputProps) {
  const messages = useMessages("mentionInput", mentionInputMessages, messageOverrides);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();
  const [query, setQuery] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(0);

  const textarea = () => containerRef.current?.querySelector("textarea") ?? null;

  const detect = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const m = before.match(new RegExp(`(?:^|\\s)${escapeRegExp(trigger)}(\\w*)$`));
    setQuery(m ? m[1] : null);
    setActive(0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange(e.target.value);
    detect(e.target.value, e.target.selectionStart ?? e.target.value.length);
  };

  const suggestions =
    query != null
      ? people.filter((p) => p.label.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
      : [];
  const isOpen = query != null && suggestions.length > 0;
  const activeIndex = Math.min(active, Math.max(0, suggestions.length - 1));
  const activeId = isOpen ? `${listboxId}-option-${activeIndex}` : undefined;

  // Keep the active option visible: the popup scrolls at 12rem tall, so arrowing
  // past the sixth match used to move an option the user could not see.
  React.useEffect(() => {
    if (!activeId) return;
    const node = listRef.current?.querySelector(`[id="${activeId}"]`);
    (node as HTMLElement | null)?.scrollIntoView?.({ block: "nearest" });
  }, [activeId]);

  const insert = (p: MentionPerson) => {
    const el = textarea();
    const caret = el?.selectionStart ?? value.length;
    const before = value
      .slice(0, caret)
      .replace(new RegExp(`${escapeRegExp(trigger)}\\w*$`), `${trigger}${p.label} `);
    const next = before + value.slice(caret);
    onValueChange(next);
    onMention?.(p);
    setQuery(null);
    queueMicrotask(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    onBlur?.(e);
    // Focus moving inside the popup (mouse-down on an option) must not dismiss it.
    const next = e.relatedTarget;
    if (next instanceof Node && containerRef.current?.contains(next)) return;
    setQuery(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(e);
    if (query == null || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      insert(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setQuery(null);
    }
  };

  return (
    <div ref={containerRef} data-slot="mention-input" className={cn("relative", className)}>
      <Textarea
        {...props}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={activeId}
      />
      <VisuallyHidden role="status" aria-live="polite" data-slot="mention-input-status">
        {isOpen ? (suggestionCountLabel ?? messages.suggestionCount)(suggestions.length) : ""}
      </VisuallyHidden>
      {isOpen && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={messages.suggestions}
          className="absolute z-50 mt-1 max-h-48 w-56 overflow-auto rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-popover"
        >
          {suggestions.map((p, i) => (
            <button
              key={p.id}
              id={`${listboxId}-option-${i}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                insert(p);
              }}
              className={cn(
                "w-full cursor-default rounded-md px-2 py-1.5 text-start outline-none",
                i === activeIndex && "bg-accent text-accent-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type { MentionInputProps, MentionPerson };
export { MentionInput };
