import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import {
  Dropzone,
  FileList,
  FileUploadItem,
  formatBytes,
} from "@/components/FileUpload/file-upload";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/Input/field";
import type { MessageCatalogue } from "@/lib/messages";
import { MessagesProvider } from "@/providers/messages-provider";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Dropzone", () => {
  it("renders with button role and is focusable", () => {
    render(<Dropzone />);
    const zone = screen.getByRole("button");
    expect(zone).toBeInTheDocument();
    expect(zone).toHaveAttribute("tabindex", "0");
  });

  it("is aria-disabled when disabled prop is set", () => {
    render(<Dropzone disabled />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "true");
  });

  it("calls onDrop with accepted files on change", () => {
    const onDrop = vi.fn();
    render(<Dropzone onDrop={onDrop} accept="image/*" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "photo.png", { type: "image/png" });
    Object.defineProperty(input, "files", { value: { 0: file, length: 1, item: () => file } });
    fireEvent.change(input);
    expect(onDrop).toHaveBeenCalledWith([file], []);
  });

  it("calls onDrop with rejected files when type is wrong", () => {
    const onDrop = vi.fn();
    render(<Dropzone onDrop={onDrop} accept="image/*" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    Object.defineProperty(input, "files", { value: { 0: file, length: 1, item: () => file } });
    fireEvent.change(input);
    expect(onDrop).toHaveBeenCalledWith([], [expect.objectContaining({ reason: "type" })]);
  });

  it("formats byte values with the requested locale", () => {
    expect(formatBytes(1536, "de-DE")).toBe("1,5 KB");
  });

  it("activates on Enter and Space (native button keyboard activation)", async () => {
    const user = userEvent.setup();
    render(<Dropzone />);
    const zone = screen.getByRole("button");
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});

    zone.focus();
    await user.keyboard("{Enter}");
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockClear();
    await user.keyboard(" ");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Dropzone />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations when disabled", async () => {
    const { container } = render(<Dropzone disabled />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("FileUploadItem", () => {
  const mockFile = { name: "report.pdf", size: 2 * 1024 * 1024, type: "application/pdf" };

  it("renders filename and formatted size", () => {
    render(
      <ul>
        <FileUploadItem file={mockFile} />
      </ul>,
    );
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("2 MB")).toBeInTheDocument();
  });

  it("renders remove button with accessible label", () => {
    const onRemove = vi.fn();
    render(
      <ul>
        <FileUploadItem file={mockFile} onRemove={onRemove} />
      </ul>,
    );
    const btn = screen.getByRole("button", { name: "Remove report.pdf" });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows error text with alert role on error status", () => {
    render(
      <ul>
        <FileUploadItem file={mockFile} status="error" error="Upload failed" />
      </ul>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Upload failed");
  });

  it("has no axe violations (pending state)", async () => {
    const { container } = render(
      <ul>
        <FileUploadItem file={mockFile} />
      </ul>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations (error state)", async () => {
    const { container } = render(
      <ul>
        <FileUploadItem file={mockFile} status="error" error="Too large" onRemove={() => {}} />
      </ul>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("FileList", () => {
  it("renders as a <ul>", () => {
    render(<FileList aria-label="Uploaded files" />);
    expect(screen.getByRole("list", { name: "Uploaded files" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const file = { name: "a.txt", size: 100, type: "text/plain" };
    const { container } = render(
      <FileList aria-label="Files">
        <FileUploadItem file={file} onRemove={() => {}} />
      </FileList>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/** Build a FileList-alike for the hidden <input> or a drop event. */
function fileListOf(files: File[]) {
  return {
    ...files,
    length: files.length,
    item: (i: number) => files[i] ?? null,
  } as unknown as FileList;
}

function dropFiles(zone: Element, files: File[]) {
  fireEvent.drop(zone, { dataTransfer: { files: fileListOf(files) } });
}

const png = (name: string, size = 10) => {
  const file = new File(["x"], name, { type: "image/png" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("Dropzone count validation", () => {
  it("accepts only one file on drop when multiple={false}", () => {
    const onDrop = vi.fn();
    render(<Dropzone multiple={false} onDrop={onDrop} />);
    const files = [png("a.png"), png("b.png"), png("c.png")];
    dropFiles(screen.getByRole("button"), files);

    // The native dialog honours `multiple`, but a drop hands over everything.
    const [accepted, rejected] = onDrop.mock.calls[0];
    expect(accepted).toEqual([files[0]]);
    expect(rejected).toHaveLength(2);
    expect(rejected.every((r: { reason: string }) => r.reason === "count")).toBe(true);
    expect(rejected[0].message).toContain("only one file");
  });

  it("accepts only one file from the file dialog when multiple={false}", () => {
    const onDrop = vi.fn();
    render(<Dropzone multiple={false} onDrop={onDrop} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [png("a.png"), png("b.png")];
    Object.defineProperty(input, "files", { value: fileListOf(files) });
    fireEvent.change(input);
    expect(onDrop.mock.calls[0][0]).toEqual([files[0]]);
    expect(onDrop.mock.calls[0][1]).toHaveLength(1);
  });

  it("still honours a lower maxFiles when multiple is true", () => {
    const onDrop = vi.fn();
    render(<Dropzone maxFiles={2} onDrop={onDrop} />);
    dropFiles(screen.getByRole("button"), [png("a.png"), png("b.png"), png("c.png")]);
    expect(onDrop.mock.calls[0][0]).toHaveLength(2);
    expect(onDrop.mock.calls[0][1]).toHaveLength(1);
  });

  it("takes the stricter of multiple={false} and maxFiles", () => {
    const onDrop = vi.fn();
    render(<Dropzone multiple={false} maxFiles={5} onDrop={onDrop} />);
    dropFiles(screen.getByRole("button"), [png("a.png"), png("b.png")]);
    expect(onDrop.mock.calls[0][0]).toHaveLength(1);
  });

  it("applies the accept and size policies to drops too", () => {
    const onDrop = vi.fn();
    render(<Dropzone accept="image/*" maxSize={100} onDrop={onDrop} />);
    const big = png("huge.png", 500);
    const wrong = new File(["x"], "doc.pdf", { type: "application/pdf" });
    dropFiles(screen.getByRole("button"), [big, wrong, png("ok.png")]);

    const [accepted, rejected] = onDrop.mock.calls[0];
    expect(accepted.map((f: File) => f.name)).toEqual(["ok.png"]);
    expect(rejected.map((r: { reason: string }) => r.reason).sort()).toEqual(["size", "type"]);
  });

  it("ignores drops while disabled", () => {
    const onDrop = vi.fn();
    render(<Dropzone disabled onDrop={onDrop} />);
    dropFiles(screen.getByRole("button"), [png("a.png")]);
    expect(onDrop).not.toHaveBeenCalled();
  });
});

describe("FileUploadItem status announcements", () => {
  const file = { name: "report.pdf", size: 2048, type: "application/pdf" };
  const status = () => document.querySelector("[data-slot='file-upload-item-status']");

  it("announces progress politely, named after the file", () => {
    render(
      <FileList>
        <FileUploadItem file={file} status="uploading" progress={40} />
      </FileList>,
    );
    expect(status()).toHaveAttribute("aria-live", "polite");
    expect(status()).toHaveTextContent("report.pdf: uploading, 40%");
  });

  it("names the progress bar after the file", () => {
    render(
      <FileList>
        <FileUploadItem file={file} status="uploading" progress={40} />
      </FileList>,
    );
    // Several concurrent uploads otherwise expose a stack of anonymous bars.
    expect(screen.getByRole("progressbar", { name: "Uploading report.pdf" })).toBeInTheDocument();
  });

  it("announces completion", () => {
    render(
      <FileList>
        <FileUploadItem file={file} status="success" />
      </FileList>,
    );
    expect(status()).toHaveTextContent("report.pdf: upload complete");
  });

  it("says nothing politely while pending", () => {
    render(
      <FileList>
        <FileUploadItem file={file} status="pending" />
      </FileList>,
    );
    expect(status()).toHaveTextContent("");
  });

  it("leaves failures to the visible alert so they are announced once", () => {
    render(
      <FileList>
        <FileUploadItem file={file} status="error" error="Server rejected the file" />
      </FileList>,
    );
    expect(status()).toHaveTextContent("");
    expect(screen.getByRole("alert")).toHaveTextContent("Server rejected the file");
  });

  it("accepts a translated status label", () => {
    render(
      <FileList>
        <FileUploadItem
          file={file}
          status="success"
          statusLabel={({ name }) => `${name} : envoi terminé`}
        />
      </FileList>,
    );
    expect(status()).toHaveTextContent("report.pdf : envoi terminé");
  });

  it("has no axe violations while uploading", async () => {
    const { container } = render(
      <FileList>
        <FileUploadItem file={file} status="uploading" progress={70} onRemove={() => {}} />
      </FileList>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Dropzone form participation", () => {
  it("names its file input, which is what makes the dialog path submit", () => {
    const { container } = render(<Dropzone name="cv" />);
    expect(container.querySelector('input[type="file"]')).toHaveAttribute("name", "cv");
  });

  it("clears the input on open, and leaves the chosen file in place after the change", () => {
    render(<Dropzone name="cv" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // jsdom will not hold a non-empty file-input value, so the *writes* are what is observable.
    const writes: string[] = [];
    Object.defineProperty(input, "value", {
      get: () => "",
      set: (next: string) => writes.push(next),
      configurable: true,
    });
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});

    fireEvent.click(screen.getByRole("button"));
    expect(writes).toEqual([""]);

    writes.length = 0;
    Object.defineProperty(input, "files", {
      value: fileListOf([png("cv.png")]),
      configurable: true,
    });
    fireEvent.change(input);
    // The old handler cleared the value here, which also cleared the file out of the FormData —
    // the reason `name` could not be implemented at all. Clearing moved to open() instead.
    expect(writes).toEqual([]);
  });

  it("takes its accessible name from a Field label, replacing its own instruction", () => {
    render(
      <Field>
        <FieldLabel>Curriculum vitae</FieldLabel>
        <Dropzone name="cv" />
        <FieldDescription>PDF only.</FieldDescription>
      </Field>,
    );
    const zone = screen.getByRole("button", { name: "Curriculum vitae" });
    expect(zone).toHaveAttribute("aria-describedby", screen.getByText("PDF only.").id);
    // The instruction stays on screen even though it is no longer the name.
    expect(zone).toHaveTextContent(/Drop files here/);
  });

  it("reports a Field error as invalid", () => {
    render(
      <Field>
        <FieldLabel>Curriculum vitae</FieldLabel>
        <Dropzone name="cv" />
        <FieldError>A CV is required.</FieldError>
      </Field>,
    );
    const zone = screen.getByRole("button", { name: "Curriculum vitae" });
    expect(zone).toHaveAttribute("aria-invalid", "true");
    expect(zone).toHaveAttribute("aria-errormessage", screen.getByRole("alert").id);
  });

  it("serialises nothing without a name", () => {
    const { container } = render(<Dropzone />);
    expect(container.querySelector('input[type="file"]')).not.toHaveAttribute("name");
  });
});

describe("Dropzone drag state", () => {
  const zone = () => screen.getByRole("button");

  it("marks itself while files are over it, and clears on leave and on drop", () => {
    render(<Dropzone />);
    fireEvent.dragEnter(zone());
    expect(zone()).toHaveAttribute("data-drag-over");
    fireEvent.dragLeave(zone());
    expect(zone()).not.toHaveAttribute("data-drag-over");

    fireEvent.dragEnter(zone());
    fireEvent.dragOver(zone());
    expect(zone()).toHaveAttribute("data-drag-over");
    dropFiles(zone(), [png("a.png")]);
    expect(zone()).not.toHaveAttribute("data-drag-over");
  });

  it("does not flicker off while the pointer crosses its own children", () => {
    render(<Dropzone />);
    const child = zone().querySelector("[data-slot=dropzone-icon]") as Element;
    // Pointer enters the zone, then its icon: enter fires on the child (and bubbles) before the
    // zone's own leave.
    fireEvent.dragEnter(zone());
    fireEvent.dragEnter(child);
    fireEvent.dragLeave(zone());
    expect(zone()).toHaveAttribute("data-drag-over");
    fireEvent.dragLeave(child);
    expect(zone()).not.toHaveAttribute("data-drag-over");
  });

  it("never shows the active state while disabled", () => {
    render(<Dropzone disabled />);
    fireEvent.dragEnter(zone());
    fireEvent.dragOver(zone());
    expect(zone()).not.toHaveAttribute("data-drag-over");
  });

  it("passes the live drag state to a render-function child", () => {
    render(<Dropzone>{({ dragOver }) => (dragOver ? "Release to upload" : "Drop here")}</Dropzone>);
    expect(zone()).toHaveTextContent("Drop here");
    fireEvent.dragEnter(zone());
    expect(zone()).toHaveTextContent("Release to upload");
  });

  it("still runs a consumer's drag and click handlers", () => {
    const onDragEnter = vi.fn();
    const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault());
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    clickSpy.mockClear();
    render(<Dropzone onDragEnter={onDragEnter} onClick={onClick} />);
    fireEvent.dragEnter(zone());
    expect(onDragEnter).toHaveBeenCalledTimes(1);
    expect(zone()).toHaveAttribute("data-drag-over");
    // A prevented click is the consumer's way to keep the dialog closed.
    fireEvent.click(zone());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(clickSpy).not.toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});

describe("Dropzone copy", () => {
  it("states the accept policy and the size limit in reader terms", () => {
    render(<Dropzone accept=".pdf,.png,image/*" maxSize={10 * 1024 * 1024} />);
    expect(screen.getByRole("button")).toHaveTextContent("PDF, PNG, image/* · up to 10 MB");
  });

  it("reads exact MIME types by their subtype", () => {
    render(<Dropzone accept="application/pdf" />);
    expect(screen.getByRole("button")).toHaveTextContent("PDF");
  });

  it("lets the consumer replace the constraint line", () => {
    render(<Dropzone accept=".pdf" hint="Signed PDF, one per employee" />);
    expect(screen.getByRole("button")).toHaveTextContent("Signed PDF, one per employee");
    expect(screen.getByRole("button")).not.toHaveTextContent("PDF ·");
  });

  it("says the single-file instruction when multiple is off", () => {
    render(<Dropzone multiple={false} />);
    expect(screen.getByRole("button")).toHaveTextContent("Drop a file here, or click to browse");
  });

  it("keeps the file input out of the tab order and the accessibility tree", () => {
    const { container } = render(<Dropzone />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toHaveAttribute("tabindex", "-1");
    expect(input).toHaveAttribute("aria-hidden", "true");
  });

  it("removes itself from the tab order when disabled", () => {
    render(<Dropzone disabled />);
    expect(screen.getByRole("button")).toHaveAttribute("tabindex", "-1");
  });
});

describe("FileUploadItem actions and states", () => {
  const file = { name: "report.pdf", size: 2048, type: "application/pdf" };

  it("offers a named retry on a failed row", () => {
    const onRetry = vi.fn();
    render(
      <FileList>
        <FileUploadItem file={file} status="error" error="Network lost" onRetry={onRetry} />
      </FileList>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry report.pdf" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not offer retry on a row that has not failed", () => {
    render(
      <FileList>
        <FileUploadItem file={file} status="success" onRetry={() => {}} />
      </FileList>,
    );
    expect(screen.queryByRole("button", { name: /Retry/ })).toBeNull();
  });

  it("offers cancel instead of remove while an upload is in flight", () => {
    const onCancel = vi.fn();
    const onRemove = vi.fn();
    const { rerender } = render(
      <FileList>
        <FileUploadItem
          file={file}
          status="uploading"
          progress={30}
          onCancel={onCancel}
          onRemove={onRemove}
        />
      </FileList>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel upload of report.pdf" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Remove report.pdf" })).toBeNull();

    rerender(
      <FileList>
        <FileUploadItem file={file} status="success" onCancel={onCancel} onRemove={onRemove} />
      </FileList>,
    );
    expect(screen.queryByRole("button", { name: /Cancel/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove report.pdf" })).toBeInTheDocument();
  });

  it("keeps remove available while uploading when there is no cancel", () => {
    render(
      <FileList>
        <FileUploadItem file={file} status="uploading" progress={30} onRemove={() => {}} />
      </FileList>,
    );
    expect(screen.getByRole("button", { name: "Remove report.pdf" })).toBeInTheDocument();
  });

  it("shows the percentage while uploading and an indeterminate bar without progress", () => {
    const { rerender } = render(
      <FileList>
        <FileUploadItem file={file} status="uploading" progress={42.4} />
      </FileList>,
    );
    expect(screen.getByText("42%")).toBeInTheDocument();
    rerender(
      <FileList>
        <FileUploadItem file={file} status="uploading" />
      </FileList>,
    );
    const bar = screen.getByRole("progressbar", { name: "Uploading report.pdf" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
  });

  it("says a finished row is uploaded, in text as well as with the icon", () => {
    render(
      <FileList>
        <FileUploadItem file={file} status="success" />
      </FileList>,
    );
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    expect(document.querySelector("[data-slot=file-upload-item]")).toHaveAttribute(
      "data-status",
      "success",
    );
  });

  it("announces a generic failure when no error text is given", () => {
    render(
      <FileList>
        <FileUploadItem file={file} status="error" />
      </FileList>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Upload failed.");
  });

  it("translates the new action names through the messages prop", () => {
    render(
      <FileList>
        <FileUploadItem
          file={file}
          status="error"
          onRetry={() => {}}
          messages={{ retry: (name) => `Réessayer ${name}`, failed: "Échec de l’envoi." }}
        />
      </FileList>,
    );
    expect(screen.getByRole("button", { name: "Réessayer report.pdf" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Échec de l’envoi.");
  });

  it("shows the file-type icon for the MIME type", () => {
    render(
      <FileList>
        <FileUploadItem file={{ name: "q3.xlsx", size: 10, type: "" }} />
      </FileList>,
    );
    expect(document.querySelector("[data-slot=file-type-icon]")).toHaveAttribute(
      "data-file-type",
      "spreadsheet",
    );
  });

  it("truncates a long name and keeps it whole in a tooltip", () => {
    const name = "Acme-India-Pvt-Ltd-GST-registration-certificate-REG-06.pdf";
    render(
      <FileList>
        <FileUploadItem file={{ name, size: 10 }} />
      </FileList>,
    );
    const nameNode = screen.getByText(name).closest("[title]");
    expect(nameNode).toHaveAttribute("title", name);
    expect(nameNode).toHaveClass("truncate");
  });

  it("has no axe violations with every action present", async () => {
    const { container } = render(
      <FileList aria-label="Attachments">
        <FileUploadItem file={file} status="uploading" progress={30} onCancel={() => {}} />
        <FileUploadItem
          file={{ ...file, name: "b.pdf" }}
          status="error"
          error="Too large"
          onRetry={() => {}}
          onRemove={() => {}}
        />
        <FileUploadItem file={{ ...file, name: "c.pdf" }} status="success" onRemove={() => {}} />
      </FileList>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("FileUploadItem translation through a provider", () => {
  it("resolves the row's new strings from a MessagesProvider at runtime", () => {
    // The keys are not in the catalogue's type yet (see the component), hence the cast.
    const catalogue = {
      fileUpload: { retry: (name: string) => `Erneut ${name}`, uploaded: "Hochgeladen" },
    } as unknown as MessageCatalogue;
    render(
      <MessagesProvider messages={catalogue}>
        <FileList>
          <FileUploadItem file={{ name: "a.pdf", size: 1 }} status="error" onRetry={() => {}} />
          <FileUploadItem file={{ name: "b.pdf", size: 1 }} status="success" />
        </FileList>
      </MessagesProvider>,
    );
    expect(screen.getByRole("button", { name: "Erneut a.pdf" })).toBeInTheDocument();
    expect(screen.getByText("Hochgeladen")).toBeInTheDocument();
  });
});
