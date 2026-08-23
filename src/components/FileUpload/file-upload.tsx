"use client";

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FileIcon,
  ImageIcon,
  Loader2Icon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/Button/button";
import { useFieldControl } from "@/components/Input/field";
import { Progress } from "@/components/Progress/progress";
import type { MessagesFor } from "@/lib/messages";
import { fileUploadMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

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
 * Drag-and-drop (or click) file picker. Presentational + validation only —
 * the parent owns the resulting file list and any upload logic, keeping this
 * framework- and form-library-agnostic (mirrors {@link LogoUploader}).
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
  messages: messageOverrides,
  className,
  children,
  name,
  form,
  id,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: DropzoneProps) {
  const messages = useMessages("fileUpload", fileUploadMessages, messageOverrides);
  const [dragOver, setDragOver] = React.useState(false);
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
          message: messages.rejectedSize(file.name, formatBytes(maxSize)),
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

  // The <input> is rendered as a sibling, not a child, of the <button>.
  // Nesting an <input> inside a <button> is invalid and triggers the axe
  // nested-interactive violation. A native <button> gives us keyboard
  // activation (Enter/Space) and focus management for free.
  return (
    <>
      <button
        type="button"
        data-slot="dropzone"
        tabIndex={disabled ? -1 : 0}
        id={field.id}
        aria-disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={field["aria-labelledby"]}
        aria-describedby={field["aria-describedby"]}
        aria-errormessage={field["aria-errormessage"]}
        aria-invalid={field["aria-invalid"]}
        onClick={open}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          validate(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30",
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
            <UploadCloudIcon aria-hidden className="size-6 text-muted-foreground" />
            <span className="block text-sm font-medium">
              {multiple ? messages.dropMany : messages.dropOne}
            </span>
            {(accept || maxSize) && (
              <span className="block text-xs text-muted-foreground">
                {[accept, maxSize ? messages.maxSizeHint(formatBytes(maxSize)) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
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
  /** Upload progress 0–100. Shown as a bar while `status === "uploading"`. */
  progress?: number;
  status?: FileUploadStatus;
  /** Error text shown when `status === "error"`. */
  error?: string;
  /** Image thumbnail URL (e.g. `URL.createObjectURL(file)`). */
  previewUrl?: string;
  /**
   * Builds the politely-announced status text for this row. Replace it to
   * translate; return `""` to opt out of the announcement.
   */
  statusLabel?: (state: { name: string; status: FileUploadStatus; progress?: number }) => string;
  onRemove?: () => void;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"fileUpload">;
}

const statusIcon: Record<FileUploadStatus, React.ReactNode> = {
  pending: null,
  uploading: <Loader2Icon aria-hidden className="size-4 animate-spin text-muted-foreground" />,
  success: <CheckCircle2Icon aria-hidden className="size-4 text-success" />,
  error: <AlertCircleIcon aria-hidden className="size-4 text-destructive" />,
};

/**
 * One row in a {@link FileList}: icon/thumbnail, name, size, progress, remove.
 *
 * Progress and completion are announced politely and named after the file, so a
 * list of concurrent uploads is followable without sight; a failure is announced
 * once, through the visible `role="alert"`.
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
  className,
  ...props
}: FileUploadItemProps) {
  const messages = useMessages("fileUpload", fileUploadMessages, messageOverrides);
  const isImage = (file.type ?? "").startsWith("image/");
  const announcement = (statusLabel ?? messages.status)({
    name: file.name,
    status,
    progress,
  });
  return (
    <li
      data-slot="file-upload-item"
      className={cn("flex items-center gap-3 rounded-md border bg-card p-2 text-sm", className)}
      {...props}
    >
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
        {previewUrl ? (
          // Plain <img>: framework-agnostic (no next/image).
          <img src={previewUrl} alt="" className="size-full object-cover" />
        ) : isImage ? (
          <ImageIcon aria-hidden className="size-4 text-muted-foreground" />
        ) : (
          <FileIcon aria-hidden className="size-4 text-muted-foreground" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{file.name}</span>
          <span className="ms-auto shrink-0 text-xs text-muted-foreground">
            {formatBytes(file.size)}
          </span>
        </div>
        {status === "uploading" && typeof progress === "number" && (
          // Named after the file: several rows uploading at once are otherwise
          // an anonymous stack of progress bars.
          <Progress value={progress} aria-label={messages.uploading(file.name)} className="h-1" />
        )}
        {status === "error" && error && (
          <span role="alert" className="text-xs text-destructive">
            {error}
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
        {statusIcon[status]}
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={messages.remove(file.name)}
            onClick={onRemove}
          >
            <XIcon aria-hidden />
          </Button>
        )}
      </div>
    </li>
  );
}

/** Container `<ul>` for {@link FileUploadItem}s. */
function FileList({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="file-list" className={cn("flex flex-col gap-2", className)} {...props} />;
}

export type {
  DropzoneProps,
  FileRejection,
  FileRejectionReason,
  FileUploadItemProps,
  FileUploadStatus,
};
export { Dropzone, FileList, FileUploadItem, formatBytes, isFileAccepted };
