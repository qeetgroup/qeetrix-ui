import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { AccessReview, type AccessReviewItem } from "@/components/AccessReview/access-review";

const items: AccessReviewItem[] = [
  {
    id: "members.read",
    label: "View members",
    description: "Read member profiles.",
    state: "granted",
    inherited: true,
    locked: true,
    scope: "Organisation",
  },
  {
    id: "members.manage",
    label: "Manage members",
    state: "mixed",
    scope: "Selected teams",
  },
  {
    id: "billing.export",
    label: "Export billing data",
    state: "pending",
    scope: "Organisation",
  },
];

const a11y = (container: Element) =>
  axe(container, { rules: { "color-contrast": { enabled: false } } });

describe("AccessReview", () => {
  it("exposes granted, mixed, pending, inherited, locked, and scoped state", () => {
    render(<AccessReview items={items} aria-label="Role access review" />);

    expect(screen.getByRole("table", { name: "Role access review" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "View members" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "View members" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("checkbox", { name: "Manage members" })).toHaveAttribute(
      "aria-checked",
      "mixed",
    );
    expect(screen.getByRole("checkbox", { name: "Export billing data" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByText("Inherited")).toBeInTheDocument();
    expect(screen.getByText("Locked")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Selected teams")).toBeInTheDocument();
  });

  it("emits only caller-owned access state changes", () => {
    const onStateChange = vi.fn();
    render(
      <AccessReview
        items={[{ id: "logs.read", label: "Read logs", state: "denied" }]}
        onStateChange={onStateChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Read logs" }));
    expect(onStateChange).toHaveBeenCalledWith("logs.read", "granted");
  });

  it("has no axe violations", async () => {
    const { container } = render(<AccessReview items={items} aria-label="Access review" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

const reviewItems: AccessReviewItem[] = [
  {
    id: "ada.billing-admin",
    label: "Billing admin",
    state: "granted",
    subject: { name: "Ada Lovelace", detail: "ada@qeet.in" },
    resource: "Acme Ltd",
    scope: "Organisation",
    risk: "high",
    riskReason: "Admin, unused for 94 days",
    evidence: [
      { label: "Last used", value: "94 days ago" },
      { label: "Granted by", value: "SCIM (Okta)" },
    ],
    recommendation: "revoked",
    decision: null,
  },
  {
    id: "grace.logs-read",
    label: "Logs reader",
    state: "granted",
    subject: { name: "Grace Hopper", detail: "grace@qeet.in" },
    risk: "low",
    decision: "approved",
  },
  {
    id: "svc.deploy",
    label: "Deploy",
    state: "granted",
    subject: { name: "ci-deployer", detail: "svc_01J9" },
    risk: "critical",
    locked: true,
    inherited: true,
    decision: null,
  },
];

describe("AccessReview certification", () => {
  it("adds subject, risk, evidence and decision columns from the data", () => {
    render(<AccessReview items={reviewItems} onDecisionChange={() => {}} />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Subject", "Access", "Risk", "Evidence", "Decision"]);
    // The subject identifies the row.
    expect(screen.getAllByRole("rowheader").map((h) => h.textContent)).toEqual([
      expect.stringContaining("Ada Lovelace"),
      expect.stringContaining("Grace Hopper"),
      expect.stringContaining("ci-deployer"),
    ]);
  });

  it("names row actions with their access and subject", () => {
    const onDecisionChange = vi.fn();
    render(<AccessReview items={reviewItems} onDecisionChange={onDecisionChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Revoke Billing admin for Ada Lovelace" }));
    expect(onDecisionChange).toHaveBeenCalledWith(["ada.billing-admin"], "revoked");
    fireEvent.click(screen.getByRole("button", { name: "Approve Billing admin for Ada Lovelace" }));
    expect(onDecisionChange).toHaveBeenLastCalledWith(["ada.billing-admin"], "approved");
  });

  it("shows a recorded decision with an undo", () => {
    const onDecisionChange = vi.fn();
    render(<AccessReview items={reviewItems} onDecisionChange={onDecisionChange} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Undo decision on Logs reader for Grace Hopper" }),
    );
    expect(onDecisionChange).toHaveBeenCalledWith(["grace.logs-read"], null);
  });

  it("disables decisions on locked rows", () => {
    render(<AccessReview items={reviewItems} onDecisionChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Revoke Deploy for ci-deployer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Approve Deploy for ci-deployer" })).toBeDisabled();
    expect(screen.getByText("Locked")).toBeInTheDocument();
    expect(screen.getByText("Inherited")).toBeInTheDocument();
  });

  it("states risk as a word, with the level spelled out for screen readers", () => {
    render(<AccessReview items={reviewItems} onDecisionChange={() => {}} />);
    expect(screen.getByText("High risk")).toHaveClass("sr-only");
    expect(screen.getByText("Critical risk")).toHaveClass("sr-only");
    expect(screen.getByText("Admin, unused for 94 days")).toBeInTheDocument();
  });

  it("lists evidence and the recommendation", () => {
    render(<AccessReview items={reviewItems} onDecisionChange={() => {}} />);
    expect(screen.getByText("Last used").tagName).toBe("DT");
    expect(screen.getByText("94 days ago").tagName).toBe("DD");
    expect(screen.getByText("Suggested: revoke")).toBeInTheDocument();
  });

  it("shows progress instead of controls while a decision saves", () => {
    render(
      <AccessReview
        items={reviewItems}
        onDecisionChange={() => {}}
        pendingIds={["ada.billing-admin"]}
      />,
    );
    expect(screen.getByRole("status", { name: "Saving decision" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Revoke Billing admin for Ada Lovelace" }),
    ).not.toBeInTheDocument();
  });

  it("renders a completed review read-only when no handler is given", () => {
    render(<AccessReview items={reviewItems} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Approve / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Undo / })).not.toBeInTheDocument();
  });

  it("keeps explicit table roles so a stacked layout stays a table", () => {
    render(<AccessReview items={reviewItems} onDecisionChange={() => {}} />);
    const table = screen.getByRole("table", { name: "Access review" });
    expect(table).toHaveAttribute("role", "table");
    for (const row of screen.getAllByRole("row")) expect(row).toHaveAttribute("role", "row");
    for (const cell of screen.getAllByRole("cell")) expect(cell).toHaveAttribute("role", "cell");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AccessReview items={reviewItems} onDecisionChange={() => {}} selectable />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("AccessReview bulk review", () => {
  it("selects rows and applies a bulk decision", () => {
    const onDecisionChange = vi.fn();
    render(<AccessReview items={reviewItems} onDecisionChange={onDecisionChange} selectable />);
    expect(
      screen.getByText("Select entries to approve or revoke them together."),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Billing admin for Ada Lovelace" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Logs reader for Grace Hopper" }));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Revoke 2" }));
    expect(onDecisionChange).toHaveBeenCalledWith(
      ["ada.billing-admin", "grace.logs-read"],
      "revoked",
    );
    // The selection is spent once the decision is emitted.
    expect(screen.queryByText("2 selected")).not.toBeInTheDocument();
  });

  it("select-all skips locked rows and reports a partial selection", () => {
    render(<AccessReview items={reviewItems} onDecisionChange={() => {}} selectable />);
    const all = screen.getByRole("checkbox", { name: "Select all" });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Billing admin for Ada Lovelace" }),
    );
    expect(all).toHaveAttribute("aria-checked", "mixed");

    fireEvent.click(all);
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Select Deploy for ci-deployer" }),
    ).not.toBeChecked();
    expect(all).toBeChecked();
  });

  it("marks selected rows for the selected-row styling", () => {
    render(
      <AccessReview
        items={reviewItems}
        onDecisionChange={() => {}}
        selectable
        defaultSelectedIds={["grace.logs-read"]}
      />,
    );
    const row = screen
      .getByRole("checkbox", { name: "Select Logs reader for Grace Hopper" })
      .closest("tr");
    expect(row).toHaveAttribute("data-state", "selected");
  });

  it("respects a controlled selection", () => {
    const onSelectedIdsChange = vi.fn();
    render(
      <AccessReview
        items={reviewItems}
        onDecisionChange={() => {}}
        selectable
        selectedIds={[]}
        onSelectedIdsChange={onSelectedIdsChange}
      />,
    );
    const box = screen.getByRole("checkbox", { name: "Select Billing admin for Ada Lovelace" });
    fireEvent.click(box);
    expect(onSelectedIdsChange).toHaveBeenCalledWith(["ada.billing-admin"]);
    expect(box).not.toBeChecked();
  });

  it("renders caller bulk actions for the selection", () => {
    render(
      <AccessReview
        items={reviewItems}
        selectable
        defaultSelectedIds={["ada.billing-admin"]}
        bulkActions={(ids) => <button type="button">Export {ids.length}</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Export 1" })).toBeInTheDocument();
  });
});

describe("AccessReview empty state", () => {
  it("renders the default message as an EmptyState", () => {
    const { container } = render(<AccessReview items={[]} />);
    expect(screen.getByText("No access assignments.")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="empty-state"]')).not.toBeNull();
  });

  it("renders a custom node as given, without a paragraph around it", () => {
    const { container } = render(
      <AccessReview items={[]} emptyMessage={<div data-testid="custom">Nothing to review</div>} />,
    );
    expect(screen.getByTestId("custom").closest("p")).toBeNull();
    expect(container.querySelector('[data-slot="empty-state"]')).toBeNull();
  });
});

describe("AccessReview messages", () => {
  it("translates headers and actions per key", () => {
    render(
      <AccessReview
        items={reviewItems.slice(0, 1)}
        onDecisionChange={() => {}}
        messages={{ revoke: "Widerrufen", decisionHeader: "Entscheidung" }}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Entscheidung" })).toBeInTheDocument();
    expect(screen.getByText("Widerrufen")).toBeInTheDocument();
  });

  it("keeps the assignment-mode columns", () => {
    render(<AccessReview items={items} />);
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Access",
      "Scope",
      "State",
    ]);
  });
});

describe("AccessReview subject avatars", () => {
  it("does not read the initials before the subject's name", () => {
    render(<AccessReview items={reviewItems} onDecisionChange={() => {}} />);
    expect(screen.getAllByRole("rowheader")[0]).toHaveAccessibleName("Ada Lovelace ada@qeet.in");
  });
});
