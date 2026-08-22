import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/layout/resizable";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

/*
 * ── What jsdom can and cannot prove here ────────────────────────────────────────────────────
 *
 * `react-resizable-panels` will not resize at all without a real measurement: every panel
 * reports a zero-size `getBoundingClientRect` and `ResizeObserver` never fires, and asking it
 * to resize in jsdom throws `Previous layout not found for panel index 0`. So the *drag* and
 * the *arrow-key resize* are browser assertions (`TEST-001`), and are deliberately absent
 * rather than faked.
 *
 * Everything the widget publishes before the first interaction is observable, and that is a
 * lot: the separator's role, its value model (`aria-valuenow` and which panel it controls),
 * its orientation, the disabled contract, and the axis-dependent geometry classes. Those are
 * what these tests pin — an initial-render suite that asserted only "both panels appear"
 * could not tell a working separator from a bare `<div>`.
 */

function TwoPanel(props: { withHandle?: boolean; orientation?: "horizontal" | "vertical" } = {}) {
  const { withHandle = true, orientation = "horizontal" } = props;
  return (
    <ResizablePanelGroup orientation={orientation} style={{ height: 200 }}>
      <ResizablePanel id="list" defaultSize="40%">
        <div>Left panel</div>
      </ResizablePanel>
      <ResizableHandle withHandle={withHandle} aria-label="Resize" />
      <ResizablePanel id="detail" defaultSize="60%">
        <div>Right panel</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

const handle = () => screen.getByRole("separator", { name: "Resize" });

describe("Resizable", () => {
  it("renders both panels", () => {
    render(<TwoPanel />);
    expect(screen.getByText("Left panel")).toBeInTheDocument();
    expect(screen.getByText("Right panel")).toBeInTheDocument();
  });

  it("exposes the divider as a named, focusable separator", () => {
    render(<TwoPanel />);
    const separator = handle();
    expect(separator).toHaveAttribute("data-slot", "resizable-handle");
    // A separator with no tab stop cannot be resized by keyboard at all, which is the
    // difference between a control and a decoration.
    expect(separator).toHaveAttribute("tabindex", "0");
  });

  it("carries the value model a separator needs to be announced", () => {
    render(<TwoPanel />);
    const separator = handle();
    // Without these a screen reader says "separator" and nothing about the split.
    expect(separator).toHaveAttribute("aria-valuemin", "0");
    expect(separator).toHaveAttribute("aria-valuemax", "100");
    expect(separator).toHaveAttribute("aria-valuenow");
    expect(Number(separator.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
  });

  it("points aria-controls at the panel it resizes", () => {
    render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel id="first">1</ResizablePanel>
        <ResizableHandle aria-label="First divider" />
        <ResizablePanel id="second">2</ResizablePanel>
        <ResizableHandle aria-label="Second divider" />
        <ResizablePanel id="third">3</ResizablePanel>
      </ResizablePanelGroup>,
    );
    // Each divider owns the panel before it, so two dividers are distinguishable to
    // assistive technology rather than being two identical "separator"s.
    expect(screen.getByRole("separator", { name: "First divider" })).toHaveAttribute(
      "aria-controls",
      "first",
    );
    expect(screen.getByRole("separator", { name: "Second divider" })).toHaveAttribute(
      "aria-controls",
      "second",
    );
  });

  it("reports the separator's orientation perpendicular to the group's", () => {
    // ARIA describes the separator's own axis, not the group's: a row of panels is divided
    // by a *vertical* rule. Getting this backwards tells a screen-reader user the wrong keys.
    render(<TwoPanel orientation="horizontal" />);
    expect(handle()).toHaveAttribute("aria-orientation", "vertical");

    render(<TwoPanel orientation="vertical" />);
    expect(screen.getAllByRole("separator", { name: "Resize" })[1]).toHaveAttribute(
      "aria-orientation",
      "horizontal",
    );
  });

  it("lays the group out along the axis it was given", () => {
    const { container } = render(<TwoPanel orientation="horizontal" />);
    const group = container.querySelector<HTMLElement>('[data-slot="resizable-panel-group"]');
    expect(group?.style.flexDirection).toBe("row");

    const vertical = render(<TwoPanel orientation="vertical" />);
    expect(
      vertical.container.querySelector<HTMLElement>('[data-slot="resizable-panel-group"]')?.style
        .flexDirection,
    ).toBe("column");
  });

  it("gives the divider its thickness on the axis it divides", () => {
    // A horizontal group needs a 1px-wide full-height rule; a vertical one the transpose.
    // These were previously unasserted, so the two could have been swapped unnoticed.
    render(<TwoPanel orientation="horizontal" />);
    expect(handle()).toHaveClass("w-px");
    expect(handle()).not.toHaveClass("h-px");

    render(<TwoPanel orientation="vertical" />);
    const vertical = screen.getAllByRole("separator", { name: "Resize" })[1];
    expect(vertical).toHaveClass("h-px", "w-full");
  });

  it("renders the grip only when asked, and rotates it for the axis", () => {
    const { container: without } = render(<TwoPanel withHandle={false} />);
    expect(without.querySelector('[data-slot="resizable-handle"] svg')).toBeNull();

    const { container: horizontal } = render(<TwoPanel withHandle />);
    const grip = horizontal.querySelector('[data-slot="resizable-handle"] svg');
    expect(grip).not.toBeNull();
    // GripVertical already reads as a vertical rule, so a horizontal group leaves it alone.
    expect(grip?.getAttribute("class")).not.toContain("rotate-90");

    const { container: vertical } = render(<TwoPanel withHandle orientation="vertical" />);
    expect(
      vertical.querySelector('[data-slot="resizable-handle"] svg')?.getAttribute("class"),
    ).toContain("rotate-90");
  });

  it("takes the divider out of the tab order when it is disabled", () => {
    render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel id="a">a</ResizablePanel>
        <ResizableHandle disabled aria-label="Locked" />
        <ResizablePanel id="b">b</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const separator = screen.getByRole("separator", { name: "Locked" });
    expect(separator).toHaveAttribute("aria-disabled", "true");
    expect(separator).toHaveAttribute("data-separator", "disabled");
    // Both halves matter: `aria-disabled` alone would leave a focusable control that
    // announces itself as unusable and still swallows a tab stop.
    expect(separator).not.toHaveAttribute("tabindex");
  });

  it("marks the divider inactive until a drag starts", () => {
    render(<TwoPanel />);
    expect(handle()).toHaveAttribute("data-separator", "inactive");
  });

  it("keeps a caller's className alongside the geometry classes", () => {
    render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel id="a">a</ResizablePanel>
        <ResizableHandle className="bg-primary" aria-label="Custom" />
        <ResizablePanel id="b">b</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const separator = screen.getByRole("separator", { name: "Custom" });
    expect(separator).toHaveClass("bg-primary");
    expect(separator).toHaveClass("w-px");
  });

  it("has no axe violations", async () => {
    const { container } = render(<TwoPanel />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations for a disabled divider", async () => {
    const { container } = render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel id="a">a</ResizablePanel>
        <ResizableHandle disabled aria-label="Locked" />
        <ResizablePanel id="b">b</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
