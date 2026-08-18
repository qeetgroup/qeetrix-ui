import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** Resolve a filename, extension, or MIME type to a representative icon. */
function resolveIcon(type: string): LucideIcon {
  const t = type.toLowerCase().trim();
  const ext = (t.includes("/") ? t.split("/").pop() : t.split(".").pop()) ?? t;
  if (/^(png|jpe?g|gif|svg|webp|avif|bmp|ico|heic)$/.test(ext)) return ImageIcon;
  if (/^(mp4|mov|webm|mkv|avi|m4v)$/.test(ext)) return FileVideo;
  if (/^(mp3|wav|ogg|flac|aac|m4a)$/.test(ext)) return FileAudio;
  if (/^(zip|rar|7z|tar|gz|bz2)$/.test(ext)) return FileArchive;
  if (/^(csv|xlsx?|ods|tsv)$/.test(ext)) return FileSpreadsheet;
  if (/^(jsx?|tsx?|json|html?|css|scss|py|go|rs|java|rb|php|sh|ya?ml|xml|sql)$/.test(ext))
    return FileCode;
  if (/^(pdf|docx?|txt|md|rtf|odt)$/.test(ext)) return FileText;
  return File;
}

interface FileTypeIconProps extends React.ComponentProps<"svg"> {
  /** Filename, extension, or MIME type — e.g. "report.pdf", "png", "image/png". */
  type: string;
}

/** Monochrome file-type icon (Drive, Mail attachments, Tasks, Chat). */
function FileTypeIcon({ type, className, ...props }: FileTypeIconProps) {
  const Icon = resolveIcon(type);
  return (
    <Icon
      data-slot="file-type-icon"
      className={cn("size-5 shrink-0 text-muted-foreground", className)}
      aria-hidden
      {...props}
    />
  );
}

export type { FileTypeIconProps };
export { FileTypeIcon };
