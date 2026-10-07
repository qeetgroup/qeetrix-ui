"use client";

import { FaceSlightlySmilingPlusIcon } from "@qeetrix/icons/icons/face-slightly-smiling-plus";
import * as React from "react";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/Popover/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip/tooltip";
import type { MessagesFor } from "@/lib/messages";
import { reactionBarMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

interface Reaction {
  emoji: string;
  count: number;
  reacted?: boolean;
  /**
   * The emoji's spoken name — "thumbs up". Screen readers name emoji inconsistently, and some
   * not at all, so when given this replaces the glyph in the accessible name.
   */
  label?: string;
  /**
   * Who reacted, most relevant first. Shown in a tooltip and read as the reaction's
   * description — in a workplace tool, *who* acknowledged is usually the useful part.
   */
  users?: string[];
}

interface ReactionBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect" | "onToggle"> {
  reactions: Reaction[];
  onToggle?: (emoji: string) => void;
  /** Emoji offered in the picker. Defaults to a short, work-oriented set. */
  choices?: string[];
  /**
   * Show the reactions without letting the viewer change them — an archived thread, a
   * locked record, an export. No picker, and the pills are not buttons.
   */
  readOnly?: boolean;
  /** Disables every reaction control, e.g. while a toggle is being saved. */
  disabled?: boolean;
  /** BCP 47 locale for counts. Counts of 1,000 and up are shown compact ("1.2K"). */
  locale?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"reactionBar">;
}

/**
 * Restrained by default: acknowledgement, agreement, "looking", done, thanks — the reactions
 * that carry information in a workplace thread — rather than a social-media palette.
 */
const DEFAULT_CHOICES = ["👍", "👎", "✅", "👀", "🎉", "🙏", "❤️", "😄"];
const PICKER_COLUMNS = 4;

const PILL =
  "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs tabular-nums transition-colors duration-fast ease-standard motion-reduce:transition-none";

/**
 * Inline reactions with a "+" picker, for comments, approvals and activity feeds.
 *
 * Designed to stay quiet: pills are 24px, neutral until *you* have reacted — then they take
 * the Qeet selected vocabulary (brand-subtle tint, brand outline, heavier count), so your own
 * reactions are findable without the bar turning orange. Each pill is a toggle button
 * (`aria-pressed`); who reacted is shown on hover and focus and read as its description.
 */
