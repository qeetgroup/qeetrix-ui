import {
  Dropzone,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  type FileRejection,
  FileUploadItem,
  FileList as FileUploadList,
  type FileUploadStatus,
  LogoUploader,
} from "@qeetrix/ui";
import { FileTextIcon } from "lucide-react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, text } from "../registry/types";

const MB = 1024 * 1024;

/** A tenant logo as an inline SVG data URL (brand colours are data). */
const acmeLogo = `data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#1d4ed8'/><path d='M18 46 32 16l14 30h-7l-7-16-7 16z' fill='#ffffff'/></svg>",
)}`;

interface QueueItem {
  id: string;
  file: File | { name: string; size: number; type?: string };
  status: FileUploadStatus;
  progress?: number;
  error?: string;
  previewUrl?: string;
  /** Ticks on the simulated connection; static sample rows don't until they're retried. */
  live?: boolean;
  /** A transfer failure (offers Retry), as opposed to a validation rejection (only Remove). */
  retryable?: boolean;
  attempts?: number;
}

const TIMEOUT = "Connection to ap-south-1 timed out. Retry to resume.";

/**
 * Nothing is uploaded: accepted files tick towards 100% on a timer, rejected ones become error
 * rows with the Dropzone's own message. Files over 5 MB "time out" at about half way on their
 * first attempt so Retry has something to do. Cancel drops the row. The timer only runs while
 * something is live and is cleared on unmount.
 */
function useSimulatedUploads(initial: QueueItem[] = []) {
  const [items, setItems] = useState(initial);
  const nextId = useRef(0);
  const ticking = items.some((item) => item.live && item.status === "uploading");

  useEffect(() => {
    if (!ticking) return;
    const timer = window.setInterval(() => {
      setItems((current) =>
        current.map((item): QueueItem => {
          if (!item.live || item.status !== "uploading") return item;
          const progress = Math.min(100, (item.progress ?? 0) + 14);
          if (item.file.size > 5 * MB && (item.attempts ?? 1) === 1 && progress >= 56) {
            return { ...item, status: "error", error: TIMEOUT, retryable: true, progress };
          }
          return progress === 100
            ? { ...item, status: "success", progress }
            : { ...item, progress };
        }),
      );
    }, 350);
    return () => window.clearInterval(timer);
  }, [ticking]);

  const add = (accepted: File[], rejected: FileRejection[]) => {
    const id = () => `upload-${nextId.current++}`;
    const next: QueueItem[] = [
      ...accepted.map((file) => ({
        id: id(),
        file,
        status: "uploading" as const,
        progress: 0,
        live: true,
        attempts: 1,
      })),
      ...rejected.map((rejection) => ({
        id: id(),
        file: rejection.file,
        status: "error" as const,
        error: rejection.message,
      })),
    ];
    setItems((current) => [...current, ...next]);
  };
  const remove = (id: string) => setItems((current) => current.filter((item) => item.id !== id));
  const retry = (id: string) =>
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "uploading",
              progress: 0,
              error: undefined,
              live: true,
              attempts: (item.attempts ?? 1) + 1,
            }
          : item,
      ),
    );
  return { items, add, remove, retry };
}

