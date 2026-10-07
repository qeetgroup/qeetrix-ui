import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CommentMention, type CommentNode, CommentThread } from "../comment-thread";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const COMMENTS: CommentNode[] = [
  { id: "1", author: { name: "Ada Lovelace" }, body: "First note.", createdAt: Date.now() - 6e4 },
];

const ADA = { id: "u_ada", name: "Ada Lovelace" };
const GRACE = { id: "u_grace", name: "Grace Hopper" };

const THREAD: CommentNode[] = [
  {
    id: "c1",
    author: ADA,
    body: "Can we rotate the signing key before Friday?",
    createdAt: Date.now() - 3_600_000,
    editedAt: Date.now() - 1_800_000,
    replies: [
      {
        id: "c2",
        author: { ...GRACE, badge: "Admin" },
        body: "Yes — scheduled for Thursday.",
        createdAt: Date.now() - 1_200_000,
        replies: [
          {
            id: "c3",
            author: ADA,
            body: "Thanks!",
            createdAt: Date.now() - 600_000,
          },
        ],
      },
    ],
  },
];

/** Base UI restores focus on the next frame; let it run. */
const flushFrames = () =>
  act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));

describe("CommentThread", () => {
  it("renders comments", () => {
    render(<CommentThread comments={COMMENTS} />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("First note.")).toBeInTheDocument();
  });

  it("submits a new comment", () => {
    const onSubmit = vi.fn();
    render(<CommentThread comments={COMMENTS} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Comment"), { target: { value: "Nice!" } });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(onSubmit).toHaveBeenCalledWith("Nice!");
  });

  it("submits with Control+Enter", () => {
    const onSubmit = vi.fn();
    render(<CommentThread comments={COMMENTS} onSubmit={onSubmit} />);
    const box = screen.getByLabelText("Comment");
    fireEvent.change(box, { target: { value: "Shipped." } });
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledWith("Shipped.");
  });

  it("has no axe violations", async () => {
    const { container } = render(<CommentThread comments={COMMENTS} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("CommentThread structure", () => {
  it("names each comment by its header, so readers can move comment by comment", () => {
    render(<CommentThread comments={THREAD} />);
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(3);
    expect(articles[0]).toHaveAccessibleName(expect.stringContaining("Ada Lovelace"));
    expect(articles[1]).toHaveAccessibleName(expect.stringContaining("Grace Hopper"));
  });

  it("groups replies under their parent", () => {
    render(<CommentThread comments={THREAD} />);
    expect(screen.getByRole("group", { name: "Replies to Ada Lovelace" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Replies to Grace Hopper" })).toBeInTheDocument();
  });

  it("marks edited comments and shows author badges", () => {
    render(<CommentThread comments={THREAD} />);
    expect(within(screen.getAllByRole("article")[0]).getAllByText(/edited/)[0]).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("stops indenting past maxIndent", () => {
    const { container } = render(<CommentThread comments={THREAD} maxIndent={1} />);
    const groups = container.querySelectorAll('[data-slot="comment-replies"]');
    expect(groups[0]).toHaveClass("border-s");
    expect(groups[1]).not.toHaveClass("border-s");
  });

  it("keeps plain-text line breaks and wraps long tokens", () => {
    render(
      <CommentThread
        comments={[{ id: "x", author: ADA, body: "line one\nline two", createdAt: Date.now() }]}
      />,
    );
    const body = screen.getByText(/line one/);
    expect(body).toHaveClass("whitespace-pre-line", "wrap-anywhere");
  });

  it("renders a tombstone for deleted comments and keeps their replies", () => {
    render(
      <CommentThread
        comments={[{ ...THREAD[0], deleted: true }]}
        currentUser={ADA}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("This comment was deleted.")).toBeInTheDocument();
    expect(screen.queryByText("Can we rotate the signing key before Friday?")).toBeNull();
    expect(screen.getByText("Yes — scheduled for Thursday.")).toBeInTheDocument();
    // Only the surviving reply by Ada keeps its actions; the deleted comment has none.
    expect(
      screen.getAllByRole("button", { name: "Comment actions for Ada Lovelace" }),
    ).toHaveLength(1);
  });

  it("shows an empty state", () => {
    render(<CommentThread comments={[]} emptyState="No comments yet." />);
    expect(screen.getByText("No comments yet.")).toBeInTheDocument();
  });
});

describe("CommentThread replies", () => {
  it("opens a reply composer and submits with the parent id", async () => {
    const onSubmit = vi.fn();
    render(<CommentThread comments={COMMENTS} onSubmit={onSubmit} />);
    const reply = screen.getByRole("button", { name: "Reply" });
    fireEvent.click(reply);
    expect(reply).toHaveAttribute("aria-expanded", "true");
    const boxes = screen.getAllByLabelText("Comment");
    fireEvent.change(boxes[0], { target: { value: "Agreed." } });
    fireEvent.click(screen.getAllByRole("button", { name: "Comment" })[0]);
    expect(onSubmit).toHaveBeenCalledWith("Agreed.", "1");
    await flushFrames();
    expect(reply).toHaveFocus();
  });

  it("cancels a reply with Escape and returns focus", async () => {
    render(<CommentThread comments={COMMENTS} onSubmit={() => {}} />);
    const reply = screen.getByRole("button", { name: "Reply" });
    fireEvent.click(reply);
    fireEvent.keyDown(screen.getAllByLabelText("Comment")[0], { key: "Escape" });
    expect(screen.getAllByLabelText("Comment")).toHaveLength(1);
    await flushFrames();
    expect(reply).toHaveFocus();
  });
});

describe("CommentThread edit and delete", () => {
  it("offers edit and delete on the current user's comments only", () => {
    render(
      <CommentThread comments={THREAD} currentUser={ADA} onEdit={() => {}} onDelete={() => {}} />,
    );
    expect(
      screen.getAllByRole("button", { name: "Comment actions for Ada Lovelace" }),
    ).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Comment actions for Grace Hopper" })).toBeNull();
  });

  it("honours a custom permission", () => {
    render(
      <CommentThread
        comments={THREAD}
        currentUser={ADA}
        onDelete={() => {}}
        canDelete={() => true}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Comment actions for Grace Hopper" }),
    ).toBeInTheDocument();
  });

  it("edits in place and emits the new body", () => {
    const onEdit = vi.fn();
    render(
      <CommentThread comments={COMMENTS} currentUser={{ name: "Ada Lovelace" }} onEdit={onEdit} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Comment actions for Ada Lovelace" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    const editor = screen.getByLabelText("Edit comment");
    expect(editor).toHaveValue("First note.");
    fireEvent.change(editor, { target: { value: "First note, revised." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onEdit).toHaveBeenCalledWith("1", "First note, revised.");
    expect(screen.queryByLabelText("Edit comment")).toBeNull();
  });

  it("cancels an edit with Escape without emitting", () => {
    const onEdit = vi.fn();
    render(
      <CommentThread comments={COMMENTS} currentUser={{ name: "Ada Lovelace" }} onEdit={onEdit} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Comment actions for Ada Lovelace" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    fireEvent.keyDown(screen.getByLabelText("Edit comment"), { key: "Escape" });
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText("First note.")).toBeInTheDocument();
  });

  it("does not offer edit for a rich body without a plain-text source", () => {
    render(
      <CommentThread
        comments={[{ id: "r", author: ADA, body: <strong>Rich</strong>, createdAt: Date.now() }]}
        currentUser={ADA}
        onEdit={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: "Comment actions for Ada Lovelace" })).toBeNull();
  });

  it("asks for confirmation before emitting a delete", () => {
    const onDelete = vi.fn();
    render(
      <CommentThread
        comments={COMMENTS}
        currentUser={{ name: "Ada Lovelace" }}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Comment actions for Ada Lovelace" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    const confirm = screen.getByRole("group", { name: "Delete this comment?" });
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("backs out of a delete with Cancel", () => {
    const onDelete = vi.fn();
    render(
      <CommentThread
        comments={COMMENTS}
        currentUser={{ name: "Ada Lovelace" }}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Comment actions for Ada Lovelace" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("group", { name: "Delete this comment?" })).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("has no axe violations with actions, badges and an open confirmation", async () => {
    const { container } = render(
      <CommentThread
        comments={THREAD}
        currentUser={ADA}
        onSubmit={() => {}}
        onReact={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Comment actions for Ada Lovelace" })[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("CommentThread reactions", () => {
  it("lets the first reaction be added when onReact is set", () => {
    render(<CommentThread comments={COMMENTS} onReact={() => {}} />);
    expect(screen.getByRole("button", { name: "Add reaction" })).toBeInTheDocument();
  });

  it("shows reactions read-only without onReact", () => {
    render(
      <CommentThread comments={[{ ...COMMENTS[0], reactions: [{ emoji: "👍", count: 2 }] }]} />,
    );
    expect(screen.queryByRole("button", { name: "👍 2" })).toBeNull();
    expect(screen.getByText("👍 2")).toBeInTheDocument();
  });
});

describe("CommentMention", () => {
  it("renders other people's mentions as link-coloured text", () => {
    render(<CommentMention>@Grace Hopper</CommentMention>);
    expect(screen.getByText("@Grace Hopper")).toHaveClass("text-link");
  });

  it("tints a mention of the reader", () => {
    render(<CommentMention self>@Ada Lovelace</CommentMention>);
    const mention = screen.getByText("@Ada Lovelace");
    expect(mention).toHaveAttribute("data-self");
    expect(mention).toHaveClass("bg-brand-subtle");
  });

  it("renders a profile link when given href", () => {
    render(<CommentMention href="/people/grace">@Grace Hopper</CommentMention>);
    expect(screen.getByRole("link", { name: "@Grace Hopper" })).toHaveAttribute(
      "href",
      "/people/grace",
    );
  });
});

describe("CommentThread avatars", () => {
  it("keeps avatars decorative, since the author name is visible beside them", () => {
    const { container } = render(
      <CommentThread comments={THREAD} currentUser={ADA} onSubmit={() => {}} />,
    );
    const fallbacks = container.querySelectorAll('[data-slot="avatar-fallback"]');
    expect(fallbacks.length).toBeGreaterThan(0);
    for (const fallback of fallbacks) {
      expect(fallback).toHaveAttribute("aria-hidden");
      expect(fallback).not.toHaveAttribute("role", "img");
    }
    // Initials still render, from Avatar's own name handling.
    expect(fallbacks[0]).toHaveTextContent("AL");
  });
});
