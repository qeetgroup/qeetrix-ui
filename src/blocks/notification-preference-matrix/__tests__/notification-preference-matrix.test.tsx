import { fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { NotificationPreferenceMatrix } from "../notification-preference-matrix";

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

describe("NotificationPreferenceMatrix controls", () => {
  it("offers checkbox semantics for form-submitted preferences", () => {
    const onValueChange = vi.fn();
    render(
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={CATEGORIES}
        value={{ billing: { push: true } }}
        onValueChange={onValueChange}
        control="checkbox"
      />,
    );
    expect(screen.queryAllByRole("switch")).toHaveLength(0);
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    expect(screen.getByRole("checkbox", { name: "Billing via Push" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Security via Email" }));
    expect(onValueChange).toHaveBeenCalledWith({
      billing: { push: true },
      security: { email: true },
    });
  });

  it("shows unavailable channels as not available instead of a dead control", () => {
    render(
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={[{ key: "digest", label: "Weekly digest", channels: ["email"] }]}
        value={{}}
        onValueChange={() => {}}
      />,
    );
    expect(screen.getByRole("switch", { name: "Weekly digest via Email" })).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Weekly digest via Push" })).toBeNull();
    expect(screen.getByText("Not available")).toHaveClass("sr-only");
  });

  it("locks administrator-fixed cells and says why", () => {
    const onValueChange = vi.fn();
    render(
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={[{ key: "security", label: "Security", locked: ["email"] }]}
        value={{ security: { email: true } }}
        onValueChange={onValueChange}
      />,
    );
    const locked = screen.getByRole("switch", { name: "Security via Email" });
    expect(locked).toBeChecked();
    expect(locked).toHaveAttribute("aria-disabled", "true");
    expect(locked).toHaveAccessibleDescription("Managed by your organization");
    expect(screen.getByRole("switch", { name: "Security via Push" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("disables every cell", () => {
    render(
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={CATEGORIES}
        value={{}}
        onValueChange={() => {}}
        disabled
      />,
    );
    for (const control of screen.getAllByRole("switch")) {
      expect(control).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("keeps channel icons out of the column header names", () => {
    render(
      <NotificationPreferenceMatrix
        channels={[{ key: "email", label: "Email", icon: <svg data-testid="mail" /> }]}
        categories={CATEGORIES}
        value={{}}
        onValueChange={() => {}}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Email" })).toBeInTheDocument();
    expect(screen.getAllByTestId("mail")[0].closest("[aria-hidden]")).not.toBeNull();
  });

  it("keeps explicit table roles so the stacked layout stays a table", () => {
    render(
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={CATEGORIES}
        value={{}}
        onValueChange={() => {}}
      />,
    );
    expect(screen.getByRole("table")).toHaveAttribute("role", "table");
    for (const header of screen.getAllByRole("rowheader")) {
      expect(header).toHaveAttribute("role", "rowheader");
    }
  });

  it("translates the not-available and locked strings", () => {
    render(
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={[
          { key: "security", label: "Security", channels: ["email"], locked: ["email"] },
        ]}
        value={{}}
        onValueChange={() => {}}
        messages={{ notAvailable: "Nicht verfügbar", locked: "Vom Administrator festgelegt" }}
      />,
    );
    expect(screen.getByText("Nicht verfügbar")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAccessibleDescription("Vom Administrator festgelegt");
  });

  it("has no axe violations with checkboxes, locked and unavailable cells", async () => {
    const { container } = render(
      <NotificationPreferenceMatrix
        channels={CHANNELS}
        categories={[
          { key: "security", label: "Security", locked: ["email"] },
          { key: "digest", label: "Digest", channels: ["email"] },
        ]}
        value={{ security: { email: true } }}
        onValueChange={() => {}}
        control="checkbox"
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
