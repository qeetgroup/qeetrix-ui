"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/Avatar/avatar";
import { Button } from "@/components/Button/button";
import { Textarea } from "@/components/Input/textarea";
import { type Reaction, ReactionBar } from "@/components/ReactionBar/reaction-bar";
import { TimeSince } from "@/components/TimeSince/time-since";
import type { CommentThreadMessages, MessagesFor } from "@/lib/messages";
import { commentThreadMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

interface CommentAuthor {
  name: string;
  avatarUrl?: string;
}
interface CommentNode {
  id: string;
  author: CommentAuthor;
  body: React.ReactNode;
  createdAt: string | Date | number;
  reactions?: Reaction[];
  replies?: CommentNode[];
}
interface CommentThreadProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  comments: CommentNode[];
  currentUser?: CommentAuthor;
  /** Called for a new top-level comment, or a reply when `parentId` is set. */
  onSubmit?: (body: string, parentId?: string) => void;
  onReact?: (commentId: string, emoji: string) => void;
  /**
   * Placeholder of the top-level composer. Equivalent to `messages={{ placeholder }}` and wins
   * over it.
   */
  placeholder?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"commentThread">;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PersonAvatar({ author }: { author: CommentAuthor }) {
  return (
    <Avatar size="sm">
      <AvatarImage src={author.avatarUrl} alt="" />
      <AvatarFallback>{initials(author.name)}</AvatarFallback>
    </Avatar>
  );
}

function Composer({
  currentUser,
  placeholder,
  autoFocus,
  onSubmit,
  messages,
}: {
  currentUser?: CommentAuthor;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit: (body: string) => void;
  /** Resolved once at the root and threaded down, so every composer reads alike. */
  messages: CommentThreadMessages;
}) {
  const [body, setBody] = React.useState("");
  return (
    <div className="flex gap-2">
      {currentUser && <PersonAvatar author={currentUser} />}
      <div className="flex-1 space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label={messages.label}
          className="min-h-12"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!body.trim()}
            onClick={() => {
              onSubmit(body.trim());
              setBody("");
            }}
          >
            {messages.submit}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  node,
  currentUser,
  onReact,
  onReply,
  messages,
}: {
  node: CommentNode;
  currentUser?: CommentAuthor;
  onReact?: (commentId: string, emoji: string) => void;
  onReply?: (parentId: string, body: string) => void;
  messages: CommentThreadMessages;
}) {
  const [replying, setReplying] = React.useState(false);
  return (
    <div className="flex gap-2" data-slot="comment">
      <PersonAvatar author={node.author} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{node.author.name}</span>
          <TimeSince value={node.createdAt} className="text-xs" />
        </div>
        <div className="text-sm text-foreground">{node.body}</div>
        <div className="flex items-center gap-2">
          {node.reactions && node.reactions.length > 0 && (
            <ReactionBar reactions={node.reactions} onToggle={(e) => onReact?.(node.id, e)} />
          )}
          {onReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setReplying((r) => !r)}
            >
              {messages.reply}
            </Button>
          )}
        </div>
        {replying && onReply && (
          <Composer
            currentUser={currentUser}
            placeholder={messages.replyPlaceholder}
            autoFocus
            onSubmit={(b) => {
              onReply(node.id, b);
              setReplying(false);
            }}
            messages={messages}
          />
        )}
        {node.replies && node.replies.length > 0 && (
          <div className="mt-2 space-y-3 border-s border-border ps-3">
            {node.replies.map((r) => (
              <CommentItem
                key={r.id}
                node={r}
                currentUser={currentUser}
                onReact={onReact}
                onReply={onReply}
                messages={messages}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Threaded comments with avatars, relative timestamps, reactions, replies, and a composer. */
function CommentThread({
  comments,
  currentUser,
  onSubmit,
  onReact,
  placeholder,
  messages: messageOverrides,
  className,
  ...props
}: CommentThreadProps) {
  const messages = useMessages("commentThread", commentThreadMessages, messageOverrides);
  return (
    <div data-slot="comment-thread" className={cn("space-y-4", className)} {...props}>
      <div className="space-y-4">
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            node={c}
            currentUser={currentUser}
            onReact={onReact}
            onReply={onSubmit ? (parentId, body) => onSubmit(body, parentId) : undefined}
            messages={messages}
          />
        ))}
      </div>
      {onSubmit && (
        <Composer
          currentUser={currentUser}
          placeholder={placeholder ?? messages.placeholder}
          onSubmit={(b) => onSubmit(b)}
          messages={messages}
        />
      )}
    </div>
  );
}

export type { CommentAuthor, CommentNode, CommentThreadProps };
export { CommentThread };
