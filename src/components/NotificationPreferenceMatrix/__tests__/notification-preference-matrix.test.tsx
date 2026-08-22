import { fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { NotificationPreferenceMatrix } from "@/components/NotificationPreferenceMatrix/notification-preference-matrix";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const CHANNELS = [
  { key: "email", label: "Email" },
  { key: "push", label: "Push" },
];
const CATEGORIES = [
  { key: "security", label: "Security" },
  { key: "billing", label: "Billing" },
];

describe("NotificationPreferenceMatrix", () => {
  it("renders a switch per category × channel", () => {
    render(
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={CATEGORIES}
        value={{}}
        onValueChange={() => {}}
      />,
    );
    expect(screen.getAllByRole("switch")).toHaveLength(4);
  });

  it("toggles a cell", () => {
    const onValueChange = vi.fn();
    render(
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={CATEGORIES}
        value={{}}
        onValueChange={onValueChange}
      />,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Security via Email" }));
    expect(onValueChange).toHaveBeenCalledWith({ security: { email: true } });
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={CATEGORIES}
        value={{}}
        onValueChange={() => {}}
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("NotificationPreferenceMatrix table relationships", () => {
  function Matrix(props: Partial<React.ComponentProps<typeof NotificationPreferenceMatrix>> = {}) {
    return (
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={CATEGORIES}
        value={{}}
        onValueChange={() => {}}
        {...props}
      />
    );
  }

  it("names the table with a caption", () => {
    render(<Matrix />);
    // A table with no caption or label announces as an anonymous table.
    expect(
      screen.getByRole("table", { name: "Notification preferences by channel" }),
    ).toBeInTheDocument();
  });

  it("accepts a custom caption and can show it", () => {
    const { container, unmount } = render(<Matrix caption="Alert routing" />);
    expect(screen.getByRole("table", { name: "Alert routing" })).toBeInTheDocument();
    // Hidden by default: the visual layout is unchanged.
    expect(container.querySelector("caption")).toHaveClass("sr-only");
    unmount();

    const second = render(<Matrix caption="Alert routing" captionVisible />);
    expect(second.container.querySelector("caption")).not.toHaveClass("sr-only");
  });

  it("exposes each category as a row header", () => {
    render(<Matrix />);
    const rowHeaders = screen.getAllByRole("rowheader");
    expect(rowHeaders.map((h) => h.textContent)).toEqual(["Security", "Billing"]);
    for (const header of rowHeaders) {
      expect(header.tagName).toBe("TH");
      expect(header).toHaveAttribute("scope", "row");
    }
  });

  it("exposes each channel as a column header", () => {
    render(<Matrix />);
    const columnHeaders = screen.getAllByRole("columnheader");
    expect(columnHeaders.map((h) => h.textContent)).toEqual(["Notification", "Email", "Push"]);
    for (const header of columnHeaders) {
      expect(header).toHaveAttribute("scope", "col");
    }
  });

  it("keeps the category description inside its row header", () => {
    render(
      <Matrix
        categories={[{ key: "security", label: "Security", description: "Sign-ins and keys" }]}
      />,
    );
    const header = screen.getByRole("rowheader");
    expect(header).toHaveTextContent("Security");
    expect(header).toHaveTextContent("Sign-ins and keys");
  });

  it("renames the category column header", () => {
    render(<Matrix categoryHeader="Event" />);
    expect(screen.getByRole("columnheader", { name: "Event" })).toBeInTheDocument();
  });

  it("still names every switch with both axes", () => {
    render(<Matrix />);
    for (const cat of CATEGORIES) {
      for (const ch of CHANNELS) {
        expect(
          screen.getByRole("switch", { name: `${cat.label} via ${ch.label}` }),
        ).toBeInTheDocument();
      }
    }
  });

  it("has no axe violations with descriptions and a visible caption", async () => {
    const { container } = render(
      <Matrix
        captionVisible
        categories={[
          { key: "security", label: "Security", description: "Sign-ins and keys" },
          { key: "billing", label: "Billing" },
        ]}
        value={{ security: { email: true } }}
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
