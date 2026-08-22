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

import { Button } from "@/components/actions/button";
import { Progress } from "@/components/feedback/progress";
import { cn } from "@/lib/utils";

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

/** Match a file against a comma-separated `accept` string (mime, `image/*`, or `.ext`). */
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
}

/**
 * Drag-and-drop (or click) file picker. Presentational + validation only —
 * the parent owns the resulting file list and any upload logic, keeping this
 * framework- and form-library-agnostic (mirrors {@link LogoUploader}).
 */
function Dropzone({
  accept,
  maxSize,
  maxFiles,
  multiple = true,
  disabled,
  onDrop,
  className,
  children,
  ...props
}: DropzoneProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function validate(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const accepted: File[] = [];
    const rejected: FileRejection[] = [];
    for (const file of files) {
      if (!isFileAccepted(file, accept)) {
        rejected.push({
          file,
          reason: "type",
          message: `${file.name}: file type not allowed.`,
        });
        continue;
      }
      if (maxSize != null && file.size > maxSize) {
        rejected.push({
          file,
          reason: "size",
          message: `${file.name}: larger than ${formatBytes(maxSize)}.`,
        });
        continue;
      }
      if (maxFiles != null && accepted.length >= maxFiles) {
        rejected.push({
          file,
          reason: "count",
          message: `${file.name}: exceeds the ${maxFiles}-file limit.`,
        });
        continue;
      }
      accepted.push(file);
    }
    onDrop?.(accepted, rejected);
  }

  function open() {
    if (!disabled) inputRef.current?.click();
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
        aria-disabled={disabled}
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
            <UploadCloudIcon className="size-6 text-muted-foreground" />
            <span className="block text-sm font-medium">
              {multiple
                ? "Drop files here, or click to browse"
                : "Drop a file here, or click to browse"}
            </span>
            {(accept || maxSize) && (
              <span className="block text-xs text-muted-foreground">
                {[accept, maxSize ? `up to ${formatBytes(maxSize)}` : null]
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
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files) validate(e.target.files);
          e.target.value = "";
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
  onRemove?: () => void;
}

const statusIcon: Record<FileUploadStatus, React.ReactNode> = {
  pending: null,
  uploading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
  success: <CheckCircle2Icon className="size-4 text-success" />,
  error: <AlertCircleIcon className="size-4 text-destructive" />,
};

/** One row in a {@link FileList}: icon/thumbnail, name, size, progress, remove. */
function FileUploadItem({
  file,
  progress,
  status = "pending",
  error,
  previewUrl,
  onRemove,
  className,
  ...props
}: FileUploadItemProps) {
  const isImage = (file.type ?? "").startsWith("image/");
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
          <ImageIcon className="size-4 text-muted-foreground" />
        ) : (
          <FileIcon className="size-4 text-muted-foreground" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{file.name}</span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {formatBytes(file.size)}
          </span>
        </div>
        {status === "uploading" && typeof progress === "number" && (
          <Progress value={progress} className="h-1" />
        )}
        {status === "error" && error && (
          <span role="alert" className="text-xs text-destructive">
            {error}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {statusIcon[status]}
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${file.name}`}
            onClick={onRemove}
          >
            <XIcon />
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
