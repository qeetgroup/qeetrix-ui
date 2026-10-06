"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import {
  CheckCircle2Icon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import * as React from "react";

import { toastMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useResolvedDirection } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

/**
 * A standalone manager so `toast()` can be called from anywhere — event
 * handlers, async callbacks, even outside the React tree — and the single
 * mounted `<Toaster />` will render it. Mount `<Toaster />` once at the app
 * root (it shares this manager by default).
 */
const manager = ToastPrimitive.createToastManager();

type ToastType = "info" | "success" | "warning" | "error";

/** Options accepted by `toast()` (everything except the title + type). */
type ToastInput = Omit<Parameters<typeof manager.add>[0], "title" | "type">;

/**
 * How long a toast that needs reading or acting on stays up: warnings, errors and any toast
 * with an action. The 5s default suits a confirmation ("Saved"); it is too short to read an
 * error and reach its "Retry", or to find "Undo" by keyboard (F6 moves focus to the toasts).
 * Hover and focus pause the timer either way. Pass `timeout` to override, `0` to persist.
 */
const TOAST_EXTENDED_TIMEOUT = 10_000;

function emit(type: ToastType, title: React.ReactNode, options?: ToastInput) {
  const needsTime = type === "error" || type === "warning" || options?.actionProps != null;
  return manager.add({
    // An error interrupts: Base UI announces a high-priority toast through role="alert".
    // A confirmation stays polite. Either can be overridden per call with `priority`.
    priority: type === "error" ? "high" : "low",
    timeout: needsTime ? TOAST_EXTENDED_TIMEOUT : undefined,
    ...options,
    title,
    type,
  });
}

/**
 * Imperative toast API. `toast("…")` shows an info toast; the variants set the
 * intent (icon + accent colour). `toast.promise` ties a toast to a promise's
 * lifecycle; `toast.dismiss(id)` closes one (or all when omitted).
 *
 * Errors are announced assertively and, like warnings and toasts with an action, stay for 10s
 * instead of 5s. Toasts are for transient feedback: a failure the user must resolve belongs in
 * an inline Alert next to the thing that failed.
 */
const toast = Object.assign(
  (title: React.ReactNode, options?: ToastInput) => emit("info", title, options),
  {
    info: (title: React.ReactNode, options?: ToastInput) => emit("info", title, options),
    success: (title: React.ReactNode, options?: ToastInput) => emit("success", title, options),
    warning: (title: React.ReactNode, options?: ToastInput) => emit("warning", title, options),
    error: (title: React.ReactNode, options?: ToastInput) => emit("error", title, options),
    promise: manager.promise,
    update: manager.update,
    dismiss: (id?: string) => manager.close(id),
  },
);

/** `loading` is the type `toast.promise` gives its pending toast. */
type RenderedType = ToastType | "loading";

const TYPE_ICON: Record<RenderedType, React.ElementType> = {
  info: InfoIcon,
  success: CheckCircle2Icon,
  warning: TriangleAlertIcon,
  error: XCircleIcon,
  loading: Loader2Icon,
};

/** The status hue sits on the icon only; the surface stays a neutral overlay. */
/**
 * Toasts that report an outcome carry their status as an inline-start accent and on the title;
 * `info` — what a bare `toast("…")` is — stays the neutral message.
 */
const TYPE_ACCENT: Partial<Record<RenderedType, string>> = {
  success: "border-s-[3px] border-s-success",
  warning: "border-s-[3px] border-s-warning",
  error: "border-s-[3px] border-s-destructive",
};

const TITLE_TONE: Partial<Record<RenderedType, string>> = {
  success: "text-success-text",
  warning: "text-warning-text",
  error: "text-destructive-text",
};

const TYPE_TONE: Record<RenderedType, string> = {
  info: "text-info-text",
  success: "text-success-text",
  warning: "text-warning-text",
  error: "text-destructive-text",
  loading: "text-muted-foreground animate-spin",
};

