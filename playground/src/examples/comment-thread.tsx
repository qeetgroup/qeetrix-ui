import {
  type CommentAuthor,
  CommentMention,
  type CommentNode,
  CommentThread,
  type Reaction,
} from "@qeetrix/ui";
import { MessagesSquareIcon } from "lucide-react";
import { useState } from "react";
import { daysAgo } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, text } from "../registry/types";

const vikram: CommentAuthor = { id: "usr_04", name: "Vikram Singh", badge: "Approver" };
const divya: CommentAuthor = { id: "usr_11", name: "Divya Menon" };
const rohan: CommentAuthor = { id: "usr_02", name: "Rohan Mehta" };
const ananya: CommentAuthor = { id: "usr_01", name: "Ananya Iyer" };
const payBot: CommentAuthor = { id: "bot_qeet_pay", name: "Qeet Pay", badge: "Bot" };

/** A dispute on overdue invoice QP-INV-2026-00409 for Kanpur Logistics, over the last two days. */
const disputeThread: CommentNode[] = [
  {
    id: "cmt_01",
    author: vikram,
    createdAt: daysAgo(2.2),
    source:
      "Kanpur Logistics says the NACH debit for QP-INV-2026-00409 bounced because the mandate was registered against their old HDFC account. Can we re-present it once they update the mandate, without adding the late fee?",
    body: (
      <>
        Kanpur Logistics says the NACH debit for <strong>QP-INV-2026-00409</strong> bounced because
        the mandate was registered against their old HDFC account. Can we re-present it once they
        update the mandate, without adding the late fee?
      </>
    ),
    reactions: [
      { emoji: "👀", label: "eyes", count: 2, users: ["Divya Menon", "Rohan Mehta"] },
      { emoji: "👍", label: "thumbs up", count: 1, reacted: true, users: ["Ananya Iyer"] },
    ],
    replies: [
      {
        id: "cmt_02",
        author: divya,
        createdAt: daysAgo(2.1),
        source:
          "@Vikram Singh mandate NACH-90417 was approved by their bank this morning. I can re-present on Thursday's NACH cycle and waive the ₹846 late fee as a credit note.",
        body: (
          <>
            <CommentMention>@Vikram Singh</CommentMention> mandate NACH-90417 was approved by their
            bank this morning. I can re-present on Thursday's NACH cycle and waive the ₹846 late fee
            as a credit note.
          </>
        ),
        reactions: [{ emoji: "✅", label: "check mark", count: 1, users: ["Vikram Singh"] }],
      },
      {
        id: "cmt_03",
        author: vikram,
        createdAt: daysAgo(1.9),
        body: "Do it. Please also issue the credit note against the same GSTIN so their input tax credit lines up.",
      },
      {
        id: "cmt_04",
        author: payBot,
        createdAt: daysAgo(1.8),
        body: "Credit note CN-2026-0031 (₹846, GSTIN 09AAFCK3456P1Z1) issued. NACH re-presentation scheduled for 9 Oct 2026.",
      },
    ],
  },
  {
    id: "cmt_05",
    author: rohan,
    createdAt: daysAgo(1.2),
    source:
      "@Ananya Iyer FYI the failure webhook fired twice for this invoice — the second delivery was a retry after a 504 from their endpoint. I've added both event IDs (evt_01J9ZB6X4QH2, evt_01J9ZB7M2KD8) to QTID-1182. Until the handler is idempotent, finance should reconcile against the settlement report rather than webhook counts. Runbook: https://runbooks.qeet.in/pay/webhooks/duplicate-delivery-reconciliation-v2",
    body: (
      <>
        <CommentMention self>@Ananya Iyer</CommentMention> FYI the failure webhook fired twice for
        this invoice — the second delivery was a retry after a 504 from their endpoint. I've added
        both event IDs (evt_01J9ZB6X4QH2, evt_01J9ZB7M2KD8) to QTID-1182. Until the handler is
        idempotent, finance should reconcile against the settlement report rather than webhook
        counts. Runbook: https://runbooks.qeet.in/pay/webhooks/duplicate-delivery-reconciliation-v2
      </>
    ),
    reactions: [{ emoji: "🙏", label: "folded hands", count: 3 }],
    replies: [
      {
        id: "cmt_06",
        author: divya,
        createdAt: daysAgo(1.15),
        deleted: true,
        body: "",
      },
      {
        id: "cmt_07",
        author: ananya,
        createdAt: daysAgo(1.1),
        editedAt: daysAgo(1.05),
        body: "Thanks Rohan. Let's make the webhook handler idempotent on event id before the next cycle.",
      },
    ],
  },
];

function toggleReaction(reactions: Reaction[] = [], emoji: string): Reaction[] {
  const existing = reactions.find((reaction) => reaction.emoji === emoji);
  if (!existing) return [...reactions, { emoji, count: 1, reacted: true }];
  return reactions
    .map((reaction) =>
      reaction.emoji === emoji
        ? {
            ...reaction,
            reacted: !reaction.reacted,
            count: reaction.count + (reaction.reacted ? -1 : 1),
          }
        : reaction,
    )
    .filter((reaction) => reaction.count > 0);
}

function mapThread(
  nodes: CommentNode[],
  id: string,
  update: (node: CommentNode) => CommentNode,
): CommentNode[] {
  return nodes.map((node) =>
    node.id === id
      ? update(node)
      : node.replies
        ? { ...node, replies: mapThread(node.replies, id, update) }
        : node,
  );
}

