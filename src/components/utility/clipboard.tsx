"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/actions/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// useCopyToClipboard
// ---------------------------------------------------------------------------

interface UseCopyToClipboardReturn {
  copied: boolean;
  copy: (text: string) => void;
}

function useCopyToClipboard(timeout = 1500): UseCopyToClipboardReturn {
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = React.useCallback(
    (text: string) => {
      void navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), timeout);
      });
    },
    [timeout],
  );

  return { copied, copy };
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
  /** Called after a successful copy. */
  onCopy?: () => void;
  /** Label shown while in the copied state. Default "Copied!" */
  copiedLabel?: string;
  /** Label shown in the default state. Default "Copy" */
  label?: string;
}

function CopyButton({
  value,
  timeout = 1500,
  onCopy,
  copiedLabel = "Copied!",
  label = "Copy",
  variant = "outline",
  size = "sm",
  className,
  ...rest
}: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard(timeout);

  return (
    <Button
      data-slot="copy-button"
      variant={variant}
      size={size}
      aria-label={copied ? copiedLabel : label}
      className={cn(className)}
      onClick={() => {
        copy(value);
        onCopy?.();
      }}
      {...rest}
    >
      {copied ? (
        <CheckIcon aria-hidden className="size-3.5" />
      ) : (
        <CopyIcon aria-hidden className="size-3.5" />
      )}
      <span className="ms-1">{copied ? copiedLabel : label}</span>
    </Button>
  );
}

export type { CopyButtonProps, UseCopyToClipboardReturn };
export { CopyButton, useCopyToClipboard };
