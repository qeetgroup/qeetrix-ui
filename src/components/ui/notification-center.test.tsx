import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { NotificationCenter, type NotificationItem } from "@/components/ui/notification-center";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const ITEMS: NotificationItem[] = [
  { id: "1", title: "New sign-in", read: false },
  { id: "2", title: "Invoice paid", read: false },
  { id: "3", title: "Welcome", read: true },
];

describe("NotificationCenter", () => {
  it("shows the unread count on the trigger", () => {
    render(<NotificationCenter items={ITEMS} />);
    expect(screen.getByRole("button", { name: /2 unread/i })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("exposes focusable notifications with feed keyboard navigation", async () => {
    const user = userEvent.setup();
    render(<NotificationCenter items={ITEMS} />);

    await user.click(screen.getByRole("button", { name: /2 unread/i }));
    const articles = await screen.findAllByRole("article");
    expect(articles.every((article) => article.tabIndex === 0)).toBe(true);

    articles[0].focus();
    fireEvent.keyDown(articles[0], { key: "PageDown" });
    expect(articles[1]).toHaveFocus();
  });

  it("has no axe violations (closed)", async () => {
    const { container } = render(<NotificationCenter items={ITEMS} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
