import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { FileTypeIcon } from "@/components/ui/file-type-icon";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

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
});
