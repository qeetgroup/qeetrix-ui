import { DownloadIcon, RefreshCwIcon, XIcon } from "@qeetrix/icons";
import { FileCard, FileTypeIcon, IconButton, toast } from "@qeetrix/ui";
import { type MouseEvent, type ReactNode, useEffect, useState } from "react";
import { formatInr, invoices, invoiceTotals } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

const [invoice] = invoices;
const invoiceTotal = invoice ? formatInr(invoiceTotals(invoice).total) : "";

const documents = [
  {
    id: "doc_inv_412",
    name: "QP-INV-2026-00412.pdf",
    size: "184 KB",
    meta: "Acme India · 3 Oct",
  },
  {
    id: "doc_gst_cert",
    name: "GST-REG-06-Acme-India.pdf",
    size: "1.2 MB",
    meta: "Uploaded by Vikram Singh",
  },
  {
    id: "doc_settlements",
    name: "settlements-2026-09.csv",
    size: "642 KB",
    meta: "Export · 1 Oct",
  },
  {
    id: "doc_gstr1",
    name: "GSTR-1-sep-2026.json",
    size: "88 KB",
    meta: "Ready to file",
  },
  {
    id: "doc_pan",
    name: "pan-card-acme.png",
    size: "312 KB",
    meta: "KYC · verified",
  },
  {
    id: "doc_audit",
    name: "audit-log-2026-10.zip",
    size: "18 MB",
    meta: "48,211 events",
  },
] as const;

function DownloadAction({ name }: { name: string }) {
  return (
    <IconButton
      icon={DownloadIcon}
      size="icon-sm"
      variant="ghost"
      aria-label={`Download ${name}`}
      onClick={() => toast(`Downloading ${name}`)}
    />
  );
}

const attachments = [
  { id: "att_inv", name: "QP-INV-2026-00412.pdf", size: "184 KB", meta: "Tax invoice" },
  { id: "att_csv", name: "settlements-2026-09.csv", size: "642 KB", meta: "HDFC settlement file" },
  { id: "att_png", name: "pan-card-acme.png", size: "312 KB", meta: "KYC document" },
] as const;

/**
 * The router pattern FileCard documents for `href`: handle the open-link click on a parent. Here
 * it toasts instead of navigating, so the playground stays where it is.
 */
function RouterLinks({ children }: { children: ReactNode }) {
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[data-slot=file-card-open]")
        : null;
    if (!link) return;
    event.preventDefault();
    toast(`Opening ${link.textContent ?? "file"}`, {
      description: link.getAttribute("href") ?? "",
    });
  };
  return (
    <div className="contents" onClickCapture={onClickCapture}>
      {children}
    </div>
  );
}

/** A failed GST certificate upload: Retry restarts it and it runs to completion. */
function UploadRetryDemo() {
  const [progress, setProgress] = useState<number | null>(null);
  const uploading = progress !== null && progress < 100;
  useEffect(() => {
    if (!uploading) return;
    const id = setInterval(() => setProgress((p) => Math.min(100, (p ?? 0) + 12)), 300);
    return () => clearInterval(id);
  }, [uploading]);
  const done = progress === 100;
  return (
    <FileCard
      layout="row"
      name="GST-REG-06-Acme-India.pdf"
      size="1.2 MB"
      meta={done ? "Uploaded just now" : undefined}
      status={progress === null ? "error" : uploading ? "uploading" : undefined}
      progress={progress ?? undefined}
      error="Upload failed — the connection to ap-south-1 dropped."
      actions={
        progress === null ? (
          <IconButton
            icon={RefreshCwIcon}
            size="icon-sm"
            variant="ghost"
            aria-label="Retry uploading GST-REG-06-Acme-India.pdf"
            onClick={() => setProgress(0)}
          />
        ) : done ? (
          <IconButton
            icon={RefreshCwIcon}
            size="icon-sm"
            variant="ghost"
            aria-label="Reset the upload demo"
            onClick={() => setProgress(null)}
          />
        ) : undefined
      }
    />
  );
}

/** A miniature first page of the tax invoice, used as the card's preview. */
function InvoiceThumbnail() {
  return (
    <div className="flex h-full w-full flex-col gap-1 bg-card p-3 text-start">
      <div className="text-micro font-semibold tracking-wide text-muted-foreground uppercase">
        Tax invoice
      </div>
      <div className="text-caption font-medium">{invoice?.customer}</div>
      <div className="text-micro text-muted-foreground">GSTIN {invoice?.gstin}</div>
      <div className="mt-auto flex items-baseline justify-between">
        <span className="text-micro text-muted-foreground">Total incl. GST</span>
        <span className="text-caption font-semibold tabular-nums">{invoiceTotal}</span>
      </div>
    </div>
  );
}

