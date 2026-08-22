"use client";

import { SmilePlusIcon } from "lucide-react";
import type * as React from "react";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/Popover/popover";
import type { MessagesFor } from "@/lib/messages";
import { reactionBarMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

interface Reaction {
  emoji: string;
  count: number;
  reacted?: boolean;
}

interface ReactionBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect" | "onToggle"> {
  reactions: Reaction[];
  onToggle?: (emoji: string) => void;
  /** Emoji offered in the picker. */
  choices?: string[];
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"reactionBar">;
}

const DEFAULT_CHOICES = ["👍", "❤️", "😄", "🎉", "😮", "😢", "🙏", "🔥", "👀", "✅"];

/** Inline emoji reactions with a "+" picker (chat, comments, feeds). */
function ReactionBar({
  reactions,
  onToggle,
  choices = DEFAULT_CHOICES,
  messages: messageOverrides,
  className,
  ...props
}: ReactionBarProps) {
  const messages = useMessages("reactionBar", reactionBarMessages, messageOverrides);
  return (
    <div
      data-slot="reaction-bar"
      className={cn("flex flex-wrap items-center gap-1", className)}
      {...props}
    >
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          aria-pressed={r.reacted}
          aria-label={messages.reactionCount(r.emoji, r.count)}
          onClick={() => onToggle?.(r.emoji)}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs tabular-nums outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            r.reacted
              ? "border-primary/40 bg-primary/10 text-foreground"
              : "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <span aria-hidden>{r.emoji}</span>
          {r.count}
        </button>
      ))}

      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={messages.addReaction}
              className="inline-flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <SmilePlusIcon aria-hidden className="size-3.5" />
            </button>
          }
        />
        <PopoverContent align="start" className="w-auto p-1.5">
          <div className="grid grid-cols-5 gap-0.5">
            {choices.map((e) => (
              <PopoverClose
                key={e}
                render={
                  <button
                    type="button"
                    aria-label={messages.react(e)}
                    onClick={() => onToggle?.(e)}
                    className="flex size-8 items-center justify-center rounded-md text-lg outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {e}
                  </button>
                }
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export type { Reaction, ReactionBarProps };
export { ReactionBar };
