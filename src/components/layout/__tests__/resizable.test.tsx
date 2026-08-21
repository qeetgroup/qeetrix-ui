import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/layout/resizable";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function TwoPanel() {
  return (
    <ResizablePanelGroup orientation="horizontal" style={{ height: 200 }}>
      <ResizablePanel defaultSize={50}>
        <div>Left panel</div>
      </ResizablePanel>
      <ResizableHandle withHandle aria-label="Resize" />
      <ResizablePanel defaultSize={50}>
        <div>Right panel</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

describe("Resizable", () => {
  it("renders both panels", () => {
    render(<TwoPanel />);
    expect(screen.getByText("Left panel")).toBeInTheDocument();
    expect(screen.getByText("Right panel")).toBeInTheDocument();
  });

  it("renders the drag handle", () => {
    const { container } = render(<TwoPanel />);
    expect(container.querySelector('[data-slot="resizable-handle"]')).toBeInTheDocument();
  });

  it("supports vertical orientation", () => {
    render(
      <ResizablePanelGroup orientation="vertical" style={{ height: 200 }}>
        <ResizablePanel defaultSize={50}>
          <div>Top</div>
        </ResizablePanel>
        <ResizableHandle aria-label="Resize vertically" />
        <ResizablePanel defaultSize={50}>
          <div>Bottom</div>
        </ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(screen.getByText("Top")).toBeInTheDocument();
    expect(screen.getByText("Bottom")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<TwoPanel />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
