"use client";

import { CircleAlertIcon } from "@qeetrix/icons/icons/circle-alert";
import { CircleCheckIcon } from "@qeetrix/icons/icons/circle-check";
import { CloudUploadIcon } from "@qeetrix/icons/icons/cloud-upload";
import { RotateCwIcon } from "@qeetrix/icons/icons/rotate-cw";
import { XIcon } from "@qeetrix/icons/icons/x";
import * as React from "react";

import { Button } from "@/components/Button/button";
import { FileTypeIcon } from "@/components/FileCard/file-type-icon";
import { useFieldControl } from "@/components/Input/field";
import { Progress } from "@/components/Progress/progress";
import type { FileUploadMessages, MessagesFor } from "@/lib/messages";
import { fileUploadMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

/**
 * The `fileUpload` group as these components render it. Kept as an alias of the catalogue type
 * (`FileUploadMessages`), which it used to extend, so existing imports keep compiling.
 */
type FileUploadComponentMessages = FileUploadMessages;

/** Resolve the group. */
function useFileUploadMessages(overrides: MessagesFor<"fileUpload"> | undefined) {
  return useMessages("fileUpload", fileUploadMessages, overrides);
}

/** Why a file was turned away by the dropzone. */
type FileRejectionReason = "type" | "size" | "count";

interface FileRejection {
  file: File;
  reason: FileRejectionReason;
  message: string;
}

/** Human-readable byte size, e.g. `1.4 MB`. */
function formatBytes(bytes: number, locale = "en"): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / k ** i;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${units[i]}`;
}

/**
 * Match a file against a comma-separated `accept` string (mime, `image/*`, or
 * `.ext`).
 *
 * This inspects only what the browser reports: the file name and the MIME type
 * the OS guessed. A renamed executable, or an SVG carrying script, passes. Treat
 * it as a UX filter, never as a security boundary — the server must verify the
 * real signature (and sanitise SVG) before storing or serving anything.
 */
function isFileAccepted(file: File, accept?: string): boolean {
  if (!accept) return true;
  const tokens = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((tok) => {
    if (tok.startsWith(".")) return name.endsWith(tok);
    if (tok.endsWith("/*")) return type.startsWith(tok.slice(0, -1));
    return type === tok;
  });
}

/**
 * The `accept` policy as a reader would write it: `.pdf,.png` → "PDF, PNG". Exact MIME types
 * with a short subtype read the same way (`application/pdf` → "PDF"); wildcards and long vendor
 * types are left as written.
 */
function describeAccept(accept: string): string {
  return accept
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      if (t.startsWith(".")) return t.slice(1).toUpperCase();
      const sub = t.split("/")[1] ?? "";
      return /^[a-z0-9]{2,5}$/i.test(sub) ? sub.toUpperCase() : t;
    })
    .join(", ");
}

interface DropzoneProps extends Omit<React.ComponentProps<"button">, "onDrop" | "children"> {
  /** Comma-separated mime types / extensions, e.g. `"image/*,.pdf"`. */
  accept?: string;
  /** Max size per file in bytes. */
  maxSize?: number;
  /** Max files accepted per drop/selection. */
  maxFiles?: number;
  /** Allow selecting more than one file at a time. Defaults to `true`. */
  multiple?: boolean;
  disabled?: boolean;
  /** Fires after validation with the accepted files and any rejections. */
  onDrop?: (accepted: File[], rejected: FileRejection[]) => void;
  /**
   * The constraint line under the instruction. Defaults to the `accept` policy and `maxSize`
   * ("PDF, PNG · up to 10 MB"); pass your own copy to say it in product language.
   */
  hint?: React.ReactNode;
  /** Override the inner content; receives the live drag state. */
  children?: React.ReactNode | ((state: { dragOver: boolean }) => React.ReactNode);
  /**
   * Submits files chosen **through the file dialog** under this name, from the real
   * `<input type="file">` this renders. Files that arrive by *drag and drop* are not in that
   * input — a `FileList` cannot be assembled from a validated subset without `DataTransfer`,
   * which is not available everywhere — so a form that must submit dropped files should submit
   * what `onDrop` handed it. Omit and nothing is serialised.
   */
  name?: string;
  /** Associate the submitted files with a form the dropzone is not nested inside, by form `id`. */
  form?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"fileUpload">;
}

/**
 * The drag state of a drop target, without the flicker.
 *
 * `dragleave` fires every time the pointer crosses from the target onto one of its own
 * children, so a naive boolean blinks off and on while the user is still over the target.
 * Enter and leave events bubble in pairs, so a depth count reaches zero only when the pointer
 * has really left. (`relatedTarget` would say the same thing more directly, but Safari has
 * reported it as `null` on `dragleave`.)
 */
