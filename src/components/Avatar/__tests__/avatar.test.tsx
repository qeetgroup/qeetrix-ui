import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/Avatar/avatar";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Avatar", () => {
  it("shows the fallback when the image is unavailable", () => {
    render(
      <Avatar>
        <AvatarImage src="/does-not-exist.png" alt="Ada Lovelace" />
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it.each(["xs", "sm", "default", "lg", "xl"] as const)("writes size %s to data-size", (size) => {
    const { container } = render(
      <Avatar size={size}>
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );
    expect(container.querySelector("[data-slot=avatar]")).toHaveAttribute("data-size", size);
  });

  it("is a circle by default and a square for organisations", () => {
    const { container, rerender } = render(
      <Avatar>
        <AvatarFallback>QG</AvatarFallback>
      </Avatar>,
    );
    const root = () => container.querySelector("[data-slot=avatar]");
    expect(root()).toHaveAttribute("data-shape", "circle");
    rerender(
      <Avatar shape="square">
        <AvatarFallback>QG</AvatarFallback>
      </Avatar>,
    );
    expect(root()).toHaveAttribute("data-shape", "square");
  });
});

describe("Avatar name", () => {
  it("derives initials from the name when the fallback has no children", () => {
    render(
      <Avatar name="Ada Lovelace">
        <AvatarFallback />
      </Avatar>,
    );
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("announces the fallback as the name, not as spelled-out letters", () => {
    render(
      <Avatar name="Rohan Mehta">
        <AvatarFallback />
      </Avatar>,
    );
    expect(screen.getByRole("img", { name: "Rohan Mehta" })).toHaveTextContent("RM");
  });

  it("uses one initial for a one-word name and keeps non-Latin scripts intact", () => {
    const { rerender } = render(
      <Avatar name="Priya">
        <AvatarFallback />
      </Avatar>,
    );
    expect(screen.getByRole("img", { name: "Priya" })).toHaveTextContent(/^P$/);
    rerender(
      <Avatar name="李小龙">
        <AvatarFallback />
      </Avatar>,
    );
    expect(screen.getByRole("img", { name: "李小龙" })).toHaveTextContent(/^李$/);
  });

  it("keeps explicit children over derived initials", () => {
    render(
      <Avatar name="Ada Lovelace">
        <AvatarFallback>A</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveTextContent(/^A$/);
  });

  it("shows a neutral person icon with no name and no children", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback />
      </Avatar>,
    );
    expect(container.querySelector("[data-slot=avatar-fallback] svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("stays out of the way when the consumer hides the fallback", () => {
    // The name is visible beside the avatar, so the consumer opts out of a second announcement.
    const { container } = render(
      <Avatar name="Ada Lovelace">
        <AvatarFallback aria-hidden />
      </Avatar>,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("[data-slot=avatar-fallback]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("has no axe violations when named", async () => {
    const { container } = render(
      <Avatar name="Ada Lovelace" size="lg">
        <AvatarImage src="/does-not-exist.png" />
        <AvatarFallback />
      </Avatar>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("AvatarBadge", () => {
  it("renders inside the avatar and carries a text alternative", () => {
    render(
      <Avatar name="Ada Lovelace">
        <AvatarFallback />
        <AvatarBadge>
          <span className="sr-only">Online</span>
        </AvatarBadge>
      </Avatar>,
    );
    expect(screen.getByText("Online").closest("[data-slot=avatar-badge]")).toBeInTheDocument();
  });
});

describe("AvatarGroup", () => {
  it("stacks named avatars and a named overflow count", async () => {
    const { container } = render(
      <AvatarGroup role="group" aria-label="Reviewers">
        <Avatar name="Ada Lovelace" size="sm">
          <AvatarFallback />
        </Avatar>
        <Avatar name="Rohan Mehta" size="sm">
          <AvatarFallback />
        </Avatar>
        <AvatarGroupCount aria-label="3 more reviewers">+3</AvatarGroupCount>
      </AvatarGroup>,
    );
    expect(screen.getByRole("group", { name: "Reviewers" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "3 more reviewers" })).toHaveTextContent("+3");
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("leaves an unnamed count as plain text", () => {
    render(
      <AvatarGroup>
        <AvatarGroupCount>+3</AvatarGroupCount>
      </AvatarGroup>,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("+3")).toBeInTheDocument();
  });
});
