import { CheckIcon, CopyIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Internal (src/internal — never a public subpath): the icon and label pair the Clipboard family's
 * copy buttons (CopyButton, CopyableSecret) show, and the way they confirm.
 *
 * Confirmation is a swap, not a show. Both icons share one cell and cross-fade with a slight
 * scale (150ms, the "fast" duration), and both labels share one grid cell, so the button is
 * exactly as wide as the longer of "Copy" and "Copied!" in both states — nothing beside it
 * shifts when the label changes. The reduced-motion rule collapses the fade to a cut.
 *
 * The inactive label is `aria-hidden` as well as invisible, so the accessible name is always
 * the label on screen.
 */

const swap = "transition-[opacity,scale] duration-fast ease-standard";

function CopyFeedbackIcon({ copied }: { copied: boolean }) {
  return (
    <span
      aria-hidden
      data-slot="copy-feedback-icon"
      data-icon="inline-start"
      className="inline-grid shrink-0 place-items-center *:col-start-1 *:row-start-1"
    >
      <CopyIcon className={cn(swap, copied && "scale-75 opacity-0")} />
      <CheckIcon className={cn(swap, "text-success-text", !copied && "scale-75 opacity-0")} />
    </span>
  );
}

function CopyFeedbackLabel({
  copied,
  label,
  copiedLabel,
  className,
}: {
  copied: boolean;
  label: React.ReactNode;
  copiedLabel: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      data-slot="copy-feedback-label"
      className={cn("inline-grid justify-items-center *:col-start-1 *:row-start-1", className)}
    >
      <span aria-hidden={copied || undefined} className={cn(copied && "invisible")}>
        {label}
      </span>
      <span aria-hidden={!copied || undefined} className={cn(!copied && "invisible")}>
        {copiedLabel}
      </span>
    </span>
  );
}

export { CopyFeedbackIcon, CopyFeedbackLabel };