function ReactionBar({
  reactions,
  onToggle,
  choices = DEFAULT_CHOICES,
  readOnly = false,
  disabled = false,
  locale,
  messages: messageOverrides,
  className,
  ...props
}: ReactionBarProps) {
  const messages = useMessages("reactionBar", reactionBarMessages, messageOverrides);
  const baseId = React.useId();
  const reacted = new Set(reactions.filter((r) => r.reacted).map((r) => r.emoji));
  const format = React.useMemo(() => {
    const compact = new Intl.NumberFormat(locale, { notation: "compact" });
    return (count: number) => (count >= 1000 ? compact.format(count) : String(count));
  }, [locale]);

  return (
    // biome-ignore lint/a11y/useSemanticElements: a named group of reactions; <fieldset> would add form semantics.
    <div
      role="group"
      aria-label={messages.label}
      data-slot="reaction-bar"
      className={cn("flex flex-wrap items-center gap-1", className)}
      {...props}
    >
      {reactions.map((r, index) => {
        const name = messages.reactionCount(r.label ?? r.emoji, r.count);
        const who =
          r.users && r.users.length > 0
            ? messages.reactedBy(r.users.slice(0, 3), Math.max(r.count, r.users.length))
            : null;
        const whoId = who ? `${baseId}-who-${index}` : undefined;
        const content = (
          <>
            <span aria-hidden className="text-sm leading-none">
              {r.emoji}
            </span>
            <span aria-hidden className={cn(r.reacted && "font-semibold")}>
              {format(r.count)}
            </span>
          </>
        );

        if (readOnly) {
          return (
            <span
              key={r.emoji}
              data-slot="reaction"
              data-reacted={r.reacted || undefined}
              className={cn(
                PILL,
                r.reacted
                  ? "border-border-brand bg-brand-subtle text-foreground forced-colors:border-2"
                  : "border-border text-muted-foreground",
              )}
            >
              {content}
              <span className="sr-only">
                {name}
                {who && `, ${who}`}
              </span>
            </span>
          );
        }

        const button = (
          <button
            type="button"
            data-slot="reaction"
            data-reacted={r.reacted || undefined}
            aria-pressed={!!r.reacted}
            aria-label={name}
            aria-describedby={whoId}
            disabled={disabled}
            onClick={() => onToggle?.(r.emoji)}
            className={cn(
              PILL,
              "outline-none focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-disabled",
              r.reacted
                ? // Forced colours drop the tint; a heavier outline keeps "you reacted" visible.
                  "border-border-brand bg-brand-subtle text-foreground hover:bg-brand-subtle-hover active:bg-brand-subtle-active forced-colors:border-2"
                : "border-border bg-transparent text-muted-foreground hover:bg-surface-interactive-hover hover:text-foreground active:bg-surface-interactive-active",
            )}
          >
            {content}
          </button>
        );

        if (!who) return <React.Fragment key={r.emoji}>{button}</React.Fragment>;
        return (
          <Tooltip key={r.emoji}>
            <TooltipTrigger render={button} />
            <TooltipContent>{who}</TooltipContent>
            <span id={whoId} hidden>
              {who}
            </span>
          </Tooltip>
        );
      })}

      {!readOnly && (
        <Popover>
          <PopoverTrigger
            disabled={disabled}
            render={
              <button
                type="button"
                disabled={disabled}
                data-slot="reaction-bar-add"
                aria-label={messages.addReaction}
                className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors duration-fast ease-standard outline-none hover:bg-surface-interactive-hover hover:text-foreground focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-disabled aria-expanded:bg-surface-interactive-hover aria-expanded:text-foreground motion-reduce:transition-none"
              >
                <FaceSlightlySmilingPlusIcon aria-hidden className="size-3.5" />
              </button>
            }
          />
          <PopoverContent align="start" aria-label={messages.addReaction} className="w-auto p-1.5">
            {/* Arrow keys move through the grid as an accelerator; Tab still reaches every
                option, so nothing depends on discovering the arrow keys. */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: key delegation over a grid of real buttons; the container itself is not a control. */}
            <div
              className="grid grid-cols-4 gap-0.5"
              onKeyDown={(event) => {
                const keys: Record<string, number> = {
                  ArrowRight: 1,
                  ArrowLeft: -1,
                  ArrowDown: PICKER_COLUMNS,
                  ArrowUp: -PICKER_COLUMNS,
                };
                let step = keys[event.key];
                if (step === undefined) return;
                if (getComputedStyle(event.currentTarget).direction === "rtl") {
                  if (event.key === "ArrowRight" || event.key === "ArrowLeft") step = -step;
                }
                const options = Array.from(
                  event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
                );
                const current = options.indexOf(document.activeElement as HTMLButtonElement);
                const next = options[current + step];
                if (current === -1 || !next) return;
                event.preventDefault();
                next.focus();
              }}
            >
              {choices.map((e) => (
                <PopoverClose
                  key={e}
                  render={
                    <button
                      type="button"
                      aria-label={messages.react(e)}
                      aria-pressed={reacted.has(e)}
                      onClick={() => onToggle?.(e)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-(--qx-corner-control) text-lg transition-colors duration-fast ease-standard outline-none focus-visible:focus-ring-inset motion-reduce:transition-none",
                        reacted.has(e)
                          ? "bg-brand-subtle hover:bg-brand-subtle-hover"
                          : "hover:bg-surface-interactive-hover",
                      )}
                    >
                      {e}
                    </button>
                  }
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export type { Reaction, ReactionBarProps };
export { ReactionBar };
