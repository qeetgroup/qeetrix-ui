// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FilterBar } from "@/components/FilterBar/filter-bar";

/* Server rendering: no window, no layout effects, no ResizeObserver. The markup must still carry
 * the content, so a server-rendered page is readable before hydration. */
describe("FilterBar on the server", () => {
  it("renders to a string without touching browser APIs", () => {
    const html = renderToString(
      <FilterBar
        fields={[{ key: "name", label: "Name" }]}
        value={[{ field: "name", operator: "is", value: "ada" }]}
        onValueChange={() => {}}
        onSearchChange={() => {}}
        overflow="collapse"
      />,
    );
    expect(html).toContain("Name is ada");
  });
});
