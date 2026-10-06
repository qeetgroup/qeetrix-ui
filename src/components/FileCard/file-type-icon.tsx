import {
  File,
  FileArchive,
  FileBraces,
  FileChartPie,
  FileCode,
  FileImage,
  FileKey,
  FileMusic,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideoCamera,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** The categories `FileTypeIcon` distinguishes, written to its `data-file-type`. */
type FileTypeCategory =
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "spreadsheet"
  | "presentation"
  | "data"
  | "code"
  | "document"
  | "certificate"
  | "font"
  | "file";

const ICONS: Record<FileTypeCategory, LucideIcon> = {
  image: FileImage,
  video: FileVideoCamera,
  audio: FileMusic,
  archive: FileArchive,
  spreadsheet: FileSpreadsheet,
  presentation: FileChartPie,
  data: FileBraces,
  code: FileCode,
  document: FileText,
  certificate: FileKey,
  font: FileType,
  file: File,
};

/** By extension. Order matters only where an extension could read two ways. */
const BY_EXTENSION: ReadonlyArray<[RegExp, FileTypeCategory]> = [
  [/^(png|jpe?g|gif|svg|webp|avif|bmp|ico|heic|heif|tiff?)$/, "image"],
  [/^(mp4|mov|webm|mkv|avi|m4v|mpe?g|3gp|ogv|wmv)$/, "video"],
  [/^(mp3|wav|ogg|oga|opus|flac|aac|m4a|aiff?|wma)$/, "audio"],
  [/^(zip|rar|7z|tar|gz|tgz|bz2|xz|zst|iso)$/, "archive"],
  [/^(csv|tsv|xlsx?|xlsm|ods|numbers)$/, "spreadsheet"],
  [/^(pptx?|odp|key)$/, "presentation"],
  [/^(json|ya?ml|xml|toml|ndjson|jsonl|parquet|avro)$/, "data"],
  [
    /^(jsx?|tsx?|mjs|cjs|html?|css|scss|less|py|go|rs|java|kt|swift|rb|php|cs|c|cc|cpp|h|hpp|sh|bash|zsh|ps1|sql|vue|svelte|ini|env)$/,
    "code",
  ],
  [/^(pdf|docx?|odt|rtf|txt|md|mdx|pages|log)$/, "document"],
  [/^(pem|crt|cer|der|p12|pfx|p7b|jks|keystore|pub|asc|gpg)$/, "certificate"],
  [/^(ttf|otf|woff2?|eot)$/, "font"],
];

/**
 * MIME subtypes that do not spell an extension — mostly the Office and OpenDocument families,
 * whose subtypes ("vnd.openxmlformats-officedocument.spreadsheetml.sheet") a suffix match
 * would miss entirely.
 */
const BY_MIME_KEYWORD: ReadonlyArray<[RegExp, FileTypeCategory]> = [
  [/spreadsheet|excel|csv/, "spreadsheet"],
  [/presentation|powerpoint/, "presentation"],
  [/wordprocessing|msword|opendocument\.text|pdf|rtf/, "document"],
  [/zip|compressed|x-tar|gzip|x-7z|x-rar|x-bzip/, "archive"],
  [/json|xml|yaml/, "data"],
  [/javascript|typescript|x-sh|x-python|sql/, "code"],
  [/x-pem|x-x509|pkcs|pkix/, "certificate"],
  [/^font\/|font-/, "font"],
];

/** The category of a filename, extension or MIME type. */
function fileTypeCategory(type: string): FileTypeCategory {
  const t = type.toLowerCase().trim();
  const byExtension = (ext: string) => BY_EXTENSION.find(([pattern]) => pattern.test(ext))?.[1];

  if (t.includes("/")) {
    const [top = "", sub = ""] = t.split("/");
    if (top === "image" || top === "video" || top === "audio" || top === "font") return top;
    const byKeyword = BY_MIME_KEYWORD.find(([pattern]) => pattern.test(t))?.[1];
    // "text/html" → code, "application/pdf" → document: a subtype that spells an extension.
    return byKeyword ?? byExtension(sub) ?? (top === "text" ? "document" : "file");
  }

  return byExtension(t.split(".").pop() ?? t) ?? "file";
}

interface FileTypeIconProps extends React.ComponentProps<"svg"> {
  /** Filename, extension, or MIME type — e.g. "report.pdf", "png", "image/png". */
  type: string;
}

/**
 * Monochrome file-type icon (Drive, Mail attachments, Tasks, Chat).
 *
 * One silhouette — a page — for every type, so a mixed list reads as one family and the glyph
 * inside carries the difference. Deliberately not colour-coded: in a graphite interface a red
 * PDF and a green spreadsheet are the loudest things on screen, and colour is not what tells
 * them apart for everyone anyway. The resolved category is on `data-file-type` for a consumer
 * that wants to style one.
 *
 * Decorative by default (`aria-hidden`) — the file name beside it is the accessible text.
 */
function FileTypeIcon({ type, className, ...props }: FileTypeIconProps) {
  const category = fileTypeCategory(type);
  const Icon = ICONS[category];
  return (
    <Icon
      data-slot="file-type-icon"
      data-file-type={category}
      className={cn("size-5 shrink-0 text-muted-foreground", className)}
      aria-hidden
      {...props}
    />
  );
}

export type { FileTypeCategory, FileTypeIconProps };
export { FileTypeIcon };
