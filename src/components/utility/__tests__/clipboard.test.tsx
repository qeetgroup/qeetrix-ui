import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CopyButton } from "@/components/utility/clipboard";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

beforeEach(() => {
  vi.stubGlobal("navigator", {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("CopyButton", () => {
  it("renders a button with the Copy label", () => {
    render(<CopyButton value="hello" />);
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<CopyButton value="hello" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
