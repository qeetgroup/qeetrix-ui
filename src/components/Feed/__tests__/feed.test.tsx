import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Feed } from "@/components/Feed/feed";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Feed", () => {
  it("wraps children as articles with feed semantics", () => {
    render(
      <Feed aria-label="Activity">
        <div>First</div>
        <div>Second</div>
      </Feed>,
    );
    expect(screen.getByRole("feed", { name: "Activity" })).toBeInTheDocument();
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(2);
    expect(articles[0]).toHaveAttribute("aria-posinset", "1");
    expect(articles[1]).toHaveAttribute("aria-setsize", "2");
    expect(articles.every((article) => article.tabIndex === 0)).toBe(true);
  });

  it("moves between articles with PageDown and PageUp", () => {
    render(
      <Feed aria-label="Activity">
        <div>First</div>
        <div>Second</div>
      </Feed>,
    );
    const articles = screen.getAllByRole("article");

    articles[0].focus();
    fireEvent.keyDown(articles[0], { key: "PageDown" });
    expect(articles[1]).toHaveFocus();

    fireEvent.keyDown(articles[1], { key: "PageUp" });
    expect(articles[0]).toHaveFocus();
  });

  it("moves before and after the feed with Control+Home and Control+End", () => {
    render(
      <>
        <button type="button">Before feed</button>
        <Feed aria-label="Activity">
          <div>First</div>
          <div>Second</div>
        </Feed>
        <button type="button">After feed</button>
      </>,
    );
    const articles = screen.getAllByRole("article");

    articles[0].focus();
    fireEvent.keyDown(articles[0], { key: "End", ctrlKey: true });
    expect(screen.getByRole("button", { name: "After feed" })).toHaveFocus();

    articles[1].focus();
    fireEvent.keyDown(articles[1], { key: "Home", ctrlKey: true });
    expect(screen.getByRole("button", { name: "Before feed" })).toHaveFocus();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Feed aria-label="Activity">
        <div>Only</div>
      </Feed>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