const emptyThread = (
  <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
    <MessagesSquareIcon aria-hidden className="size-4 shrink-0" />
    No discussion yet. Reviewers see notes here before they approve or revoke the grant.
  </div>
);

function LiveThread({
  initial,
  composer = true,
  editable = true,
  placeholder,
  maxBodyLines,
}: {
  initial: CommentNode[];
  composer?: boolean;
  editable?: boolean;
  placeholder?: string;
  maxBodyLines?: number;
}) {
  const [comments, setComments] = useState(initial);
  const [nextId, setNextId] = useState(1);

  const submit = (body: string, parentId?: string) => {
    const comment: CommentNode = {
      id: `cmt_new_${nextId}`,
      author: ananya,
      body,
      createdAt: new Date().toISOString(),
    };
    setNextId((id) => id + 1);
    setComments((current) =>
      parentId
        ? mapThread(current, parentId, (node) => ({
            ...node,
            replies: [...(node.replies ?? []), comment],
          }))
        : [...current, comment],
    );
  };

  const react = (commentId: string, emoji: string) =>
    setComments((current) =>
      mapThread(current, commentId, (node) => ({
        ...node,
        reactions: toggleReaction(node.reactions, emoji),
      })),
    );

  const edit = (commentId: string, body: string) =>
    setComments((current) =>
      mapThread(current, commentId, (node) => ({
        ...node,
        body,
        source: undefined,
        editedAt: new Date().toISOString(),
      })),
    );

  const remove = (commentId: string) =>
    setComments((current) =>
      mapThread(current, commentId, (node) => ({ ...node, deleted: true, body: "" })),
    );

  return (
    <CommentThread
      className="w-full max-w-2xl"
      comments={comments}
      currentUser={ananya}
      onSubmit={composer ? submit : undefined}
      onReact={react}
      onEdit={editable ? edit : undefined}
      onDelete={editable ? remove : undefined}
      placeholder={placeholder}
      emptyState={emptyThread}
      maxBodyLines={maxBodyLines}
      locale="en-IN"
      timeZone="Asia/Kolkata"
    />
  );
}

function stripThread(nodes: CommentNode[], replies: boolean, reactions: boolean): CommentNode[] {
  return nodes.map((node) => ({
    ...node,
    reactions: reactions ? node.reactions : undefined,
    replies: replies && node.replies ? stripThread(node.replies, replies, reactions) : undefined,
  }));
}

const threadControls = {
  composer: bool(true, "Composer + replies (onSubmit)"),
  editable: bool(true, "Edit / delete own comments (onEdit, onDelete)"),
  replies: bool(true, "Nested replies"),
  reactions: bool(true, "Reactions"),
  clamp: bool(false, "Clamp bodies to 2 lines (maxBodyLines)"),
  placeholder: text("Add a note for the finance team…", "placeholder"),
};

export const examples: FamilyExamples = {
  "comment-thread": {
    layout: "wide",
    minHeight: 1700,
    demos: [
      {
        name: "Invoice dispute",
        description:
          "Reply, react, or post at the bottom. Ananya (the current user) can edit or delete her own comment; a deleted comment leaves a tombstone so its thread stays intact. `CommentMention` marks @-mentions (her own one is tinted), and `maxBodyLines={3}` clamps the long one behind “Show more”.",
        render: () => (
          <LiveThread
            initial={disputeThread}
            placeholder="Add a note about QP-INV-2026-00409…"
            maxBodyLines={3}
          />
        ),
      },
      {
        name: "Read-only",
        description:
          "Without `onSubmit`, `onEdit` or `onDelete` there is no composer and no Reply.",
        render: () => (
          <LiveThread initial={disputeThread.slice(1)} composer={false} editable={false} />
        ),
      },
      {
        name: "Empty, with composer",
        description: "`emptyState` sits above the composer until the first comment arrives.",
        render: () => (
          <LiveThread
            initial={[]}
            placeholder="Explain why Rahul Deshpande still needs break-glass access…"
          />
        ),
      },
    ],
    playground: definePlayground({
      controls: threadControls,
      render: (v) => (
        <LiveThread
          key={`${v.replies}-${v.reactions}`}
          initial={stripThread(disputeThread, v.replies, v.reactions)}
          composer={v.composer}
          editable={v.editable}
          maxBodyLines={v.clamp ? 2 : undefined}
          placeholder={v.placeholder || undefined}
        />
      ),
      code: (v) =>
        jsx("CommentThread", {
          comments: expr("comments"),
          currentUser: expr('{ id: "usr_01", name: "Ananya Iyer" }'),
          onSubmit: v.composer
            ? expr("(body, parentId) => postComment(body, parentId)")
            : undefined,
          onReact: v.reactions
            ? expr("(commentId, emoji) => toggleReaction(commentId, emoji)")
            : undefined,
          onEdit: v.editable
            ? expr("(commentId, body) => editComment(commentId, body)")
            : undefined,
          onDelete: v.editable ? expr("(commentId) => deleteComment(commentId)") : undefined,
          maxBodyLines: v.clamp ? 2 : undefined,
          placeholder: v.composer && v.placeholder ? v.placeholder : undefined,
          locale: "en-IN",
          timeZone: "Asia/Kolkata",
        }),
    }),
  },
};
