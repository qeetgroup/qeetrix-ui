import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { FileCard } from "@/components/ui/file-card";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("FileCard", () => {
  it("renders name, size and meta", () => {
    render(<FileCard name="Q3 Report.pdf" size="2.4 MB" meta="Ada · 2d ago" />);
    expect(screen.getByText("Q3 Report.pdf")).toBeInTheDocument();
    expect(screen.getByText(/2\.4 MB/)).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<FileCard name="photo.png" size="800 KB" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