/** One row per icon `FileTypeIcon` resolves, keyed by a representative file. */
const fileTypes = [
  { type: "QP-INV-2026-00412.pdf", label: "Document (pdf, docx, txt, md)" },
  { type: "settlements-2026-09.csv", label: "Spreadsheet (csv, xlsx, tsv)" },
  { type: "webhook-payload.json", label: "Code (json, yaml, sql, ts…)" },
  { type: "pan-card-acme.png", label: "Image (png, jpg, svg, webp)" },
  { type: "kyc-video-call.mp4", label: "Video (mp4, mov, webm)" },
  { type: "ivr-greeting.mp3", label: "Audio (mp3, wav, m4a)" },
  { type: "audit-log-2026-10.zip", label: "Archive (zip, tar, gz)" },
  { type: "signing-cert.p12", label: "Anything else" },
] as const;

const fileCardControls = {
  name: text("QP-INV-2026-00412.pdf", "File name"),
  size: text("184 KB", "Size"),
  meta: text("Acme India · 3 Oct", "Meta"),
  layout: select(["tile", "row"] as const, "tile"),
  status: select(["none", "uploading", "downloading", "error"] as const, "none", "Status"),
  progress: num(42, { min: 0, max: 100, label: "Progress (uploading/downloading)" }),
  opens: select(["none", "href", "onOpen"] as const, "none", "Opens via"),
  selected: bool(false, "Selected"),
  actions: bool(true, "Actions"),
  thumbnail: bool(false, "Custom thumbnail"),
};

const iconSizes = { sm: "size-4", md: undefined, lg: "size-8" } as const;