function Queue({
  items,
  onRemove,
  onRetry,
}: {
  items: QueueItem[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <FileUploadList>
      {items.map((item) => (
        <FileUploadItem
          key={item.id}
          file={item.file}
          status={item.status}
          progress={item.progress}
          error={item.error}
          previewUrl={item.previewUrl}
          onRemove={() => onRemove(item.id)}
          onCancel={() => onRemove(item.id)}
          onRetry={item.retryable ? () => onRetry(item.id) : undefined}
        />
      ))}
    </FileUploadList>
  );
}

function BankStatementDemo() {
  const uploads = useSimulatedUploads();
  return (
    <div className="flex w-96 max-w-full flex-col gap-3">
      <Field>
        <FieldLabel>Bank statements</FieldLabel>
        <Dropzone
          accept=".pdf,.csv"
          maxSize={10 * MB}
          maxFiles={5}
          hint="PDF statements or CSV exports · up to 10 MB each"
          onDrop={uploads.add}
        />
        <FieldDescription>
          HDFC, ICICI or SBI exports for September. Up to 5 files per batch.
        </FieldDescription>
      </Field>
      <Queue items={uploads.items} onRemove={uploads.remove} onRetry={uploads.retry} />
    </div>
  );
}

const sampleQueue: QueueItem[] = [
  {
    id: "payroll",
    file: {
      name: "payroll-october-2026.xlsx",
      size: 284_672,
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    status: "pending",
  },
  {
    id: "gstr2b",
    file: { name: "GSTR-2B_Sep-2026.json", size: 1_843_200, type: "application/json" },
    status: "uploading",
    progress: 64,
  },
  {
    id: "logo",
    file: { name: "acme-india-logo.svg", size: 6_144, type: "image/svg+xml" },
    status: "success",
    previewUrl: acmeLogo,
  },
  {
    id: "statement",
    file: { name: "hdfc-statement-sep-2026.pdf", size: 7_340_032, type: "application/pdf" },
    status: "error",
    error: TIMEOUT,
    retryable: true,
    attempts: 1,
  },
  {
    id: "certificate",
    file: { name: "gst-certificate.heic", size: 3_250_000, type: "image/heic" },
    status: "error",
    error: "HEIC isn't supported. Upload a PDF, PNG or JPG.",
  },
];

function UploadStatesDemo() {
  const uploads = useSimulatedUploads(sampleQueue);
  return (
    <div className="w-96 max-w-full">
      <Queue items={uploads.items} onRemove={uploads.remove} onRetry={uploads.retry} />
      {uploads.items.length === 0 && (
        <p className="text-sm text-muted-foreground">All files removed. Reload to reset.</p>
      )}
    </div>
  );
}

function GstCertificateDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <Field className="w-80">
      <FieldLabel>GST registration certificate</FieldLabel>
      <Dropzone
        multiple={false}
        accept=".pdf,image/png,image/jpeg"
        maxSize={5 * MB}
        onDrop={(accepted, rejected) => {
          setFile(accepted[0] ?? null);
          setError(rejected[0]?.message ?? null);
        }}
      >
        {({ dragOver }) => (
          <>
            <FileTextIcon aria-hidden className="size-6 text-muted-foreground" />
            <span className="text-sm font-medium">
              {dragOver ? "Drop to attach" : (file?.name ?? "Attach Form GST REG-06")}
            </span>
            <span className="text-caption text-muted-foreground">PDF, PNG or JPG · up to 5 MB</span>
          </>
        )}
      </Dropzone>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        <FieldDescription>Issued when your GSTIN was registered.</FieldDescription>
      )}
    </Field>
  );
}

function DropzonePlayground({
  accept,
  maxSizeMB,
  maxFiles,
  multiple,
  hint,
  disabled,
}: {
  accept: string;
  maxSizeMB: number;
  maxFiles: number;
  multiple: boolean;
  hint: string;
  disabled: boolean;
}) {
  const uploads = useSimulatedUploads();
  return (
    <div className="flex w-96 max-w-full flex-col gap-3">
      <Dropzone
        accept={accept || undefined}
        maxSize={maxSizeMB > 0 ? maxSizeMB * MB : undefined}
        maxFiles={maxFiles > 0 ? maxFiles : undefined}
        multiple={multiple}
        hint={hint || undefined}
        disabled={disabled}
        aria-label="Upload invoices"
        onDrop={uploads.add}
      />
      <Queue items={uploads.items} onRemove={uploads.remove} onRetry={uploads.retry} />
    </div>
  );
}

function LogoDemo({
  initial,
  ...props
}: { initial: string } & Omit<ComponentProps<typeof LogoUploader>, "value" | "onChange">) {
  const [logo, setLogo] = useState(initial);
  return (
    <div className="w-80">
      <LogoUploader value={logo} onChange={setLogo} {...props} />
    </div>
  );
}

const dropzoneControls = {
  accept: text(".pdf,.csv", "accept"),
  maxSizeMB: num(10, { min: 0, max: 100, label: "maxSize (MB, 0 = none)" }),
  maxFiles: num(5, { min: 0, max: 20, label: "maxFiles (0 = none)" }),
  multiple: bool(true),
  hint: text("", "hint (empty = from accept / maxSize)"),
  disabled: bool(false),
};