function useDragState(disabled: boolean | undefined) {
  const [dragOver, setDragOver] = React.useState(false);
  const depth = React.useRef(0);
  const reset = () => {
    depth.current = 0;
    setDragOver(false);
  };
  const handlers = {
    onDragEnter: (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      depth.current += 1;
      if (!disabled) setDragOver(true);
    },
    onDragOver: (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = disabled ? "none" : "copy";
      if (!disabled) setDragOver(true);
    },
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragOver(false);
    },
  };
  return { dragOver, reset, handlers };
}

/**
 * The drop-target surface: a calm dashed well at rest, the Qeet tint while files are dragged
 * over it, the danger roles when invalid. Every colour is a `--qx-component-file-upload-*`
 * token, which the logo-uploader block shares, so the two read as one control.
 */
const dropTargetClassName = cn(
  "group/dropzone relative flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-(--qx-component-file-upload-corner) border border-dashed p-(--qx-component-file-upload-padding) text-center text-foreground",
  "border-(--qx-component-file-upload-border) bg-(--qx-component-file-upload-background)",
  "transition-[background-color,border-color] duration-fast ease-standard",
  "hover:border-(--qx-component-file-upload-border-hover) hover:bg-(--qx-component-file-upload-background-hover) focus-visible:focus-ring",
  "aria-invalid:border-(--qx-component-file-upload-border-invalid) aria-invalid:bg-(--qx-component-file-upload-background-invalid) aria-invalid:focus-visible:outline-destructive",
  "data-drag-over:border-(--qx-component-file-upload-border-active) data-drag-over:bg-(--qx-component-file-upload-background-active)",
);

