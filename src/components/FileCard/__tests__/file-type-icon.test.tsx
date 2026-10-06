import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { FileTypeIcon } from "@/components/FileCard/file-type-icon";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

const categoryOf = (type: string) => {
  const { container, unmount } = render(<FileTypeIcon type={type} />);
  const category = container.querySelector("svg")?.getAttribute("data-file-type");
  unmount();
  return category;
};

describe("FileTypeIcon", () => {
  it("renders an icon for a filename", () => {
    const { container } = render(<FileTypeIcon type="report.pdf" />);
    expect(container.querySelector('svg[data-slot="file-type-icon"]')).not.toBeNull();
  });

  it("resolves by MIME type too", () => {
    const { container } = render(<FileTypeIcon type="image/png" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("is hidden from assistive tech as a decorative icon", () => {
    const { container } = render(<FileTypeIcon type="report.pdf" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <span>
        report.pdf <FileTypeIcon type="report.pdf" />
      </span>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it.each([
    ["QP-INV-2026-00412.pdf", "document"],
    ["settlements-2026-09.csv", "spreadsheet"],
    ["board-review.pptx", "presentation"],
    ["webhook-payload.json", "data"],
    ["middleware.ts", "code"],
    ["pan-card-acme.PNG", "image"],
    ["kyc-video-call.mp4", "video"],
    ["ivr-greeting.mp3", "audio"],
    ["audit-log-2026-10.zip", "archive"],
    ["saml-signing.pem", "certificate"],
    ["QeetText-Regular.woff2", "font"],
    ["signing-cert.unknownext", "file"],
    ["png", "image"],
  ])("resolves the filename or extension %s to %s", (type, category) => {
    expect(categoryOf(type)).toBe(category);
  });

  it.each([
    ["application/pdf", "document"],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "spreadsheet"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "document"],
    ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "presentation"],
    ["application/vnd.ms-excel", "spreadsheet"],
    ["application/x-zip-compressed", "archive"],
    ["application/json", "data"],
    ["text/csv", "spreadsheet"],
    ["text/html", "code"],
    ["text/plain", "document"],
    ["video/quicktime", "video"],
    ["application/x-pem-file", "certificate"],
    ["application/octet-stream", "file"],
  ])("resolves the MIME type %s to %s", (type, category) => {
    expect(categoryOf(type)).toBe(category);
  });

  it("lets a consumer make it meaningful instead of decorative", () => {
    const { container } = render(
      <FileTypeIcon type="a.pdf" aria-hidden={false} role="img" aria-label="PDF document" />,
    );
    expect(container.querySelector("svg")).toHaveAttribute("aria-label", "PDF document");
  });
});