function ToastList({ direction }: { direction: "ltr" | "rtl" }) {
  // Toasts are created imperatively from anywhere, including outside React, so there is no
  // call site to hang a `messages` prop on: the provider is the only seam that can reach here.
  const messages = useMessages("toast", toastMessages);
  const { toasts } = ToastPrimitive.useToastManager();
  // Swipe to dismiss toward the edge the viewport is pinned to — the inline end.
  const swipeDirection: ("down" | "left" | "right")[] =
    direction === "rtl" ? ["down", "left"] : ["down", "right"];

  return (
    <>
      {toasts.map((item) => {
        const type = (item.type ?? "info") as RenderedType;
        const Icon = TYPE_ICON[type] ?? InfoIcon;
        return (
          <ToastPrimitive.Root
            key={item.id}
            toast={item}
            swipeDirection={swipeDirection}
            data-slot="toast"
            className={cn(
              "group relative flex w-full items-start gap-3 rounded-(--qx-corner-overlay) border border-border bg-popover py-3 ps-3.5 pe-10 text-sm text-popover-foreground shadow-popover outline-none focus-visible:focus-ring",
              // Over the limit, Base UI keeps the oldest toasts mounted but inert; they are not
              // shown, or the stack outgrows the limit and the hidden ones look clickable.
              "data-limited:hidden",
              // Enter: a short rise and fade. Exit: out toward the inline end (or along the
              // swipe), accelerating. `--toast-dir` mirrors the horizontal motion under RTL.
              "[--toast-dir:1] rtl:[--toast-dir:-1]",
              "transition-[translate,opacity] duration-(--qx-motion-duration-slow) ease-enter",
              "data-starting-style:translate-y-3 data-starting-style:opacity-0",
              "data-ending-style:translate-x-[calc((100%+1rem)*var(--toast-dir))] data-ending-style:opacity-0 data-ending-style:duration-(--qx-motion-duration-normal) data-ending-style:ease-exit",
              "data-[swipe-direction=right]:data-ending-style:translate-x-[calc(var(--toast-swipe-movement-x)+100%+1rem)]",
              "data-[swipe-direction=left]:data-ending-style:translate-x-[calc(var(--toast-swipe-movement-x)-100%-1rem)]",
              "data-[swipe-direction=down]:data-ending-style:translate-x-0 data-[swipe-direction=down]:data-ending-style:translate-y-[calc(var(--toast-swipe-movement-y)+100%+1rem)]",
              TYPE_ACCENT[type],
            )}
          >
            <Icon
              aria-hidden
              data-slot="toast-icon"
              className={cn("mt-0.5 size-4 shrink-0", TYPE_TONE[type] ?? "text-muted-foreground")}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {/* `toast.promise("Uploading…")` and friends arrive as a description with no
                  title. Promote the text to the title so it reads as the message and names the
                  toast's dialog, rather than rendering as grey secondary copy with no name. */}
              <ToastPrimitive.Title
                data-slot="toast-title"
                className={cn(
                  "font-heading text-sm font-medium wrap-break-word text-foreground",
                  TITLE_TONE[type],
                )}
              >
                {item.title ?? item.description}
              </ToastPrimitive.Title>
              {item.title != null && item.description ? (
                <ToastPrimitive.Description
                  data-slot="toast-description"
                  className="text-sm wrap-break-word text-muted-foreground"
                />
              ) : null}
              {item.actionProps ? (
                <div className="mt-2 flex">
                  <ToastPrimitive.Action
                    data-slot="toast-action"
                    className="inline-flex h-7 items-center rounded-md border border-border bg-transparent px-2.5 font-ui text-xs font-medium text-foreground transition-colors duration-(--qx-motion-duration-fast) ease-standard hover:bg-surface-interactive focus-visible:focus-ring dark:border-border-strong"
                  />
                </div>
              ) : null}
            </div>
            <ToastPrimitive.Close
              data-slot="toast-close"
              aria-label={messages.close}
              className="absolute inset-e-2 top-2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--qx-motion-duration-fast) ease-standard hover:bg-surface-interactive hover:text-foreground focus-visible:focus-ring"
            >
              <XIcon aria-hidden className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
    </>
  );
}

/**
 * Mount once near the app root. Renders the toast viewport (bottom-end,
 * fixed) and subscribes to the shared manager that `toast()` drives.
 * F6 moves focus into the toasts; Escape closes the focused one.
 */
function Toaster({
  toastManager = manager,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Provider>) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const direction = useResolvedDirection(viewportRef);
  const messages = useMessages("toast", toastMessages);
  return (
    <ToastPrimitive.Provider toastManager={toastManager} {...props}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport
          ref={viewportRef}
          data-slot="toaster"
          aria-label={messages.viewport}
          // F6 focuses the viewport itself first; Tab then walks the toasts.
          className="fixed bottom-0 inset-e-0 z-(--qx-z-toast) mb-4 me-4 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 rounded-xl outline-none focus-visible:focus-ring"
        >
          <ToastList direction={direction} />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}

export type { ToastInput, ToastType };
export { Toaster, toast };
