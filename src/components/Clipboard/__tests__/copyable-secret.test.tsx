import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CopyableSecret } from "@/components/Clipboard/copyable-secret";

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

  it("does not confirm a copy while the clipboard write is still pending", async () => {
    let resolveWrite: (() => void) | undefined;
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(
          () =>
            new Promise<void>((resolve) => {
              resolveWrite = resolve;
            }),
        ),
      },
    });
    const onCopy = vi.fn();
    render(<CopyableSecret value="pending-secret" onCopy={onCopy} />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(onCopy).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /copied/i })).toBeNull();

    await act(async () => {
      resolveWrite?.();
    });
    expect(onCopy).toHaveBeenCalledWith("pending-secret");
  });

  it("treats a refused execCommand fallback as a failure, not a success", async () => {
    const cause = new Error("clipboard unavailable");
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(cause) } });
    // Older Safari/incognito behaviour: execCommand returns false instead of throwing.
    const execCommand = vi.fn().mockReturnValue(false);
    Object.assign(document, { execCommand });

    const onCopy = vi.fn();
    const onCopyError = vi.fn();
    render(<CopyableSecret value="s3cret" onCopy={onCopy} onCopyError={onCopyError} />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => expect(onCopyError).toHaveBeenCalledWith(cause));
    expect(onCopy).not.toHaveBeenCalled();
    // Pre-fix this flipped to "Copied" even though nothing reached the clipboard.
    expect(screen.queryByRole("button", { name: /copied/i })).toBeNull();
    // The transient textarea is always removed, success or not.
    expect(document.querySelectorAll("textarea")).toHaveLength(0);
  });

  it("accepts a successful execCommand fallback", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no api")) },
    });
    let copiedText = "";
    Object.assign(document, {
      execCommand: vi.fn(() => {
        copiedText =
          (document.querySelector("textarea") as HTMLTextAreaElement | null)?.value ?? "";
        return true;
      }),
    });

    const onCopy = vi.fn();
    const onCopyError = vi.fn();
    render(<CopyableSecret value="fallback-secret" onCopy={onCopy} onCopyError={onCopyError} />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => expect(onCopy).toHaveBeenCalledWith("fallback-secret"));
    expect(copiedText).toBe("fallback-secret");
    expect(onCopyError).not.toHaveBeenCalled();
    expect(document.querySelectorAll("textarea")).toHaveLength(0);
  });

  it("treats a throwing execCommand fallback as a failure", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no api")) },
    });
    Object.assign(document, {
      execCommand: vi.fn(() => {
        throw new Error("not supported");
      }),
    });

    const onCopyError = vi.fn();
    render(<CopyableSecret value="x" onCopyError={onCopyError} />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => expect(onCopyError).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("button", { name: /copied/i })).toBeNull();
    expect(document.querySelectorAll("textarea")).toHaveLength(0);
  });
});
