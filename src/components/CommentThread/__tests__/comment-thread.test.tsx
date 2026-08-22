import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { type CommentNode, CommentThread } from "@/components/CommentThread/comment-thread";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const COMMENTS: CommentNode[] = [
  { id: "1", author: { name: "Ada Lovelace" }, body: "First note.", createdAt: Date.now() - 6e4 },
];

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

  it("has no axe violations", async () => {
    const { container } = render(<CommentThread comments={COMMENTS} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