const logoControls = {
  withLogo: bool(false, "Logo set"),
  maxSizeMB: num(2, { min: 1, max: 10, label: "maxSizeMB" }),
  accept: text("image/*", "accept"),
  hint: text("Shown on the hosted sign-in page and on invoice PDFs.", "Hint"),
  disabled: bool(false),
};

export const examples: FamilyExamples = {
  "file-upload": {
    minHeight: 300,
    demos: [
      {
        name: "Dropzone with queue",
        description:
          "Drop or pick files: type, size and count are validated in the browser, then the upload is simulated (nothing leaves the page). Files over 5 MB time out once — use Retry.",
        render: () => <BankStatementDemo />,
      },
      {
        name: "Upload states",
        description:
          "FileUploadItem rows: pending and uploading (with Cancel), complete with a preview, a transfer failure with Retry, and a rejected file (Remove only).",
        render: () => <UploadStatesDemo />,
      },
      {
        name: "Single file, custom content",
        description: "`multiple={false}` holds one file; a rejection becomes the Field's error.",
        render: () => <GstCertificateDemo />,
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Cancelled cheque</FieldLabel>
            <Dropzone multiple={false} accept=".pdf,image/png,image/jpeg" maxSize={5 * MB} />
            <FieldError>Upload a cancelled cheque to verify the settlement account.</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Attendance import</FieldLabel>
            <Dropzone accept=".csv" disabled />
            <FieldDescription>Imports are paused while October payroll is locked.</FieldDescription>
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls: dropzoneControls,
      render: (v) => <DropzonePlayground {...v} />,
      code: (v) =>
        jsx("Dropzone", {
          accept: v.accept || undefined,
          maxSize: v.maxSizeMB > 0 ? expr(`${v.maxSizeMB} * 1024 * 1024`) : undefined,
          maxFiles: v.maxFiles > 0 ? v.maxFiles : undefined,
          multiple: v.multiple ? undefined : expr("false"),
          hint: v.hint || undefined,
          disabled: v.disabled,
          "aria-label": "Upload invoices",
          onDrop: expr("(accepted, rejected) => queueUploads(accepted, rejected)"),
        }),
    }),
  },

  "logo-uploader": {
    minHeight: 260,
    demos: [
      {
        name: "Empty",
        description: "Drop or pick a file (read locally as a data URL), or paste a hosted URL.",
        render: () => (
          <LogoDemo
            initial=""
            maxSizeMB={1}
            accept="image/png,image/svg+xml,image/webp"
            hint="Square, at least 256 × 256 px. Shown on sign-in and invoice PDFs."
            messages={{ formatHint: (mb) => `PNG, SVG or WEBP up to ${mb} MB` }}
          />
        ),
      },
      {
        name: "Logo set",
        render: () => <LogoDemo initial={acmeLogo} hint="Acme India · hosted sign-in page" />,
      },
      {
        name: "Invalid source",
        description:
          "Only https, relative and data:image sources are previewed; anything else is flagged.",
        render: () => <LogoDemo initial="ftp://assets.acme.in/brand/logo.png" />,
      },
      {
        name: "Disabled",
        render: () => <LogoDemo initial={acmeLogo} disabled hint="Saving branding…" />,
      },
    ],
    playground: definePlayground({
      controls: logoControls,
      render: (v) => (
        <LogoDemo
          key={String(v.withLogo)}
          initial={v.withLogo ? acmeLogo : ""}
          maxSizeMB={v.maxSizeMB}
          accept={v.accept}
          hint={v.hint || undefined}
          disabled={v.disabled}
        />
      ),
      code: (v) =>
        jsx("LogoUploader", {
          value: expr("logo"),
          onChange: expr("setLogo"),
          maxSizeMB: v.maxSizeMB === 2 ? undefined : v.maxSizeMB,
          accept: v.accept === "image/*" ? undefined : v.accept,
          hint: v.hint || undefined,
          disabled: v.disabled,
        }),
    }),
  },
};
