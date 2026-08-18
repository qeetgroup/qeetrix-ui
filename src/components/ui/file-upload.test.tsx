import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Dropzone, FileList, FileUploadItem, formatBytes } from "@/components/ui/file-upload";
import { I18nProvider } from "@/i18n";

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

  it("localizes its prompt and validation messages", () => {
    const onDrop = vi.fn();
    render(
      <I18nProvider
        locale="es"
        messages={{
          fileUpload: {
            prompt: "Suelta archivos aquí o haz clic para buscar",
            typeRejected: "{name}: tipo de archivo no permitido.",
          },
        }}
      >
        <Dropzone onDrop={onDrop} accept="image/*" />
      </I18nProvider>,
    );

    expect(screen.getByText("Suelta archivos aquí o haz clic para buscar")).toBeInTheDocument();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    Object.defineProperty(input, "files", { value: { 0: file, length: 1, item: () => file } });
    fireEvent.change(input);

    expect(onDrop).toHaveBeenCalledWith(
      [],
      [expect.objectContaining({ message: "doc.pdf: tipo de archivo no permitido." })],
    );
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

  it("localizes the remove button label", () => {
    render(
      <I18nProvider locale="es" messages={{ fileUpload: { remove: "Quitar {name}" } }}>
        <ul>
          <FileUploadItem file={mockFile} onRemove={() => {}} />
        </ul>
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Quitar report.pdf" })).toBeInTheDocument();
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
