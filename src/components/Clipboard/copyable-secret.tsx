"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/Button/button";
import type { MessagesFor } from "@/lib/messages";
import { copyableSecretMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

interface CopyableSecretProps {
  /** The string the user wants to copy. */
  value: string;
  /**
   * Optional inline label appended before the value inside the code box —
   * e.g. `label="client_secret="` produces `client_secret=<value>`.
   * Only the bare `value` (without the label prefix) is copied.
   */
  label?: string;
  /** Render as a single non-wrapping line instead of letting the value wrap. */
  oneLine?: boolean;
  /** Tighter padding for inline use inside dialogs / lists. */
  size?: "sm" | "md";
  /** Disable the copy button (read-only fallback while still visually rendered). */
  disabled?: boolean;
  className?: string;
  /**
   * Override the default "Copy" / "Copied" labels. Equivalent to
   * `messages={{ copy, copied }}` and wins over it; the catalogue is the way to translate
   * every instance at once.
   */
  copyLabel?: string;
  copiedLabel?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"copyableSecret">;
  /** Optional hook that fires after a *confirmed* successful copy. */
  onCopy?: (value: string) => void;
  /**
   * Fires when the copy could not be completed — no Clipboard API and the
   * `execCommand` fallback also failed or was refused. Previously such a
   * failure still flipped the button to "Copied".
   */
  onCopyError?: (error: unknown) => void;
  /** Override the post-copy "Copied" indicator duration in milliseconds. */
  copiedDurationMs?: number;
}

/**
 * CopyableSecret renders a read-only code box next to a Copy button.
 * After a successful copy, the button briefly flips to a checkmark +
 * "Copied" label for `copiedDurationMs` (default 1500 ms) before
 * reverting.
 *
 * The copy is confirmed before the button changes: `onCopy` fires only after the
 * Clipboard API resolves (or the `execCommand` fallback reports success), and a
 * refused copy reports through `onCopyError` and leaves the button unchanged.
 *
 * The value is always fully visible — this primitive is intended for
 * one-time secret-reveal panels (API keys, OAuth client secrets,
 * webhook signing secrets), where masking the value would defeat the
 * purpose. For inspect/masked use cases, build on top of this with a
 * separate reveal toggle.
 */
function CopyableSecret({
  value,
  label,
  oneLine,
  size = "md",
  disabled,
  className,
  copyLabel,
  copiedLabel,
  messages: messageOverrides,
  onCopy,
  onCopyError,
  copiedDurationMs = 1500,
}: CopyableSecretProps) {
  const messages = useMessages("copyableSecret", copyableSecretMessages, messageOverrides);
  const resolvedCopyLabel = copyLabel ?? messages.copy;
  const resolvedCopiedLabel = copiedLabel ?? messages.copied;
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /** Legacy fallback. Returns whether the copy actually happened. */
  const execCommandCopy = () => {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      // `execCommand` signals refusal by *returning* false, not by throwing —
      // ignoring the return value is what made a failed copy look successful.
      return document.execCommand("copy") === true;
    } catch {
      return false;
    } finally {
      ta.remove();
    }
  };

  const handleCopy = async () => {
    let ok = true;
    let cause: unknown;
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      // Browsers without async clipboard API (Safari incognito etc.):
      // fall back to a transient textarea + execCommand("copy").
      ok = execCommandCopy();
      cause = error;
    }
    if (!ok) {
      setCopied(false);
      onCopyError?.(cause);
      return;
    }
    onCopy?.(value);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), copiedDurationMs);
  };

  const codeClasses = cn(
    "flex-1 rounded-md border bg-muted font-mono",
    size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm",
    oneLine ? "overflow-x-auto whitespace-nowrap" : "break-all",
  );

  return (
    <div data-slot="copyable-secret" className={cn("flex items-center gap-2", className)}>
      <code className={codeClasses}>
        {label}
        {value}
      </code>
      <Button
        type="button"
        variant="outline"
        size={size === "sm" ? "sm" : "default"}
        onClick={handleCopy}
        disabled={disabled}
        aria-label={
          copied
            ? resolvedCopiedLabel
            : `${resolvedCopyLabel} ${label?.trim() ?? messages.secret}`.trim()
        }
      >
        {copied ? (
          <>
            <CheckIcon aria-hidden className="text-success" />
            <span className="hidden sm:inline">{resolvedCopiedLabel}</span>
          </>
        ) : (
          <>
            <CopyIcon aria-hidden />
            <span className="hidden sm:inline">{resolvedCopyLabel}</span>
          </>
        )}
      </Button>
    </div>
  );
}

export type { CopyableSecretProps };
export { CopyableSecret };
