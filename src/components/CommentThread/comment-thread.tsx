"use client";

import { EllipsisIcon } from "@qeetrix/icons/icons/ellipsis";
import { PencilIcon } from "@qeetrix/icons/icons/pencil";
import { TrashIcon } from "@qeetrix/icons/icons/trash";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/Avatar/avatar";
import { Badge } from "@/components/Badge/badge";
import { Button } from "@/components/Button/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu/dropdown-menu";
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
  /**
   * Stable identity. Used to tell the current user's own comments apart for the default
   * edit / delete permission; falls back to comparing `name` when either side has no `id`.
   */
  id?: string;
  /** A short tag beside the name — "Author", "Admin", "Bot", "External". */
  badge?: React.ReactNode;
}
interface CommentNode {
  id: string;
  author: CommentAuthor;
  body: React.ReactNode;
  createdAt: string | Date | number;
  reactions?: Reaction[];
  replies?: CommentNode[];
  /** When the body was last changed. Adds an "edited" marker after the time. */
  editedAt?: string | Date | number;
  /**
   * Renders a tombstone instead of the body and drops the comment's own actions; its replies
   * stay, so a deleted comment never orphans a conversation.
   */
  deleted?: boolean;
  /**
   * The plain-text source of `body`, used to seed the editor when `body` is rich (mentions,
   * links, formatting). A string `body` is its own source. Without either, the comment
   * cannot be edited here.
   */
  source?: string;
}

type ResolvedMessages = CommentThreadMessages;

interface CommentThreadProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  comments: CommentNode[];
  currentUser?: CommentAuthor;
  /** Called for a new top-level comment, or a reply when `parentId` is set. */
  onSubmit?: (body: string, parentId?: string) => void;
  onReact?: (commentId: string, emoji: string) => void;
  /** Called with the edited plain text. Enables Edit where `canEdit` allows it. */
  onEdit?: (commentId: string, body: string) => void;
  /** Called after the inline confirmation. Enables Delete where `canDelete` allows it. */
  onDelete?: (commentId: string) => void;
  /** Who may edit a comment. @default the current user's own comments */
  canEdit?: (comment: CommentNode) => boolean;
  /** Who may delete a comment. @default the current user's own comments */
  canDelete?: (comment: CommentNode) => boolean;
  /**
   * Clamp long comment bodies to this many lines, with a "Show more" toggle. Omitted, bodies
   * render in full.
   */
  maxBodyLines?: number;
  /**
   * Nesting level beyond which replies stop indenting and line up with their parent, so a
   * deep conversation cannot squeeze its text into a sliver. @default 2
   */
  maxIndent?: number;
  /** Shown above the composer when there are no comments yet. */
  emptyState?: React.ReactNode;
  /**
   * Placeholder of the top-level composer. Equivalent to `messages={{ placeholder }}` and wins
   * over it.
   */
  placeholder?: string;
  /** BCP 47 locale for timestamps. */
  locale?: string;
  /** IANA time zone for timestamps; pass it when server-rendering. */
  timeZone?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"commentThread">;
}

interface ThreadContext {
  currentUser?: CommentAuthor;
  onReact?: (commentId: string, emoji: string) => void;
  onReply?: (parentId: string, body: string) => void;
  onEdit?: (commentId: string, body: string) => void;
  onDelete?: (commentId: string) => void;
  canEdit: (comment: CommentNode) => boolean;
  canDelete: (comment: CommentNode) => boolean;
  maxBodyLines?: number;
  maxIndent: number;
  locale?: string;
  timeZone?: string;
  messages: ResolvedMessages;
  /** Where focus goes once a deleted comment's controls are gone. */
  focusThread: () => void;
}

function isSameAuthor(a?: CommentAuthor, b?: CommentAuthor) {
  if (!a || !b) return false;
  if (a.id != null && b.id != null) return a.id === b.id;
  return a.name === b.name;
}

/** ⌘/Ctrl+Enter submits; it is what every chat and review tool has taught people. */
function isSubmitShortcut(event: React.KeyboardEvent) {
  return event.key === "Enter" && (event.metaKey || event.ctrlKey);
}

/**
 * The author's avatar. Decorative: the name is visible right beside it, so the image has an
 * empty alt and the initials are hidden rather than spelled out ("A L") after the name.
 * `name` still drives Avatar's grapheme-safe initials.
 */
function PersonAvatar({ author }: { author: CommentAuthor }) {
  return (
    <Avatar size="sm" name={author.name} className="mt-px">
      <AvatarImage src={author.avatarUrl} alt="" />
      <AvatarFallback aria-hidden />
    </Avatar>
  );
}

