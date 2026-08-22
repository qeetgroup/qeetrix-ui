"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { CheckCircle2Icon, InfoIcon, TriangleAlertIcon, XCircleIcon, XIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

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

function emit(type: ToastType, title: React.ReactNode, options?: ToastInput) {
  return manager.add({ ...options, title, type });
}

/**
 * Imperative toast API. `toast("…")` shows an info toast; the variants set the
 * intent (icon + accent colour). `toast.promise` ties a toast to a promise's
 * lifecycle; `toast.dismiss(id)` closes one (or all when omitted).
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

const TYPE_ICON: Record<ToastType, React.ElementType> = {
  info: InfoIcon,
  success: CheckCircle2Icon,
  warning: TriangleAlertIcon,
  error: XCircleIcon,
};

const TYPE_ACCENT: Record<ToastType, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
};

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();
  return toasts.map((item) => {
    const type = (item.type ?? "info") as ToastType;
    const Icon = TYPE_ICON[type] ?? InfoIcon;
    return (
      <ToastPrimitive.Root
        key={item.id}
        toast={item}
        data-slot="toast"
        className={cn(
          "group relative flex w-full items-start gap-3 rounded-lg border bg-popover py-3 pe-9 ps-4 text-sm text-popover-foreground shadow-popover transition-all duration-200 ease-out",
          "data-ending-style:translate-x-[120%] data-ending-style:opacity-0 data-starting-style:translate-x-[120%] data-starting-style:opacity-0",
        )}
      >
        <Icon
          aria-hidden
          className={cn("mt-0.5 size-4 shrink-0", TYPE_ACCENT[type] ?? "text-muted-foreground")}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <ToastPrimitive.Title
            data-slot="toast-title"
            className="font-heading text-sm font-medium text-foreground"
          />
          {item.description ? (
            <ToastPrimitive.Description
              data-slot="toast-description"
              className="text-sm text-muted-foreground"
            />
          ) : null}
        </div>
        {item.actionProps ? (
          <ToastPrimitive.Action
            data-slot="toast-action"
            className="self-center rounded-md border bg-transparent px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
          />
        ) : null}
        <ToastPrimitive.Close
          data-slot="toast-close"
          aria-label="Close"
          className="absolute end-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <XIcon aria-hidden className="size-4" />
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>
    );
  });
}

/**
 * Mount once near the app root. Renders the toast viewport (bottom-end,
 * fixed) and subscribes to the shared manager that `toast()` drives.
 */
function Toaster({
  toastManager = manager,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Provider>) {
  return (
    <ToastPrimitive.Provider toastManager={toastManager} {...props}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport
          data-slot="toaster"
          className="fixed bottom-0 end-0 z-(--qx-z-toast) mb-4 me-4 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none"
        >
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}

export type { ToastInput, ToastType };
export { Toaster, toast };
