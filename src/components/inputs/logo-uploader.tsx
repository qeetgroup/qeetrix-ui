"use client";

import { ImageIcon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/actions/button";
import { isFileAccepted } from "@/components/inputs/file-upload";
import { Input } from "@/components/inputs/input";
import type { MessagesFor } from "@/lib/messages";
import { logoUploaderMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
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
 * Both input paths run the same `accept` check (shared with `Dropzone` via
 * {@link isFileAccepted}), so a drop cannot bypass the policy the file dialog
 * enforces. That check reads the browser-reported name and MIME type only:
 * **the server must verify the real file signature, cap the size again, and
 * sanitise SVG before storing or serving it.** An SVG logo is a script-carrying
 * document, not a picture.
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
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const readerRef = React.useRef<FileReader | null>(null);

  const maxBytes = maxSizeMB * 1024 * 1024;

  // A reader left running after unmount, or after the user picks a second file,
  // would resolve into a dead component or overwrite the newer choice.
  React.useEffect(
    () => () => {
      readerRef.current?.abort();
      readerRef.current = null;
    },
    [],
  );

  function handleFile(file: File) {
    setError(null);
    // The same check the file dialog applies, so a drop cannot bypass `accept`.
    if (!isFileAccepted(file, accept)) {
      setError(messages.rejectedType);
      return;
    }
    if (file.size > maxBytes) {
      setError(messages.rejectedSize(maxSizeMB));
      return;
    }
    readerRef.current?.abort();
    const reader = new FileReader();
    readerRef.current = reader;
    reader.onload = () => {
      if (readerRef.current !== reader) return;
      readerRef.current = null;
      const result = reader.result;
      if (typeof result === "string") onChange(result);
    };
    reader.onerror = () => {
      if (readerRef.current !== reader) return;
      readerRef.current = null;
      setError(messages.readError);
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    readerRef.current?.abort();
    readerRef.current = null;
    onChange("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const previewable = isPreviewableSource(value);

  return (
    <div data-slot="logo-uploader" className={cn("flex flex-col gap-2", className)}>
      {value ? (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background">
            {previewable ? (
              // Plain <img>: this is a framework-agnostic component (no next/image).
              <img
                src={value}
                alt={messages.previewAlt}
                className="h-full w-full object-contain"
                onError={() => setError(messages.renderError)}
              />
            ) : (
              <ImageIcon aria-hidden className="size-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-sm font-medium">{messages.logoSet}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {value.startsWith("data:") ? messages.uploadedFile : value}
            </p>
            <div className="mt-1 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
              >
                <UploadCloudIcon aria-hidden /> {messages.replace}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={clearLogo}
              >
                <Trash2Icon aria-hidden /> {messages.remove}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (!disabled) inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (disabled) return;
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30",
            disabled && "pointer-events-none opacity-disabled",
          )}
        >
          <ImageIcon aria-hidden className="size-6 text-muted-foreground" />
          <span className="block text-sm font-medium">{messages.dropZone}</span>
          <span className="block text-xs text-muted-foreground">
            {messages.formatHint(maxSizeMB)}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        aria-label={messages.file}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {/* Always-visible URL fallback so existing hosted logos work without
          re-uploading. The two paths share the same value slot. */}
      <div className="flex items-center gap-2">
        <Input
          type="url"
          inputMode="url"
          placeholder={messages.urlPlaceholder}
          value={value && !value.startsWith("data:") ? value : ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const next = e.target.value;
            setError(next && !isPreviewableSource(next) ? messages.unusableSource : null);
            onChange(next);
          }}
          disabled={disabled}
          aria-invalid={Boolean(value) && !previewable}
          aria-label={messages.url}
        />
      </div>

      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export type { LogoUploaderProps };
export { LogoUploader };