/** The icon tile at the top of a drop target. Turns Qeet while files are over it. */
function DropTargetIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      data-slot="dropzone-icon"
      className={cn(
        "flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground shadow-rest [&>svg]:size-5",
        "transition-[color,border-color] duration-fast ease-standard",
        "group-aria-invalid/dropzone:text-destructive-text",
        "group-data-drag-over/dropzone:border-border-brand group-data-drag-over/dropzone:text-brand",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Drag-and-drop (or click) file picker. Presentational + validation only —
 * the parent owns the resulting file list and any upload logic, keeping this
 * framework- and form-library-agnostic (the logo-uploader block follows the same contract).
 *
 * **Never drag-and-drop only.** The whole target is a native `<button>`: Tab reaches it, Enter
 * and Space open the file dialog, a tap opens it on touch devices, and the instruction says so.
 * Dragging is the shortcut, not the path.
 *
 * Both input paths run the same validation. `multiple={false}` is enforced on
 * drop as well as on the file dialog: the native dialog respects the attribute,
 * but a drop hands over whatever the user dragged, so the count limit has to be
 * applied here or a single-file field silently accepts five.
 *
 * `accept`/`maxSize` are **client-side conveniences**, checked against the
 * browser-reported name and MIME type. Both are attacker-controlled. The server
 * must re-validate size and sniff the real content type; see the note on
 * {@link isFileAccepted}.
 *
 * States: rest (dashed control boundary on a quiet well), hover, `data-drag-over` (Qeet tint
 * and brand boundary), focus-visible (the Qeet focus ring), `aria-invalid` (danger boundary and
 * tint — set by a `Field` error or directly) and disabled. Show rejected files and upload
 * progress as {@link FileUploadItem} rows beneath it.
 *
 * Forms: implements clause (a) of the composite-field contract (see `field.tsx`) — inside a
 * `Field` the dropzone button is named "<label>, <its own copy>" and carries the description,
 * error and `aria-invalid` — and clause (b) only for the file-dialog path, via `name`. It takes
 * no `required`: the file input it would go on is deliberately not a tab stop, and a browser
 * that cannot focus an invalid control refuses the submit without showing anything, which is
 * worse than the consumer owning the check.
 */
function Dropzone({
  accept,
  maxSize,
  maxFiles,
  multiple = true,
  disabled,
  onDrop,
  hint,
  messages: messageOverrides,
  className,
  children,
  name,
  form,
  id,
  onClick,
  onDragEnter,
  onDragOver,
  onDragLeave,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: DropzoneProps) {
  const messages = useFileUploadMessages(messageOverrides);
  const locale = useLocale();
  const { dragOver, reset, handlers } = useDragState(disabled);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // No content composition: the button's own copy is an instruction ("Drop files here…"), not
  // an identity, so a Field label replaces it the way it replaces a native file input's — and
  // the instruction stays on screen either way.
  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });

  // `multiple={false}` means one file, whichever path it arrives by.
  const fileLimit = multiple ? maxFiles : Math.min(maxFiles ?? 1, 1);

  function validate(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const accepted: File[] = [];
    const rejected: FileRejection[] = [];
    for (const file of files) {
      if (!isFileAccepted(file, accept)) {
        rejected.push({
          file,
          reason: "type",
          message: messages.rejectedType(file.name),
        });
        continue;
      }
      if (maxSize != null && file.size > maxSize) {
        rejected.push({
          file,
          reason: "size",
          message: messages.rejectedSize(file.name, formatBytes(maxSize, locale)),
        });
        continue;
      }
      if (fileLimit != null && accepted.length >= fileLimit) {
        rejected.push({
          file,
          reason: "count",
          message:
            fileLimit === 1
              ? messages.rejectedCountOne(file.name)
              : messages.rejectedCount(file.name, fileLimit),
        });
        continue;
      }
      accepted.push(file);
    }
    onDrop?.(accepted, rejected);
  }

  function open() {
    if (disabled) return;
    // Cleared on *open* rather than after the change, so re-picking the same file still fires a
    // change event while the chosen file survives in the input for submission. Clearing after
    // the change also cleared it out of the `FormData`, which made `name` unimplementable.
    const input = inputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  }

  const constraint =
    hint ??
    ((accept || maxSize) &&
      [
        accept ? describeAccept(accept) : null,
        maxSize ? messages.maxSizeHint(formatBytes(maxSize, locale)) : null,
      ]
        .filter(Boolean)
        .join(" · "));

  // The <input> is rendered as a sibling, not a child, of the <button>.
  // Nesting an <input> inside a <button> is invalid and triggers the axe
  // nested-interactive violation. A native <button> gives us keyboard
  // activation (Enter/Space) and focus management for free.
  return (
    <>
      <button
        type="button"
        data-slot="dropzone"
        data-drag-over={dragOver || undefined}
        tabIndex={disabled ? -1 : 0}
        id={field.id}
        aria-disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={field["aria-labelledby"]}
        aria-describedby={field["aria-describedby"]}
        aria-errormessage={field["aria-errormessage"]}
        aria-invalid={field["aria-invalid"]}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) open();
        }}
        onDragEnter={(event) => {
          onDragEnter?.(event);
          handlers.onDragEnter(event);
        }}
        onDragOver={(event) => {
          onDragOver?.(event);
          handlers.onDragOver(event);
        }}
        onDragLeave={(event) => {
          onDragLeave?.(event);
          handlers.onDragLeave();
        }}
        onDrop={(e) => {
          e.preventDefault();
          reset();
          if (disabled) return;
          validate(e.dataTransfer.files);
        }}
        className={cn(
          dropTargetClassName,
          disabled && "pointer-events-none opacity-disabled",
          className,
        )}
        {...props}
      >
        {typeof children === "function" ? (
          children({ dragOver })
        ) : children ? (
          children
        ) : (
          <>
            <DropTargetIcon>
              <CloudUploadIcon />
            </DropTargetIcon>
            <span className="flex flex-col gap-1">
              <span className="block font-ui text-sm font-medium">
                {multiple ? messages.dropMany : messages.dropOne}
              </span>
              {constraint && (
                <span className="block text-caption text-muted-foreground">{constraint}</span>
              )}
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        name={name}
        form={form}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files) validate(e.target.files);
        }}
      />
    </>
  );
}

type FileUploadStatus = "pending" | "uploading" | "success" | "error";

interface FileUploadItemProps extends Omit<React.ComponentProps<"li">, "onError"> {
  /** The file (or a lightweight `{ name, size, type }` for already-uploaded files). */
  file: File | { name: string; size: number; type?: string };
  /**
   * Upload progress 0–100. Shown as a bar and a percentage while `status === "uploading"`;
   * omit it there for an indeterminate bar.
   */
  progress?: number;
  status?: FileUploadStatus;
  /** Error text shown when `status === "error"`. Defaults to a generic "Upload failed." */
  error?: string;
  /** Image thumbnail URL (e.g. `URL.createObjectURL(file)`). */
  previewUrl?: string;
  /**
   * Builds the politely-announced status text for this row. Replace it to
   * translate; return `""` to opt out of the announcement.
   */
  statusLabel?: (state: { name: string; status: FileUploadStatus; progress?: number }) => string;
  /** Removes the row. Shown in every state, except while uploading when `onCancel` is given. */
  onRemove?: () => void;
  /** Cancels an upload in flight. Shown while `status` is `pending` or `uploading`. */
  onCancel?: () => void;
  /** Retries a failed upload. Shown when `status === "error"`. */
  onRetry?: () => void;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"fileUpload">;
}

