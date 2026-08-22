import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CopyButton, useCopyToClipboard } from "@/components/utility/clipboard";

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

  it("does not call onCopy until the clipboard write resolves", async () => {
    let resolveWrite: (() => void) | undefined;
    const writeText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve;
        }),
    );
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const onCopy = vi.fn();
    render(<CopyButton value="hello" onCopy={onCopy} />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    // The write is in flight. Before the fix onCopy fired synchronously here.
    expect(writeText).toHaveBeenCalledWith("hello");
    expect(onCopy).not.toHaveBeenCalled();

    await act(async () => {
      resolveWrite?.();
    });
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("reports a rejected write through onCopyError and never claims success", async () => {
    const cause = new Error("NotAllowedError");
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(cause) } });

    const onCopy = vi.fn();
    const onCopyError = vi.fn();
    render(<CopyButton value="hello" onCopy={onCopy} onCopyError={onCopyError} />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => expect(onCopyError).toHaveBeenCalledWith(cause));
    expect(onCopy).not.toHaveBeenCalled();
    // Still the idle label — no false "Copied!" confirmation.
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("surfaces a missing Clipboard API as an error rather than an unhandled rejection", async () => {
    vi.stubGlobal("navigator", {});
    const onCopyError = vi.fn();
    render(<CopyButton value="hello" onCopyError={onCopyError} />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() => expect(onCopyError).toHaveBeenCalledTimes(1));
    expect(onCopyError.mock.calls[0][0]).toBeInstanceOf(TypeError);
  });
});

describe("useCopyToClipboard", () => {
  it("resolves true and sets copied only after the write completes", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const { result } = renderHook(() => useCopyToClipboard(1000));
    expect(result.current.copied).toBe(false);

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.copy("token");
    });
    expect(outcome).toBe(true);
    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("resolves false and exposes the cause when the write fails", async () => {
    const cause = new Error("denied");
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(cause) } });

    const { result } = renderHook(() => useCopyToClipboard());
    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.copy("token");
    });
    expect(outcome).toBe(false);
    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBe(cause);
  });

  it("clears a previous error when a later copy succeeds", async () => {
    const writeText = vi
      .fn()
      .mockRejectedValueOnce(new Error("denied"))
      .mockResolvedValueOnce(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("a");
    });
    expect(result.current.error).toBeInstanceOf(Error);
    await act(async () => {
      await result.current.copy("b");
    });
    expect(result.current.error).toBeNull();
    expect(result.current.copied).toBe(true);
  });

  it("does not set state after unmount", async () => {
    let resolveWrite: (() => void) | undefined;
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn(
          () =>
            new Promise<void>((resolve) => {
              resolveWrite = resolve;
            }),
        ),
      },
    });

    const { result, unmount } = renderHook(() => useCopyToClipboard());
    let pending: Promise<boolean> | undefined;
    act(() => {
      pending = result.current.copy("token");
    });
    unmount();
    await act(async () => {
      resolveWrite?.();
      await pending;
    });
    // No "update on unmounted component" work happened; the promise still
    // reports the true outcome of the write.
    await expect(pending).resolves.toBe(true);
  });
});