interface CommentMentionProps extends React.ComponentProps<"span"> {
  /** The mention is of the person reading — tinted so it can be found at a glance. */
  self?: boolean;
  /** Renders the mention as a link to the person's profile. */
  href?: string;
}

/**
 * An @-mention inside a comment body. Others' mentions read as links (`text-link`); a mention
 * of the current reader takes the quiet Qeet tint, so "you were mentioned" is findable in a
 * long thread without colour being the only cue — the name is still right there.
 */
function CommentMention({
  self = false,
  href,
  className,
  children,
  ...props
}: CommentMentionProps) {
  const classes = cn(
    "rounded-(--qx-corner-xs) font-medium",
    self ? "bg-brand-subtle px-0.5 text-foreground" : "text-link",
    className,
  );
  if (href) {
    return (
      <a
        data-slot="comment-mention"
        data-self={self || undefined}
        href={href}
        className={cn(
          classes,
          "underline-offset-2 outline-none hover:underline focus-visible:focus-ring",
          !self && "hover:text-link-hover",
        )}
      >
        {children}
      </a>
    );
  }
  return (
    <span data-slot="comment-mention" data-self={self || undefined} className={classes} {...props}>
      {children}
    </span>
  );
}

function Composer({
  currentUser,
  placeholder,
  autoFocus,
  onSubmit,
  onCancel,
  messages,
}: {
  currentUser?: CommentAuthor;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit: (body: string) => void;
  /** Reply composers can be dismissed; the top-level composer cannot. */
  onCancel?: () => void;
  /** Resolved once at the root and threaded down, so every composer reads alike. */
  messages: ResolvedMessages;
}) {
  const [body, setBody] = React.useState("");
  const submit = () => {
    if (!body.trim()) return;
    onSubmit(body.trim());
    setBody("");
  };
  return (
    <div data-slot="comment-composer" className="flex gap-3">
      {currentUser && <PersonAvatar author={currentUser} />}
      <div className="min-w-0 flex-1 space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(event) => {
            if (isSubmitShortcut(event)) {
              event.preventDefault();
              submit();
            } else if (event.key === "Escape" && onCancel) {
              event.preventDefault();
              onCancel();
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label={messages.label}
          className="min-h-16"
        />
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              {messages.cancel}
            </Button>
          )}
          <Button size="sm" disabled={!body.trim()} onClick={submit}>
            {messages.submit}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The body, clamped to `maxLines` with a disclosure when it overflows. */
function CommentBody({
  node,
  maxLines,
  messages,
}: {
  node: CommentNode;
  maxLines?: number;
  messages: ResolvedMessages;
}) {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const bodyId = React.useId();
  const [expanded, setExpanded] = React.useState(false);
  const [overflows, setOverflows] = React.useState(false);
  const clamped = maxLines != null && !expanded;

  React.useLayoutEffect(() => {
    const element = bodyRef.current;
    if (!element || maxLines == null) return;
    const measure = () => {
      // Measured while clamped; once expanded the toggle stays so it can collapse again.
      if (!clamped) return;
      setOverflows(element.scrollHeight > element.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [clamped, maxLines]);

  return (
    <div className="space-y-1">
      <div
        ref={bodyRef}
        id={bodyId}
        data-slot="comment-body"
        className={cn(
          "text-sm text-foreground wrap-anywhere",
          typeof node.body === "string" && "whitespace-pre-line",
          clamped && "line-clamp-(--qx-comment-thread-lines)",
        )}
        style={
          maxLines != null
            ? ({ "--qx-comment-thread-lines": maxLines } as React.CSSProperties)
            : undefined
        }
      >
        {node.body}
      </div>
      {maxLines != null && (overflows || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((value) => !value)}
          className="rounded-(--qx-corner-xs) text-xs font-medium text-link outline-none hover:text-link-hover hover:underline focus-visible:focus-ring"
        >
          {expanded ? messages.showLess : messages.showMore}
        </button>
      )}
    </div>
  );
}

function CommentEditor({
  initial,
  onSave,
  onCancel,
  editorRef,
  messages,
}: {
  initial: string;
  onSave: (body: string) => void;
  onCancel: () => void;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  messages: ResolvedMessages;
}) {
  const [draft, setDraft] = React.useState(initial);
  const save = () => {
    if (!draft.trim()) return;
    onSave(draft.trim());
  };
  return (
    <div data-slot="comment-editor" className="space-y-2">
      <Textarea
        ref={editorRef}
        value={draft}
        autoFocus
        aria-label={messages.editLabel}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (isSubmitShortcut(event)) {
            event.preventDefault();
            save();
          } else if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        className="min-h-16"
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {messages.cancel}
        </Button>
        <Button size="sm" disabled={!draft.trim()} onClick={save}>
          {messages.save}
        </Button>
      </div>
    </div>
  );
}

function CommentItem({
  node,
  depth,
  ctx,
}: {
  node: CommentNode;
  depth: number;
  ctx: ThreadContext;
}) {
  const { messages } = ctx;
  const headerId = React.useId();
  const [mode, setMode] = React.useState<"view" | "edit" | "confirm-delete" | "reply">("view");
  const menuTriggerRef = React.useRef<HTMLButtonElement>(null);
  const replyButtonRef = React.useRef<HTMLButtonElement>(null);
  const editorRef = React.useRef<HTMLTextAreaElement>(null);
  const confirmCancelRef = React.useRef<HTMLButtonElement>(null);

  const editSource = node.source ?? (typeof node.body === "string" ? node.body : undefined);
  const editable =
    !node.deleted && ctx.onEdit != null && editSource !== undefined && ctx.canEdit(node);
  const deletable = !node.deleted && ctx.onDelete != null && ctx.canDelete(node);
  const hasMenu = editable || deletable;
  const replies = node.replies ?? [];
  const indent = depth < ctx.maxIndent;

  const backToView = (focus?: React.RefObject<HTMLElement | null>) => {
    setMode("view");
    // After the editor or confirmation unmounts, put focus back where the action started.
    requestAnimationFrame(() => focus?.current?.focus());
  };

  return (
    <article
      data-slot="comment"
      data-deleted={node.deleted || undefined}
      aria-labelledby={headerId}
      className="space-y-3"
    >
      <div className="flex gap-3">
        <PersonAvatar author={node.author} />
        <div className="min-w-0 flex-1 space-y-1">
          <div
            id={headerId}
            data-slot="comment-header"
            className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
          >
            <span className="font-medium text-foreground wrap-anywhere">{node.author.name}</span>
            {node.author.badge && (
              <Badge variant="outline" className="self-center px-1.5 py-0 font-normal">
                {node.author.badge}
              </Badge>
            )}
            <TimeSince
              value={node.createdAt}
              locale={ctx.locale}
              timeZone={ctx.timeZone}
              className="text-xs text-muted-foreground"
            />
            {node.editedAt != null && !node.deleted && (
              <span data-slot="comment-edited" className="text-xs text-muted-foreground">
                · {messages.edited}
              </span>
            )}
          </div>

          {node.deleted ? (
            <p data-slot="comment-body" className="text-sm text-muted-foreground italic">
              {messages.deleted}
            </p>
          ) : mode === "edit" && editSource !== undefined ? (
            <CommentEditor
              initial={editSource}
              editorRef={editorRef}
              messages={messages}
              onCancel={() => backToView(menuTriggerRef)}
              onSave={(body) => {
                ctx.onEdit?.(node.id, body);
                backToView(menuTriggerRef);
              }}
            />
          ) : (
            <CommentBody node={node} maxLines={ctx.maxBodyLines} messages={messages} />
          )}

          {mode === "confirm-delete" && (
            // biome-ignore lint/a11y/useSemanticElements: a named confirmation step; <fieldset> would add form semantics.
            <div
              role="group"
              aria-label={messages.deleteConfirm}
              data-slot="comment-delete-confirm"
              className="flex flex-wrap items-center gap-2 rounded-(--qx-corner-control) border border-(--destructive-border) bg-destructive-subtle px-3 py-2"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  backToView(menuTriggerRef);
                }
              }}
            >
              <span className="me-auto text-sm font-medium text-destructive-text">
                {messages.deleteConfirm}
              </span>
              <Button
                ref={confirmCancelRef}
                size="xs"
                variant="ghost"
                onClick={() => backToView(menuTriggerRef)}
              >
                {messages.cancel}
              </Button>
              <Button
                size="xs"
                variant="destructive"
                onClick={() => {
                  ctx.onDelete?.(node.id);
                  setMode("view");
                  requestAnimationFrame(ctx.focusThread);
                }}
              >
                <TrashIcon aria-hidden />
                {messages.delete}
              </Button>
            </div>
          )}

          {!node.deleted && mode !== "edit" && (
            <div data-slot="comment-actions" className="flex flex-wrap items-center gap-1 pt-0.5">
              {((node.reactions && node.reactions.length > 0) || ctx.onReact) && (
                <ReactionBar
                  reactions={node.reactions ?? []}
                  readOnly={!ctx.onReact}
                  onToggle={(emoji) => ctx.onReact?.(node.id, emoji)}
                  locale={ctx.locale}
                  className="me-1"
                />
              )}
              {ctx.onReply && (
                <Button
                  ref={replyButtonRef}
                  variant="ghost"
                  size="xs"
                  aria-expanded={mode === "reply"}
                  onClick={() => setMode((current) => (current === "reply" ? "view" : "reply"))}
                  className="text-muted-foreground"
                >
                  {messages.reply}
                </Button>
              )}
              {hasMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    ref={menuTriggerRef}
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={messages.actions(node.author.name)}
                        className="text-muted-foreground"
                      >
                        <EllipsisIcon aria-hidden />
                      </Button>
                    }
                  />
                  <DropdownMenuContent
                    align="end"
                    className="w-auto min-w-36"
                    // Edit and delete swap in a new control; focus goes there, not back to the
                    // trigger the menu would otherwise restore.
                    finalFocus={() => editorRef.current ?? confirmCancelRef.current ?? true}
                  >
                    {editable && (
                      <DropdownMenuItem onClick={() => setMode("edit")}>
                        <PencilIcon aria-hidden />
                        {messages.edit}
                      </DropdownMenuItem>
                    )}
                    {deletable && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setMode("confirm-delete")}
                      >
                        <TrashIcon aria-hidden />
                        {messages.delete}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {mode === "reply" && ctx.onReply && (
            <div className="pt-2">
              <Composer
                currentUser={ctx.currentUser}
                placeholder={messages.replyPlaceholder}
                autoFocus
                onCancel={() => backToView(replyButtonRef)}
                onSubmit={(body) => {
                  ctx.onReply?.(node.id, body);
                  backToView(replyButtonRef);
                }}
                messages={messages}
              />
            </div>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        // biome-ignore lint/a11y/useSemanticElements: a named group of replies; <fieldset> would add form semantics.
        <div
          role="group"
          aria-label={messages.repliesTo(node.author.name)}
          data-slot="comment-replies"
          className={cn(
            "space-y-4",
            // The thread line runs down from the parent's avatar centre (avatars are 24px).
            indent && "ms-3 border-s border-border ps-5",
          )}
        >
          {replies.map((reply) => (
            <CommentItem key={reply.id} node={reply} depth={depth + 1} ctx={ctx} />
          ))}
        </div>
      )}
    </article>
  );
}

/**
 * Threaded comments for review, approval and incident workflows: avatars, relative
 * timestamps, an "edited" marker, reactions, replies, edit and delete, and a composer.
 *
 * - **Replies** hang off a thread line from the parent's avatar, and stop indenting after
 *   `maxIndent` levels so deep conversations keep a readable measure.
 * - **Edit** swaps the body for an editor (⌘/Ctrl+Enter saves, Escape cancels) and returns
 *   focus to the comment's menu afterwards.
 * - **Delete** is a two-step action: the menu item opens an inline confirmation, and only
 *   its destructive button emits `onDelete`.
 * - **Long content** wraps anywhere (long URLs and tokens cannot overflow), keeps plain-text
 *   line breaks, and can be clamped with `maxBodyLines`.
 * - **Mentions** — render them in `body` with `CommentMention`.
 *
 * Each comment is an `<article>` named by its header (author, time, edited), so a screen
 * reader can move comment by comment; replies are a named group inside their parent.
 */
function CommentThread({
  comments,
  currentUser,
  onSubmit,
  onReact,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  maxBodyLines,
  maxIndent = 2,
  emptyState,
  placeholder,
  locale,
  timeZone,
  messages: messageOverrides,
  className,
  ...props
}: CommentThreadProps) {
  const messages = useMessages("commentThread", commentThreadMessages, messageOverrides);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const ownComment = React.useCallback(
    (comment: CommentNode) => isSameAuthor(comment.author, currentUser),
    [currentUser],
  );

  const ctx: ThreadContext = {
    currentUser,
    onReact,
    onReply: onSubmit ? (parentId, body) => onSubmit(body, parentId) : undefined,
    onEdit,
    onDelete,
    canEdit: canEdit ?? ownComment,
    canDelete: canDelete ?? ownComment,
    maxBodyLines,
    maxIndent,
    locale,
    timeZone,
    messages,
    focusThread: () => rootRef.current?.focus({ preventScroll: true }),
  };

  return (
    <div
      ref={rootRef}
      data-slot="comment-thread"
      // Focus lands here when a deleted comment takes its controls with it.
      tabIndex={-1}
      className={cn("space-y-5 outline-none", className)}
      {...props}
    >
      {comments.length > 0 ? (
        <div className="space-y-5">
          {comments.map((c) => (
            <CommentItem key={c.id} node={c} depth={0} ctx={ctx} />
          ))}
        </div>
      ) : (
        emptyState && (
          <div data-slot="comment-thread-empty" className="text-sm text-muted-foreground">
            {emptyState}
          </div>
        )
      )}
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

export type { CommentAuthor, CommentMentionProps, CommentNode, CommentThreadProps };
export { CommentMention, CommentThread };
