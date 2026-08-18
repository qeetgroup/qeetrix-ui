import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CopyableSecret } from "@/components/ui/copyable-secret";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("CopyableSecret", () => {
  it("renders the secret value", () => {
    render(<CopyableSecret value="sk_live_abc123" />);
    expect(screen.getByText("sk_live_abc123")).toBeInTheDocument();
  });

  it("renders an optional label prefix (split across elements)", () => {
    const { container } = render(<CopyableSecret value="abc" label="client_secret=" />);
    expect(container.textContent).toContain("client_secret=");
  });

  it("shows the Copy button by default", () => {
    render(<CopyableSecret value="secret" />);
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("copies the value and shows Copied feedback", async () => {
    const onCopy = vi.fn();
    render(<CopyableSecret value="my-secret" onCopy={onCopy} copiedDurationMs={100} />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument(),
    );
    expect(onCopy).toHaveBeenCalledWith("my-secret");
  });

  it("is disabled when disabled=true", () => {
    render(<CopyableSecret value="secret" disabled />);
    expect(screen.getByRole("button", { name: /copy/i })).toBeDisabled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<CopyableSecret value="pk_test_example" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
