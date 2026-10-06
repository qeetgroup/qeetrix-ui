import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PageHeader } from "@/components/PageHeader/page-header";

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

describe("PageHeader composition", () => {
  it("renders metadata in its own row after the description", () => {
    const { container } = render(
      <PageHeader
        title="Users"
        description="1,842 people"
        metadata={<span>Updated 4 min ago</span>}
      />,
    );
    const description = container.querySelector('[data-slot="page-header-description"]');
    const metadata = container.querySelector('[data-slot="page-header-metadata"]');
    expect(metadata).toHaveTextContent("Updated 4 min ago");
    // DOM order is reading order: description, then the facts about the subject.
    expect(description?.compareDocumentPosition(metadata as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("omits empty slots", () => {
    const { container } = render(<PageHeader title="Users" />);
    expect(container.querySelector('[data-slot="page-header-metadata"]')).toBeNull();
    expect(container.querySelector('[data-slot="page-header-actions"]')).toBeNull();
    expect(container.querySelector('[data-slot="page-header-breadcrumb"]')).toBeNull();
  });

  it("wraps the actions beneath the title from its own width, not the viewport", () => {
    const { container } = render(
      <PageHeader title="Users" actions={<button type="button">Invite</button>} />,
    );
    expect(container.querySelector('[data-slot="page-header"]')).toHaveClass("flex-wrap");
    expect(container.querySelector('[data-slot="page-header-content"]')).toHaveClass(
      "flex-[1_1_20rem]",
      "min-w-0",
    );
    expect(container.querySelector('[data-slot="page-header-actions"]')).toHaveClass("flex-wrap");
  });

  it("breaks long unbroken titles instead of overflowing", () => {
    render(<PageHeader title="saml-connection-workday-hr-production-eu-west-1" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("wrap-break-word");
  });

  it("has no axe violations with every slot filled", async () => {
    const { container } = render(
      <PageHeader
        breadcrumb={<a href="/directory">Directory</a>}
        title="Users"
        description="Manage your team"
        metadata={<span>SCIM synced</span>}
        actions={<button type="button">Invite</button>}
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
