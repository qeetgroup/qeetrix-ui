import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/Card/card";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

const root = (container: HTMLElement) =>
  container.querySelector("[data-slot='card']") as HTMLElement;

describe("Card", () => {
  it("renders its composed regions", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>Manage your plan</CardDescription>
        </CardHeader>
        <CardContent>Your subscription renews monthly.</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(screen.getByText("Manage your plan")).toBeInTheDocument();
    expect(screen.getByText("Your subscription renews monthly.")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>Manage your plan</CardDescription>
        </CardHeader>
        <CardContent>Your subscription renews monthly.</CardContent>
      </Card>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Card surface treatments", () => {
  it("defaults to the resting card and writes its state as data attributes", () => {
    const { container } = render(<Card>content</Card>);
    const card = root(container);
    expect(card).toHaveAttribute("data-variant", "default");
    expect(card).toHaveAttribute("data-size", "default");
    expect(card).not.toHaveAttribute("data-interactive");
    expect(card).not.toHaveAttribute("data-selected");
  });

  it.each(["default", "outline", "elevated"] as const)("accepts variant=%s", (variant) => {
    const { container } = render(<Card variant={variant}>content</Card>);
    expect(root(container)).toHaveAttribute("data-variant", variant);
  });

  it("draws its boundary with a real border, which survives forced colours", () => {
    // A box-shadow ring is stripped in forced-colours mode, leaving the card with no edge.
    const { container } = render(<Card>content</Card>);
    expect(root(container)).toHaveClass("border");
    expect(root(container).className).not.toMatch(/(^|\s)ring-1(\s|$)/);
  });

  it("does not lift on hover unless it is interactive", () => {
    const { container: staticCard } = render(<Card>static</Card>);
    expect(root(staticCard).className).not.toMatch(/hover:shadow/);
    const { container: interactive } = render(<Card interactive>interactive</Card>);
    expect(root(interactive).className).toMatch(/hover:shadow/);
    expect(root(interactive)).toHaveAttribute("data-interactive", "true");
  });

  it("marks selection for styling without inventing a role or ARIA state", () => {
    const { container } = render(<Card selected>Passkey</Card>);
    const card = root(container);
    // `"true"`, which the shared data-selected variant matches.
    expect(card).toHaveAttribute("data-selected", "true");
    expect(card).not.toHaveAttribute("role");
    expect(card).not.toHaveAttribute("aria-selected");
  });

  it("keeps a nested card flat", () => {
    const { container } = render(
      <Card>
        <Card data-testid="inner">inner</Card>
      </Card>,
    );
    expect(container.querySelector("[data-testid='inner']")?.className).toMatch(
      /in-data-\[slot=card\]:shadow-none/,
    );
  });
});

describe("Card composition with render", () => {
  it("renders as a link for a navigational card, keeping its slot and styling", async () => {
    render(
      <Card interactive render={<a href="/pay" />}>
        <CardHeader>
          <CardTitle>Qeet Pay</CardTitle>
          <CardDescription>Payments and invoicing</CardDescription>
        </CardHeader>
      </Card>,
    );
    const link = screen.getByRole("link", { name: /Qeet Pay/ });
    expect(link).toHaveAttribute("href", "/pay");
    expect(link).toHaveAttribute("data-slot", "card");
    expect(link.className).toContain("focus-visible:focus-ring");
    await userEvent.tab();
    expect(link).toHaveFocus();
  });

  it("merges the element's own props over the card's, chaining handlers and joining classes", async () => {
    const onCard = vi.fn();
    const onElement = vi.fn();
    render(
      <Card
        interactive
        onClick={onCard}
        className="w-72"
        render={<button type="button" className="text-start" onClick={onElement} />}
      >
        Choose plan
      </Card>,
    );
    const button = screen.getByRole("button", { name: "Choose plan" });
    expect(button).toHaveClass("w-72", "text-start", "border");
    await userEvent.click(button);
    expect(onCard).toHaveBeenCalledOnce();
    expect(onElement).toHaveBeenCalledOnce();
  });

  it("passes the card's state to a render function", () => {
    const seen: unknown[] = [];
    render(
      <Card
        selected
        variant="outline"
        render={(props, state) => {
          seen.push(state);
          return <section {...props} aria-label="Plan" />;
        }}
      >
        Pro
      </Card>,
    );
    expect(screen.getByRole("region", { name: "Plan" })).toHaveAttribute("data-slot", "card");
    expect(seen.at(-1)).toEqual({
      size: "default",
      variant: "outline",
      interactive: false,
      selected: true,
    });
  });

  it("forwards refs from both the card and the rendered element", () => {
    const cardRef = React.createRef<HTMLDivElement>();
    const elementRef = React.createRef<HTMLAnchorElement>();
    render(
      <Card ref={cardRef} render={<a href="/x" ref={elementRef} />}>
        x
      </Card>,
    );
    expect(cardRef.current).toBeInstanceOf(HTMLAnchorElement);
    expect(elementRef.current).toBe(cardRef.current);
  });

  it("lets the title render as a heading at the level the page needs", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle render={(props) => <h3 {...props} />}>Billing</CardTitle>
        </CardHeader>
      </Card>,
    );
    const heading = screen.getByRole("heading", { level: 3, name: "Billing" });
    expect(heading).toHaveAttribute("data-slot", "card-title");
  });

  it("has no axe violations as an interactive link card with a header action", async () => {
    const { container } = render(
      <ul>
        <li>
          <Card interactive render={<a href="/people" />}>
            <CardHeader>
              <CardTitle>Qeet People</CardTitle>
              <CardDescription>HR, payroll and attendance</CardDescription>
            </CardHeader>
          </Card>
        </li>
        <li>
          <Card selected>
            <CardHeader>
              <CardTitle render={(props) => <h3 {...props} />}>Passkey</CardTitle>
              <CardAction>
                <button type="button">Edit</button>
              </CardAction>
            </CardHeader>
          </Card>
        </li>
      </ul>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