export const examples: FamilyExamples = {
  "file-card": {
    layout: "wide",
    minHeight: 1300,
    demos: [
      {
        name: "Grid",
        description: "Invoices, GST certificates and exports; the icon follows the extension.",
        render: () => (
          <div className="grid w-full max-w-4xl grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
            {documents.map((doc) => (
              <FileCard
                key={doc.id}
                name={doc.name}
                size={doc.size}
                meta={doc.meta}
                actions={<DownloadAction name={doc.name} />}
              />
            ))}
          </div>
        ),
      },
      {
        name: "Row layout",
        description:
          '`layout="row"` for attachment lists and narrow panels; the extension joins the meta line.',
        render: () => (
          <div className="flex w-full max-w-md flex-col gap-2">
            {attachments.map((file) => (
              <FileCard
                key={file.id}
                layout="row"
                name={file.name}
                size={file.size}
                meta={file.meta}
                actions={<DownloadAction name={file.name} />}
              />
            ))}
          </div>
        ),
      },
      {
        name: "Transfers",
        description:
          "`status` shows an upload or download with a named progress bar, or an announced failure.",
        render: () => (
          <div className="flex w-full max-w-md flex-col gap-2">
            <FileCard
              layout="row"
              name="GSTR-1-sep-2026.json"
              size="88 KB"
              status="uploading"
              progress={42}
              actions={
                <IconButton
                  icon={XIcon}
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Cancel uploading GSTR-1-sep-2026.json"
                  onClick={() => toast("Upload cancelled")}
                />
              }
            />
            <FileCard layout="row" name="audit-log-2026-10.zip" size="18 MB" status="downloading" />
            <UploadRetryDemo />
          </div>
        ),
      },
      {
        name: "Opens (href, onOpen)",
        description:
          "The name becomes the card’s one link or button and its hit area covers the card; actions stay separate.",
        render: () => (
          <RouterLinks>
            <div className="grid w-full max-w-lg grid-cols-2 gap-3">
              <FileCard
                name="QP-INV-2026-00411.pdf"
                size="176 KB"
                meta="Bharat FinServ"
                href="https://pay.qeet.in/invoices/QP-INV-2026-00411.pdf"
                actions={<DownloadAction name="QP-INV-2026-00411.pdf" />}
              />
              <FileCard
                name="settlements-2026-09.csv"
                size="642 KB"
                meta="Opens in preview"
                onOpen={() => toast("Previewing settlements-2026-09.csv")}
              />
            </div>
          </RouterLinks>
        ),
      },
      {
        name: "Selected",
        render: () => (
          <div className="grid w-full max-w-md grid-cols-2 gap-3">
            <FileCard name="QP-INV-2026-00411.pdf" size="176 KB" meta="Bharat FinServ" selected />
            <FileCard name="QP-INV-2026-00410.pdf" size="169 KB" meta="Zenvia Health" />
          </div>
        ),
      },
      {
        name: "Thumbnail",
        description: "Pass any node as `thumbnail` to replace the large file-type icon.",
        render: () => (
          <div className="w-64">
            <FileCard
              name="QP-INV-2026-00412.pdf"
              size="184 KB"
              meta="Sent · due 2 Nov"
              thumbnail={<InvoiceThumbnail />}
              actions={<DownloadAction name="QP-INV-2026-00412.pdf" />}
            />
          </div>
        ),
      },
      {
        name: "Long name",
        description: "Names truncate with the full name in a native tooltip.",
        render: () => (
          <div className="w-48">
            <FileCard
              name="Acme-India-Pvt-Ltd-GST-registration-certificate-REG-06.pdf"
              size="1.2 MB"
              meta="Uploaded by Vikram Singh"
            />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: fileCardControls,
      render: (v) => (
        <RouterLinks>
          <div className={v.layout === "row" ? "w-80" : "w-64"}>
            <FileCard
              name={v.name}
              size={v.size || undefined}
              meta={v.meta || undefined}
              layout={v.layout}
              status={v.status === "none" ? undefined : v.status}
              progress={v.progress}
              href={v.opens === "href" ? `https://pay.qeet.in/files/${v.name}` : undefined}
              onOpen={v.opens === "onOpen" ? () => toast(`Previewing ${v.name}`) : undefined}
              selected={v.selected}
              actions={v.actions ? <DownloadAction name={v.name} /> : undefined}
              thumbnail={v.thumbnail ? <InvoiceThumbnail /> : undefined}
            />
          </div>
        </RouterLinks>
      ),
      code: (v) =>
        jsx("FileCard", {
          name: v.name,
          size: v.size || undefined,
          meta: v.meta || undefined,
          layout: v.layout === "tile" ? undefined : v.layout,
          status: v.status === "none" ? undefined : v.status,
          progress: v.status === "uploading" || v.status === "downloading" ? v.progress : undefined,
          href: v.opens === "href" ? `https://pay.qeet.in/files/${v.name}` : undefined,
          onOpen: v.opens === "onOpen" ? expr("() => openPreview(file)") : undefined,
          selected: v.selected,
          actions: v.actions
            ? expr(
                `<IconButton icon={DownloadIcon} size="icon-sm" variant="ghost" aria-label="Download ${v.name}" />`,
              )
            : undefined,
          thumbnail: v.thumbnail ? expr("<InvoiceThumbnail invoice={invoice} />") : undefined,
        }),
    }),
  },

  "file-type-icon": {
    minHeight: 320,
    demos: [
      {
        name: "Every type",
        description: "Resolves a filename, extension or MIME type to one of eight icons.",
        render: () => (
          <ul className="flex flex-col gap-2 text-sm">
            {fileTypes.map((file) => (
              <li key={file.type} className="flex items-center gap-2">
                <FileTypeIcon type={file.type} />
                <span className="font-mono text-caption">{file.type}</span>
                <span className="text-caption text-muted-foreground">— {file.label}</span>
              </li>
            ))}
          </ul>
        ),
      },
      {
        name: "MIME types",
        render: () => (
          <ul className="flex flex-col gap-2 text-sm">
            {["application/pdf", "text/csv", "image/png", "application/zip"].map((mime) => (
              <li key={mime} className="flex items-center gap-2">
                <FileTypeIcon type={mime} />
                <span className="font-mono text-caption">{mime}</span>
              </li>
            ))}
          </ul>
        ),
      },
      {
        name: "Sizes and tone",
        render: () => (
          <div className="flex items-center gap-3">
            <FileTypeIcon type="invoice.pdf" className="size-4" />
            <FileTypeIcon type="invoice.pdf" />
            <FileTypeIcon type="invoice.pdf" className="size-8" />
            <FileTypeIcon type="invoice.pdf" className="size-8 text-foreground" />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: {
        type: text("settlements-2026-09.csv", "Filename, extension or MIME"),
        size: select(["sm", "md", "lg"] as const, "md", "Size"),
      },
      render: (v) => <FileTypeIcon type={v.type} className={iconSizes[v.size]} />,
      code: (v) => jsx("FileTypeIcon", { type: v.type, className: iconSizes[v.size] }),
    }),
  },
};
