import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PageHeader } from "@/components/ui/page-header";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("PageHeader", () => {
  it("renders the title as an h1 with description and actions", () => {
    render(
      <PageHeader
        title="Members"
        description="Manage your team"
        actions={<button type="button">Invite</button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Members" })).toBeInTheDocument();
    expect(screen.getByText("Manage your team")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<PageHeader title="Members" description="Manage your team" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
