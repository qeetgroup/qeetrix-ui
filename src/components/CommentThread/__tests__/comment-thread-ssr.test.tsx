// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CommentThread } from "@/components/CommentThread/comment-thread";

/* Server rendering: no window, no layout effects, no ResizeObserver. The markup must still carry
 * the content, so a server-rendered page is readable before hydration. */
describe("CommentThread on the server", () => {
  it("renders to a string without touching browser APIs", () => {
    const html = renderToString(
      <CommentThread
        comments={[
          {
            id: "1",
            author: { name: "Ada Lovelace" },
            body: "Hello",
            createdAt: "2026-08-18T12:00:00.000Z",
            reactions: [{ emoji: "👍", count: 1 }],
          },
        ]}
        onSubmit={() => {}}
        onReact={() => {}}
        maxBodyLines={3}
        locale="en-US"
        timeZone="UTC"
      />,
    );
    expect(html).toContain("Hello");
  });
});
