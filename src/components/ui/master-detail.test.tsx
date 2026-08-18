import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { MasterDetail } from "@/components/ui/master-detail";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("MasterDetail", () => {
  it("renders list and detail on desktop", () => {
    render(<MasterDetail list={<div>List content</div>} detail={<div>Detail content</div>} />);
    expect(screen.getByText("List content")).toBeInTheDocument();
    expect(screen.getByText("Detail content")).toBeInTheDocument();
  });

  it("has no axe violations on the desktop two-pane layout", async () => {
    const { container } = render(
      <MasterDetail
        list={<nav aria-label="Messages">List content</nav>}
        detail={<article aria-label="Message">Detail content</article>}
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
