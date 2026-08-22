import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardDescription,
  PreviewCardImage,
  PreviewCardTitle,
  PreviewCardTrigger,
  PreviewCardUrl,
} from "@/components/Popover/preview-card";

const a11y = (c: Element) =>
  axe(c, {
    rules: {
      "color-contrast": { enabled: false },
      "aria-command-name": { enabled: false },
      // Isolated component render has no page landmarks — not a component concern.
      region: { enabled: false },
    },
  });

function PreviewCardExample({ open }: { open?: boolean }) {
  return (
    <PreviewCard open={open}>
      <PreviewCardTrigger>Hover over me</PreviewCardTrigger>
      <PreviewCardContent
        title="Example Link"
        description="A brief description of the linked page."
        url="https://example.com"
      />
    </PreviewCard>
  );
}

describe("PreviewCard", () => {
  it("renders the trigger element", () => {
    render(<PreviewCardExample />);
    expect(screen.getByText("Hover over me")).toBeInTheDocument();
  });

  it("trigger has the preview-card-trigger data-slot", () => {
    const { container } = render(<PreviewCardExample />);
    expect(container.querySelector('[data-slot="preview-card-trigger"]')).toBeInTheDocument();
  });

  it("shows structured content when open=true", () => {
    render(<PreviewCardExample open />);
    expect(screen.getByText("Example Link")).toBeInTheDocument();
    expect(screen.getByText("A brief description of the linked page.")).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
  });

  it("renders children when no structured props are provided", () => {
    render(
      <PreviewCard open>
        <PreviewCardTrigger>Link</PreviewCardTrigger>
        <PreviewCardContent>
          <p>Custom preview content</p>
        </PreviewCardContent>
      </PreviewCard>,
    );
    expect(screen.getByText("Custom preview content")).toBeInTheDocument();
  });

  it("renders sub-parts with correct data-slots", () => {
    const { container } = render(
      <div>
        <PreviewCardTitle>Title</PreviewCardTitle>
        <PreviewCardDescription>Desc</PreviewCardDescription>
        <PreviewCardImage src="https://example.com/img.png" />
        <PreviewCardUrl>https://example.com</PreviewCardUrl>
      </div>,
    );
    expect(container.querySelector('[data-slot="preview-card-title"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="preview-card-description"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="preview-card-image"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="preview-card-url"]')).toBeInTheDocument();
  });

  it("has no axe violations on the trigger", async () => {
    const { container } = render(<PreviewCardExample />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations when open", async () => {
    render(<PreviewCardExample open />);
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});
