"use client";

import { ChevronDownIcon } from "@qeetrix/icons/icons/chevron-down";
import * as React from "react";

import { useControllableState } from "@/hooks/use-controllable-state";
import { spoilerMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

interface SpoilerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lines shown before truncating. */
  maxLines?: number;
  showLabel?: string;
  hideLabel?: string;
  /**
   * Controlled expanded state. When provided, Spoiler does not manage it — the consumer owns it
   * and `onExpandedChange` reports the intent.
   */
  expanded?: boolean;
  /** Initial expanded state when uncontrolled. */
  defaultExpanded?: boolean;
  /** Fires with the intended next state, in both controlled and uncontrolled mode. */
  onExpandedChange?: (expanded: boolean) => void;
}

// Layout-dependent measurement must land before paint, or a toggle for content that fits
// flashes on screen for a frame. The server has no layout, so it skips the effect entirely.
const useBrowserLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

function matchesFocusVisible(element: Element) {
  try {
    return element.matches(":focus-visible");
  } catch {
    // An engine without the selector: treat focus as keyboard focus, the safe direction.
    return true;
  }
}

/**
 * Truncates content to `maxLines` with an inline show-more/less toggle (Disclosure).
 *
 * The toggle only exists when there is something to disclose: content that fits in `maxLines`
 * renders without a toggle and without the fade. Until the browser has measured — on the server,
 * or anywhere without layout — the toggle is shown, so the content is never stranded.
 *
 * Clamped content stays in the accessibility tree, so assistive technology reads all of it in
 * either state. Keyboard focus landing on something inside the clamped region (a link in the
 * hidden lines) reveals the content, because a focus indicator on an invisible element is no
 * indicator at all. That reveal is reported through `onExpandedChange` like any other.
 */
function Spoiler({
  maxLines = 3,
  showLabel,
  hideLabel,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  className,
  children,
  ...props
}: SpoilerProps) {
  const messages = useMessages("spoiler", spoilerMessages);
  const [expanded, setExpanded] = useControllableState<boolean>({
    value: expandedProp,
    defaultValue: defaultExpanded,
    onChange: onExpandedChange,
  });
  const contentId = React.useId();
  const contentRef = React.useRef<HTMLDivElement>(null);
  // `null` until measured. Only a collapsed box can be measured — expanded, nothing is clamped —
  // so the last collapsed measurement stands while expanded.
  const [overflowing, setOverflowing] = React.useState<boolean | null>(null);

  // Re-measured after every render (children may have changed) and on every resize (a narrower
  // box wraps into more lines). Cheap: one layout read, only while collapsed.
  useBrowserLayoutEffect(() => {
    const node = contentRef.current;
    if (!node || expanded) return;
    const measure = () => {
      // A zero-height box has not been laid out (hidden ancestor, test DOM): no verdict.
      if (node.clientHeight === 0) return;
      setOverflowing(node.scrollHeight > node.clientHeight + 1);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  });

  const clamped = !expanded;
  const showToggle = expanded || overflowing !== false;

  const onContentFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    if (expanded || overflowing === false) return;
    if (matchesFocusVisible(event.target)) setExpanded(true);
  };

  return (
    <div
      data-slot="spoiler"
      data-expanded={expanded ? "" : undefined}
      className={cn("flex flex-col items-start", className)}
      {...props}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: focus delegation — a descendant receiving keyboard focus reveals the clamped content; the region itself is not a control. */}
      <div
        ref={contentRef}
        id={contentId}
        data-slot="spoiler-content"
        data-overflowing={overflowing === false ? undefined : ""}
        onFocus={onContentFocus}
        className={cn(
          "relative w-full",
          // The fade covers only the last visible line — enough to say "this continues" without
          // dimming text the reader is meant to read. `lh` is the content's own line height.
          clamped &&
            "overflow-hidden data-overflowing:mask-[linear-gradient(to_bottom,black_calc(100%-1lh),transparent)]",
        )}
        style={
          clamped
            ? ({
                display: "-webkit-box",
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: "vertical",
              } as React.CSSProperties)
            : undefined
        }
      >
        {children}
      </div>
      {showToggle && (
        <button
          type="button"
          data-slot="spoiler-toggle"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((e) => !e)}
          className="group/spoiler-toggle mt-1 inline-flex items-center gap-1 rounded-sm text-sm font-medium text-link underline-offset-4 outline-none hover:text-link-hover hover:underline focus-visible:focus-ring"
        >
          {expanded ? (hideLabel ?? messages.hide) : (showLabel ?? messages.show)}
          <ChevronDownIcon
            aria-hidden
            className="size-3.5 shrink-0 transition-[rotate] duration-(--qx-motion-duration-fast) ease-standard group-aria-expanded/spoiler-toggle:rotate-180"
          />
        </button>
      )}
    </div>
  );
}

export type { SpoilerProps };
export { Spoiler };
