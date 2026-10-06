import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { Feed, FeedItem, useFeedItemLabel } from "@/components/Feed/feed";

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

describe("Feed variants", () => {
  it("defaults to the card presentation", () => {
    render(
      <Feed aria-label="Activity">
        <div>First</div>
      </Feed>,
    );
    expect(screen.getByRole("feed")).toHaveAttribute("data-variant", "card");
    expect(screen.getByRole("article")).toHaveClass("focus-visible:focus-ring");
  });

  it("renders rows inside one surface in the list presentation", () => {
    render(
      <Feed aria-label="Audit" variant="list">
        <div>First</div>
        <div>Second</div>
      </Feed>,
    );
    const feed = screen.getByRole("feed", { name: "Audit" });
    expect(feed).toHaveAttribute("data-variant", "list");
    expect(feed).toHaveClass("divide-y");
    // Rows sit inside a clipping surface, so their focus indicator is drawn inside them.
    for (const article of screen.getAllByRole("article")) {
      expect(article).toHaveClass("focus-visible:focus-ring-inset");
    }
  });

  it("keeps APG navigation in the list presentation", () => {
    render(
      <Feed aria-label="Audit" variant="list">
        <div>First</div>
        <div>Second</div>
      </Feed>,
    );
    const articles = screen.getAllByRole("article");
    articles[0].focus();
    fireEvent.keyDown(articles[0], { key: "PageDown" });
    expect(articles[1]).toHaveFocus();
  });

  it("merges itemClassName over the variant styling", () => {
    render(
      <Feed aria-label="Activity" itemClassName="rounded-none border-0 consumer-item">
        <div>First</div>
      </Feed>,
    );
    const article = screen.getByRole("article");
    expect(article).toHaveClass("consumer-item", "rounded-none", "border-0");
    expect(article).not.toHaveClass("border");
  });
});

describe("Feed empty state", () => {
  it("renders the empty node instead of an empty feed", () => {
    render(<Feed aria-label="Audit" empty={<p>No events match these filters.</p>} />);
    expect(screen.getByText("No events match these filters.")).toBeInTheDocument();
    expect(screen.queryByRole("feed")).not.toBeInTheDocument();
  });

  it("still renders an empty feed when no empty node is given", () => {
    render(<Feed aria-label="Audit" />);
    expect(screen.getByRole("feed", { name: "Audit" })).toBeInTheDocument();
  });

  it("marks a loading feed busy", () => {
    render(
      <Feed aria-label="Audit" busy>
        <div>First</div>
      </Feed>,
    );
    expect(screen.getByRole("feed")).toHaveAttribute("aria-busy", "true");
  });
});

describe("Feed article naming", () => {
  it("uses a FeedItem child as the article itself, with its own name", () => {
    render(
      <Feed aria-label="Notifications">
        <FeedItem aria-labelledby="n1-title" aria-describedby="n1-body" className="consumer">
          <div id="n1-title">Payment failed</div>
          <div id="n1-body">Card ending 4242 was declined.</div>
        </FeedItem>
        <div>Plain child</div>
      </Feed>,
    );
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(2);
    expect(articles[0]).toHaveAccessibleName("Payment failed");
    expect(articles[0]).toHaveAccessibleDescription("Card ending 4242 was declined.");
    expect(articles[0]).toHaveAttribute("aria-posinset", "1");
    expect(articles[0]).toHaveAttribute("tabindex", "0");
    expect(articles[0]).toHaveClass("consumer", "focus-visible:focus-ring");
    // No second article wrapped around the FeedItem.
    expect(articles[0].parentElement).toHaveAttribute("role", "feed");
  });

  it("lets content name its auto-wrapped article", () => {
    function Entry({ title }: { title: string }) {
      const id = React.useId();
      useFeedItemLabel({ labelledBy: id });
      return <h3 id={id}>{title}</h3>;
    }
    render(
      <Feed aria-label="Activity">
        <Entry title="Passkey added" />
        <Entry title="Session revoked" />
      </Feed>,
    );
    expect(screen.getByRole("article", { name: "Passkey added" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Session revoked" })).toBeInTheDocument();
  });

  it("is a no-op outside a feed", () => {
    function Entry() {
      useFeedItemLabel({ labelledBy: "x" });
      return <span>Standalone</span>;
    }
    render(<Entry />);
    expect(screen.getByText("Standalone")).toBeInTheDocument();
  });

  it("renders a plain article outside a feed", () => {
    render(<FeedItem aria-label="Standalone entry">Body</FeedItem>);
    expect(screen.getByRole("article", { name: "Standalone entry" })).toBeInTheDocument();
  });

  it("has no axe violations with named articles", async () => {
    const { container } = render(
      <Feed aria-label="Notifications">
        <FeedItem aria-labelledby="t">
          <div id="t">Payment failed</div>
        </FeedItem>
      </Feed>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
