"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/actions/button";
import type { MessagesFor } from "@/lib/messages";
import { clipboardMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

// ---------------------------------------------------------------------------
// useCopyToClipboard
// ---------------------------------------------------------------------------

interface UseCopyToClipboardReturn {
  /** True for `timeout` ms after a *confirmed* write. */
  copied: boolean;
  /**
   * The reason the last write failed, or `null`. Reset to `null` when a new
   * write is attempted. A missing/blocked Clipboard API surfaces here.
   */
  error: unknown;
  /**
   * Write `text` to the clipboard. Resolves `true` once the browser has
   * confirmed the write, `false` if it failed — never rejects, so callers can
   * `await` it without a try/catch.
   */
  copy: (text: string) => Promise<boolean>;
}

/**
 * Clipboard write with a confirmed completion contract: `copied` flips only
 * after the underlying promise resolves, and the returned promise reports the
 * outcome so callers do not have to assume success.
 */
function useCopyToClipboard(timeout = 1500): UseCopyToClipboardReturn {
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = React.useCallback(
    async (text: string) => {
      setError(null);
      try {
        // `navigator.clipboard` is undefined on insecure origins, so reading it
        // is itself a failure mode — hence inside the try.
        await navigator.clipboard.writeText(text);
      } catch (cause) {
        if (mountedRef.current) {
          setCopied(false);
          setError(cause);
        }
        return false;
      }
      if (!mountedRef.current) return true;
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), timeout);
      return true;
    },
    [timeout],
  );

  return { copied, error, copy };
}

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

type ButtonProps = React.ComponentProps<typeof Button>;

interface CopyButtonProps extends Omit<ButtonProps, "children" | "onClick"> {
  /** The text to copy to the clipboard. */
  value: string;
  /** Milliseconds before the "copied" state resets. Default 1500. */
  timeout?: number;
  /** Called after a *confirmed* copy — never before the write resolves. */
  onCopy?: () => void;
  /** Called when the copy fails (no Clipboard API, permission denied, …). */
  onCopyError?: (error: unknown) => void;
  /**
   * Label shown while in the copied state. Default "Copied!". Equivalent to
   * `messages={{ copied }}` and wins over it.
   */
  copiedLabel?: string;
  /**
   * Label shown in the default state. Default "Copy". Equivalent to `messages={{ copy }}`
   * and wins over it.
   */
  label?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"clipboard">;
}

function CopyButton({
  value,
  timeout = 1500,
  onCopy,
  onCopyError,
  copiedLabel,
  label,
  messages: messageOverrides,
  variant = "outline",
  size = "sm",
  className,
  ...rest
}: CopyButtonProps) {
  const messages = useMessages("clipboard", clipboardMessages, messageOverrides);
  const resolvedLabel = label ?? messages.copy;
  const resolvedCopiedLabel = copiedLabel ?? messages.copied;
  const { copied, error, copy } = useCopyToClipboard(timeout);
  const onCopyRef = React.useRef(onCopy);
  onCopyRef.current = onCopy;
  const onCopyErrorRef = React.useRef(onCopyError);
  onCopyErrorRef.current = onCopyError;

  // Reported from the hook's state so the original cause reaches the consumer
  // rather than a synthesised error.
  React.useEffect(() => {
    if (error !== null) onCopyErrorRef.current?.(error);
  }, [error]);

  return (
    <Button
      data-slot="copy-button"
      variant={variant}
      size={size}
      aria-label={copied ? resolvedCopiedLabel : resolvedLabel}
      className={cn(className)}
      onClick={() => {
        // `onCopy` fires only once the write is confirmed; before this it fired
        // synchronously and reported success even when the write later failed.
        void copy(value).then((ok) => {
          if (ok) onCopyRef.current?.();
        });
      }}
      {...rest}
    >
      {copied ? (
        <CheckIcon aria-hidden className="size-3.5" />
      ) : (
        <CopyIcon aria-hidden className="size-3.5" />
      )}
      <span className="ms-1">{copied ? resolvedCopiedLabel : resolvedLabel}</span>
    </Button>
  );
}

export type { CopyButtonProps, UseCopyToClipboardReturn };
export { CopyButton, useCopyToClipboard };
