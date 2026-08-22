import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { LogoUploader } from "@/components/FileUpload/logo-uploader";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("LogoUploader", () => {
  it("renders the URL input field", () => {
    render(<LogoUploader value="" onChange={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: "Logo URL" })).toBeInTheDocument();
  });

  it("renders the image preview when a value is set", () => {
    render(<LogoUploader value="https://example.com/logo.png" onChange={vi.fn()} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders the hint when provided and value is empty", () => {
    render(<LogoUploader value="" onChange={vi.fn()} hint="PNG or SVG, max 2 MB" />);
    expect(screen.getByText("PNG or SVG, max 2 MB")).toBeInTheDocument();
  });

  it("renders a remove button when a logo is set", () => {
    render(<LogoUploader value="https://example.com/logo.png" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("disables the URL input when disabled=true", () => {
    render(<LogoUploader value="" onChange={vi.fn()} disabled />);
    expect(screen.getByRole("textbox", { name: "Logo URL" })).toBeDisabled();
  });

  it("has no axe violations with no logo", async () => {
    const { container } = render(<LogoUploader value="" onChange={vi.fn()} />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations with a logo set", async () => {
    const { container } = render(
      <LogoUploader value="https://example.com/logo.png" onChange={vi.fn()} />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

function fileOf(name: string, type: string, size = 10) {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function dropOnZone(file: File) {
  fireEvent.drop(screen.getByRole("button"), {
    dataTransfer: { files: { 0: file, length: 1, item: () => file } },
  });
}

describe("LogoUploader validation", () => {
  it("applies the accept policy on drop, not just in the file dialog", async () => {
    const onChange = vi.fn();
    render(<LogoUploader value="" onChange={onChange} accept=".png" />);
    // A JPEG passes the old `type.startsWith("image/")` check but not `accept=".png"`.
    dropOnZone(fileOf("photo.jpg", "image/jpeg"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/file type isn't allowed/i);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("accepts a file that matches the accept policy", async () => {
    const onChange = vi.fn();
    render(<LogoUploader value="" onChange={onChange} accept=".png" />);
    dropOnZone(fileOf("logo.png", "image/png"));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls[0][0]).toMatch(/^data:/);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("rejects an oversized file on drop", async () => {
    const onChange = vi.fn();
    render(<LogoUploader value="" onChange={onChange} maxSizeMB={1} />);
    dropOnZone(fileOf("big.png", "image/png", 5 * 1024 * 1024));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/larger than 1 MB/i));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies the same policy through the hidden file input", async () => {
    const onChange = vi.fn();
    render(<LogoUploader value="" onChange={onChange} accept="image/png" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileOf("script.svg", "image/svg+xml");
    Object.defineProperty(input, "files", { value: { 0: file, length: 1, item: () => file } });
    fireEvent.change(input);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("only commits the most recent file when two are picked in a row", async () => {
    const onChange = vi.fn();
    render(<LogoUploader value="" onChange={onChange} />);
    dropOnZone(fileOf("first.png", "image/png"));
    dropOnZone(fileOf("second.png", "image/png"));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    // The first reader is aborted, so it cannot land after the second.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not read a file after unmount", async () => {
    const onChange = vi.fn();
    const { unmount } = render(<LogoUploader value="" onChange={onChange} />);
    dropOnZone(fileOf("late.png", "image/png"));
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("LogoUploader preview sources", () => {
  it("previews http(s), relative and data:image sources", () => {
    for (const src of [
      "https://example.com/logo.png",
      "/assets/logo.svg",
      "data:image/png;base64,AAAA",
    ]) {
      const view = render(<LogoUploader value={src} onChange={vi.fn()} />);
      expect(screen.getByRole("img", { name: "Logo preview" })).toHaveAttribute("src", src);
      view.unmount();
    }
  });

  it("refuses to hand an unsupported scheme to the preview", () => {
    for (const src of ["javascript:alert(1)", "data:text/html,<script>x</script>", "vbscript:x"]) {
      const view = render(<LogoUploader value={src} onChange={vi.fn()} />);
      expect(screen.queryByRole("img")).toBeNull();
      expect(view.container.querySelector("img")).toBeNull();
      expect(screen.getByRole("textbox", { name: "Logo URL" })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      view.unmount();
    }
  });

  it("reports an unusable URL as the user types it", () => {
    const onChange = vi.fn();
    render(<LogoUploader value="" onChange={onChange} />);
    const url = screen.getByRole("textbox", { name: "Logo URL" });
    act(() => {
      fireEvent.change(url, { target: { value: "javascript:alert(1)" } });
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/can't be used as an image/i);
    // The caller still owns the value; only the preview is withheld.
    expect(onChange).toHaveBeenCalledWith("javascript:alert(1)");
  });

  it("clears the error when the URL becomes usable", () => {
    render(<LogoUploader value="" onChange={vi.fn()} />);
    const url = screen.getByRole("textbox", { name: "Logo URL" });
    fireEvent.change(url, { target: { value: "javascript:alert(1)" } });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.change(url, { target: { value: "https://example.com/a.png" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("has no axe violations with a refused source", async () => {
    const { container } = render(<LogoUploader value="javascript:alert(1)" onChange={vi.fn()} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
