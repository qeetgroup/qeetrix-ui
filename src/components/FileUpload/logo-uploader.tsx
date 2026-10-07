"use client";

import { CircleAlertIcon } from "@qeetrix/icons/icons/circle-alert";
import { ImageIcon } from "@qeetrix/icons/icons/image";
import { TrashIcon } from "@qeetrix/icons/icons/trash";
import { UploadIcon } from "@qeetrix/icons/icons/upload";
import * as React from "react";

import { Button } from "@/components/Button/button";
import {
  Dropzone,
  type FileRejection,
  formatBytes,
  isFileAccepted,
} from "@/components/FileUpload/file-upload";
import { Input } from "@/components/Input/input";
import type { MessagesFor } from "@/lib/messages";
import { logoUploaderMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

interface LogoUploaderProps {
  /** Current logo source. Can be a public URL or a data URL. Empty means
   *  "no logo set" — the drop-zone is shown. */
  value: string;
  /** Called whenever the value changes — either after a file is picked
   *  (data URL) or after the URL text input is edited. */
  onChange: (next: string) => void;
  /** Maximum file size in megabytes. Files larger than this are
   *  rejected with an inline error. Defaults to 2 MB. */
  maxSizeMB?: number;
  /** Accepted MIME types passed to the file input. Defaults to all images. */
  accept?: string;
  /** Disable everything (e.g. while a save is in flight). */
  disabled?: boolean;
  /** Optional caption shown beneath the file dropzone. */
  hint?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"logoUploader">;
  className?: string;
}

/**
 * The two surfaces a logo is previewed on: this theme's, and the inverse one — light and dark in
 * either theme, so a wordmark that disappears on one of them is caught before it ships.
 */
const PREVIEW_SURFACES = [
  { key: "theme", tile: "bg-surface", icon: "text-muted-foreground" },
  {
    key: "inverse",
    tile: "bg-(--qx-color-surface-inverse)",
    icon: "text-(--qx-color-text-inverse) opacity-70",
  },
] as const;

/** Schemes this component is willing to hand to an `<img src>`. */
const PREVIEWABLE_DATA_IMAGE = /^data:image\/(png|jpeg|jpg|gif|webp|avif|svg\+xml)[;,]/i;

/**
 * Whether `src` is safe to render as an image preview.
 *
 * Relative paths and `http(s)` are fine. `data:` is allowed only for image
 * media types — a `data:text/html` value handed to a preview is a way to get
 * markup rendered somewhere it was not expected. Everything else (`javascript:`,
 * `blob:` from another origin, unknown schemes) is refused.
 */
function isPreviewableSource(src: string): boolean {
  if (!src) return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(src.trim());
  if (!scheme) return true; // relative path or bare filename
  const protocol = scheme[1].toLowerCase();
  if (protocol === "http" || protocol === "https") return true;
  if (protocol === "data") return PREVIEWABLE_DATA_IMAGE.test(src.trim());
  return false;
}

/**
 * LogoUploader is a drop-zone + URL fallback for picking a brand logo.
 *
 * Two input paths share the same `value` slot:
 *   - Drop / click a file → read as data URL via FileReader, emit it.
 *   - Paste a URL into the text input → emit the URL string.
 *
 * The caller treats both shapes the same — they're both strings the
 * `<img>` tag understands. When a real upload endpoint ships, swap the
 * `readAsDataURL` path for an upload-then-emit-URL flow without
 * touching call sites.
 *
 * **Branding is judged on both themes.** Once a logo is set it is previewed twice — on the
 * current theme's surface and on the inverse one — because the common failure of a brand
 * upload is a dark wordmark that vanishes in dark mode (or a white one in light mode), and an
 * admin should see that before saving, not after. A file can be replaced by its button or by
 * dropping a new one onto the preview.
 *
 * The empty state is a {@link Dropzone}, so it is a real button — Tab, Enter or Space, or a tap
 * opens the file dialog — and shares the drop target's states and tokens. Both input paths run
 * the same `accept` check (shared with `Dropzone` via `isFileAccepted`), so a drop cannot
 * bypass the policy the file dialog enforces. That check reads the browser-reported name and
 * MIME type only: **the server must verify the real file signature, cap the size again, and
 * sanitise SVG before storing or serving it.** An SVG logo is a script-carrying document, not a
 * picture.
 *
 * Only `http(s)`, relative paths and `data:image/*` sources are previewed; any
 * other scheme is reported as an error rather than passed to `<img src>`.
 */
function LogoUploader({
  value,
  onChange,
  maxSizeMB = 2,
  accept = "image/*",
  disabled,
  hint,
  messages: messageOverrides,
  className,
}: LogoUploaderProps) {
  const messages = useMessages("logoUploader", logoUploaderMessages, messageOverrides);
  const locale = useLocale();
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const dragDepth = React.useRef(0);
  // The source whose preview failed to load, so the tile shows a placeholder, not a broken image.
  const [failedSource, setFailedSource] = React.useState<string | null>(null);
  // The picked file's name and size, for as long as `value` is still the data URL read from it.
  const [picked, setPicked] = React.useState<{ value: string; name: string; size: number } | null>(
    null,
  );
  const inputRef = React.useRef<HTMLInputElement>(null);
  const readerRef = React.useRef<FileReader | null>(null);
  const hintId = React.useId();
  const errorId = React.useId();

  const maxBytes = maxSizeMB * 1024 * 1024;
  // The drop target speaks in this component's words: its single-file instruction is ours.
  const dropzoneMessages = React.useMemo(() => ({ dropOne: messages.dropZone }), [messages]);

  // A reader left running after unmount, or after the user picks a second file,
  // would resolve into a dead component or overwrite the newer choice.
  React.useEffect(
    () => () => {
      readerRef.current?.abort();
      readerRef.current = null;
    },
    [],
  );

  function readFile(file: File) {
    setError(null);
    readerRef.current?.abort();
    const reader = new FileReader();
    readerRef.current = reader;
    reader.onload = () => {
      if (readerRef.current !== reader) return;
      readerRef.current = null;
      const result = reader.result;
      if (typeof result === "string") {
        setPicked({ value: result, name: file.name, size: file.size });
        onChange(result);
      }
    };
    reader.onerror = () => {
      if (readerRef.current !== reader) return;
      readerRef.current = null;
      setError(messages.readError);
    };
    reader.readAsDataURL(file);
  }

  /** Both paths — the drop target and the Replace dialog — end here, after the same checks. */
  function handleFiles(accepted: File[], rejected: FileRejection[]) {
    const [file] = accepted;
    if (file) {
      readFile(file);
      return;
    }
    const [first] = rejected;
    if (!first) return;
    setError(first.reason === "size" ? messages.rejectedSize(maxSizeMB) : messages.rejectedType);
  }

  /** The Replace path: the same policy the drop target applies, for a file from the dialog. */
  function handlePicked(file: File) {
    if (!isFileAccepted(file, accept)) {
      handleFiles([], [{ file, reason: "type", message: messages.rejectedType }]);
    } else if (file.size > maxBytes) {
      handleFiles([], [{ file, reason: "size", message: messages.rejectedSize(maxSizeMB) }]);
    } else {
      handleFiles([file], []);
    }
  }

  function clearLogo() {
    readerRef.current?.abort();
    readerRef.current = null;
    onChange("");
    setPicked(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const previewable = isPreviewableSource(value);
  const showImage = previewable && failedSource !== value;
  const isDataUrl = value.startsWith("data:");
  const source = isDataUrl
    ? picked?.value === value
      ? `${picked.name} · ${formatBytes(picked.size, locale)}`
      : messages.uploadedFile
    : value;

  return (
    <div data-slot="logo-uploader" className={cn("flex flex-col gap-2", className)}>
      {value ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: drop-to-replace is a pointer shortcut only; the Replace button inside is the keyboard and screen-reader path, so the container needs no role.
        <div
          data-slot="logo-uploader-preview"
          data-drag-over={dragOver || undefined}
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-(--qx-component-file-upload-corner) border border-border bg-surface p-3",
            "transition-[background-color,border-color] duration-fast ease-standard",
            "data-drag-over:border-(--qx-component-file-upload-border-active) data-drag-over:bg-(--qx-component-file-upload-background-active)",
          )}
          // Drop-to-replace: a shortcut for pointer users. The Replace button is the path.
          // Enter/leave are counted, as in Dropzone, so crossing a child does not flicker.
          onDragEnter={(event) => {
            event.preventDefault();
            dragDepth.current += 1;
            if (!disabled) setDragOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragOver(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            dragDepth.current = 0;
            setDragOver(false);
            if (disabled) return;
            const file = event.dataTransfer.files[0];
            if (file) handlePicked(file);
          }}
        >
          <div className="flex shrink-0 gap-2">
            {/* The logo on this theme's surface, and on the inverse one. */}
            {PREVIEW_SURFACES.map((surface, index) => (
              <div
                key={surface.key}
                data-slot="logo-uploader-tile"
                data-surface={surface.key}
                className={cn(
                  "flex size-16 items-center justify-center overflow-hidden rounded-lg border border-border p-2",
                  surface.tile,
                )}
              >
                {showImage ? (
                  // Plain <img>: this is a framework-agnostic component (no next/image).
                  <img
                    src={value}
                    // One image carries the name; the second is the same logo, so it is silent.
                    alt={index === 0 ? messages.previewAlt : ""}
                    className="h-full w-full object-contain"
                    onError={() => {
                      // Swap the browser's broken-image glyph for the neutral placeholder.
                      setFailedSource(value);
                      setError(messages.renderError);
                    }}
                  />
                ) : (
                  <ImageIcon aria-hidden className={cn("size-6", surface.icon)} />
                )}
              </div>
            ))}
          </div>
          <div className="flex min-w-40 flex-1 flex-col gap-1">
            <p className="font-ui text-sm font-medium text-foreground">{messages.logoSet}</p>
            <p className="truncate text-caption text-muted-foreground" title={source}>
              {source}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  const input = inputRef.current;
                  if (!input) return;
                  input.value = "";
                  input.click();
                }}
              >
                <UploadIcon aria-hidden /> {messages.replace}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={clearLogo}
              >
                <TrashIcon aria-hidden /> {messages.remove}
              </Button>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            disabled={disabled}
            aria-label={messages.file}
            // The Replace button is the control; this input is how it reaches the dialog, so it
            // is neither a second tab stop nor a second accessible control.
            aria-hidden
            tabIndex={-1}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePicked(f);
            }}
          />
        </div>
      ) : (
        <Dropzone
          accept={accept}
          maxSize={maxBytes}
          multiple={false}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          hint={messages.formatHint(maxSizeMB)}
          messages={dropzoneMessages}
          onDrop={handleFiles}
        />
      )}

      {/* Always-visible URL fallback so existing hosted logos work without
          re-uploading. The two paths share the same value slot. */}
      <div className="flex items-center gap-2">
        <Input
          type="url"
          inputMode="url"
          placeholder={messages.urlPlaceholder}
          value={value && !isDataUrl ? value : ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const next = e.target.value;
            setError(next && !isPreviewableSource(next) ? messages.unusableSource : null);
            onChange(next);
          }}
          disabled={disabled}
          aria-invalid={Boolean(value) && !previewable}
          aria-describedby={error ? errorId : undefined}
          aria-label={messages.url}
        />
      </div>

      {hint && !error && (
        <p id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-caption text-destructive-text"
        >
          <CircleAlertIcon aria-hidden className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export type { LogoUploaderProps };
export { LogoUploader };
