// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AccessReview } from "../access-review";

/* Server rendering: no window, no layout effects, no ResizeObserver. The markup must still carry
 * the content, so a server-rendered page is readable before hydration. */
describe("AccessReview on the server", () => {
  it("renders to a string without touching browser APIs", () => {
    const html = renderToString(
      <AccessReview
        items={[
          {
            id: "a",
            label: "Billing admin",
            state: "granted",
            subject: { name: "Ada Lovelace" },
            risk: "high",
            decision: null,
          },
        ]}
        onDecisionChange={() => {}}
        selectable
      />,
    );
    expect(html).toContain("Billing admin");
  });
});
