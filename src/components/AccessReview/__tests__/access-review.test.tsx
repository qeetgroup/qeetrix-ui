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
