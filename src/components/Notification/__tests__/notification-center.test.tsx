import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  NotificationCenter,
  type NotificationItem,
} from "@/components/Notification/notification-center";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const ITEMS: NotificationItem[] = [
  { id: "1", title: "New sign-in", read: false, time: "2m", variant: "warning" },
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

  it("tunes each row for a dense stream", async () => {
    const user = userEvent.setup();
    render(<NotificationCenter items={ITEMS} />);
    await user.click(screen.getByRole("button", { name: /2 unread/i }));
    const [first, , third] = await screen.findAllByRole("article");
    // Inset focus inside the scrolling list, not the translucent halo (no ring utility at all, so
    // nothing is left for a ring-0 reset to cancel).
    expect(first).toHaveClass("focus-visible:focus-ring-inset");
    expect(first.className).not.toMatch(/focus-visible:ring-/);
    // Unread: weight plus a named mark; read rows drop back to regular weight.
    expect(within(first).getByText("New sign-in")).toHaveClass("font-semibold");
    expect(within(first).getByRole("img", { name: "Unread" })).toBeInTheDocument();
    expect(within(third).getByText("Welcome")).toHaveClass("font-normal");
    expect(within(third).queryByRole("img", { name: "Unread" })).not.toBeInTheDocument();
    // The time sits on the title line.
    expect(within(first).getByText("2m").parentElement).toBe(
      within(first).getByText("New sign-in").parentElement,
    );
  });

  it("shows the empty state when there is nothing to show", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<NotificationCenter items={[]} />);
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
    expect(baseElement.querySelector('[data-slot="empty-state"]')).not.toBeNull();
  });

  it("has no axe violations (closed)", async () => {
    const { container } = render(<NotificationCenter items={ITEMS} />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations (open)", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(
      <NotificationCenter items={ITEMS} onDismiss={() => {}} onMarkAllRead={() => {}} />,
    );
    await user.click(screen.getByRole("button", { name: /2 unread/i }));
    await screen.findAllByRole("article");
    expect(await a11y(baseElement)).toHaveNoViolations();
  });
});