/**
 * One row in a {@link FileList}: type icon or thumbnail, name, size and status, a progress bar
 * while uploading, and the row's actions — cancel while in flight, retry when failed, remove.
 *
 * Progress and completion are announced politely and named after the file, so a
 * list of concurrent uploads is followable without sight; a failure is announced
 * once, through the visible `role="alert"`. Every action is a real button named after the
 * file ("Retry report.pdf"), so a list of identical icons is still distinguishable by ear.
 *
 * A failed row is the one that needs attention, so it alone is tinted; the status is also
 * carried by an icon and by text, never by colour alone.
 */
function FileUploadItem({
  file,
  progress,
  status = "pending",
  error,
  previewUrl,
  statusLabel,
  messages: messageOverrides,
  onRemove,
  onCancel,
  onRetry,
  className,
  ...props
}: FileUploadItemProps) {
  const messages = useFileUploadMessages(messageOverrides);
  const locale = useLocale();
  const announcement = (statusLabel ?? messages.status)({
    name: file.name,
    status,
    progress,
  });
  const inFlight = status === "pending" || status === "uploading";
  const hasProgress = typeof progress === "number";
  const clamped = hasProgress ? Math.min(Math.max(progress, 0), 100) : null;
  const percent =
    status === "uploading" && clamped !== null
      ? new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(
          clamped / 100,
        )
      : null;

  return (
    <li
      data-slot="file-upload-item"
      data-status={status}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-(--qx-component-file-upload-item-border) bg-(--qx-component-file-upload-item-background) p-(--qx-component-file-upload-item-padding) text-sm",
        "transition-[background-color,border-color] duration-fast ease-standard",
        "data-[status=error]:border-(--qx-component-file-upload-item-border-error) data-[status=error]:bg-(--qx-component-file-upload-item-background-error)",
        className,
      )}
      {...props}
    >
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-sunken">
        {previewUrl ? (
          // Plain <img>: framework-agnostic (no next/image).
          <img src={previewUrl} alt="" className="size-full object-cover" />
        ) : (
          <FileTypeIcon aria-hidden type={file.type || file.name} className="size-4" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* <bdi>: a file name and a "2 MB" keep their own order in a right-to-left UI. */}
        <span className="truncate font-ui font-medium text-foreground" title={file.name}>
          <bdi>{file.name}</bdi>
        </span>
        <div className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
          <bdi className="shrink-0 tabular-nums">{formatBytes(file.size, locale)}</bdi>
          {percent && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{percent}</span>
            </>
          )}
          {status === "success" && (
            <>
              <span aria-hidden>·</span>
              <span className="text-success-text">{messages.uploaded}</span>
            </>
          )}
        </div>
        {status === "uploading" && (
          // Named after the file: several rows uploading at once are otherwise
          // an anonymous stack of progress bars. Indeterminate until progress is known.
          <Progress
            value={clamped}
            aria-label={messages.uploading(file.name)}
            className="**:data-[slot=progress-track]:h-1"
          />
        )}
        {status === "error" && (
          <span role="alert" className="text-caption text-destructive-text">
            {error || messages.failed}
          </span>
        )}
      </div>

      <span
        data-slot="file-upload-item-status"
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {announcement}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        {status === "success" && (
          <CircleCheckIcon aria-hidden className="size-4 text-success-text" />
        )}
        {status === "error" && (
          <CircleAlertIcon aria-hidden className="size-4 text-destructive-text" />
        )}
        {status === "error" && onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={messages.retry(file.name)}
            onClick={onRetry}
          >
            <RotateCwIcon aria-hidden />
          </Button>
        )}
        {inFlight && onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={messages.cancel(file.name)}
            onClick={onCancel}
          >
            <XIcon aria-hidden />
          </Button>
        ) : (
          onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={messages.remove(file.name)}
              onClick={onRemove}
            >
              <XIcon aria-hidden />
            </Button>
          )
        )}
      </div>
    </li>
  );
}

/**
 * Container `<ul>` for {@link FileUploadItem}s. Give it an `aria-label` ("Attachments") when
 * the surrounding copy does not already name the list.
 */
function FileList({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="file-list" className={cn("flex flex-col gap-2", className)} {...props} />;
}

export type {
  DropzoneProps,
  FileRejection,
  FileRejectionReason,
  FileUploadComponentMessages,
  FileUploadItemProps,
  FileUploadStatus,
};
export { Dropzone, FileList, FileUploadItem, formatBytes, isFileAccepted };
