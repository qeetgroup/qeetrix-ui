import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
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

describe("LogoUploader keyboard and screen-reader paths", () => {
  it("empties into a real, focusable drop target that names its instruction", () => {
    render(<LogoUploader value="" onChange={vi.fn()} />);
    const zone = screen.getByRole("button", { name: /Drop a logo here/ });
    expect(zone).toHaveAttribute("data-slot", "dropzone");
    expect(zone).toHaveAttribute("tabindex", "0");
    expect(zone).toHaveTextContent("PNG, JPG, SVG, or WEBP up to 2 MB");
  });

  it("adds no invisible tab stop for its file input", () => {
    const { container } = render(
      <LogoUploader value="https://example.com/logo.png" onChange={vi.fn()} />,
    );
    for (const input of container.querySelectorAll('input[type="file"]')) {
      expect(input).toHaveAttribute("tabindex", "-1");
    }
  });

  it("describes the drop target with the hint, and marks it invalid with the error", async () => {
    render(
      <LogoUploader value="" onChange={vi.fn()} accept=".png" hint="Shown on the sign-in page" />,
    );
    const zone = screen.getByRole("button");
    expect(zone).toHaveAccessibleDescription("Shown on the sign-in page");
    dropOnZone(fileOf("photo.jpg", "image/jpeg"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("button")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button")).toHaveAccessibleDescription(/file type isn't allowed/i);
  });

  it("ties a URL error to the URL field", () => {
    render(<LogoUploader value="" onChange={vi.fn()} />);
    const url = screen.getByRole("textbox", { name: "Logo URL" });
    fireEvent.change(url, { target: { value: "javascript:alert(1)" } });
    expect(url).toHaveAccessibleDescription(/can't be used as an image/i);
  });
});

describe("LogoUploader preview", () => {
  it("previews the logo on this theme's surface and the inverse one, naming it once", () => {
    const { container } = render(
      <LogoUploader value="https://example.com/logo.png" onChange={vi.fn()} />,
    );
    const tiles = container.querySelectorAll("[data-slot=logo-uploader-tile]");
    expect(tiles).toHaveLength(2);
    expect(tiles[1]).toHaveAttribute("data-surface", "inverse");
    expect(tiles[1].className).toContain("--qx-color-surface-inverse");
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("shows the picked file's name and size instead of a generic label", async () => {
    function Harness() {
      const [value, setValue] = React.useState("");
      return <LogoUploader value={value} onChange={setValue} />;
    }
    render(<Harness />);
    dropOnZone(fileOf("acme-wordmark.png", "image/png", 2048));
    await waitFor(() => expect(screen.getByText("acme-wordmark.png · 2 KB")).toBeInTheDocument());
  });

  it("replaces a preview that fails to load with a placeholder and an error", () => {
    const { container } = render(
      <LogoUploader value="https://example.com/missing.png" onChange={vi.fn()} />,
    );
    for (const img of container.querySelectorAll("img")) fireEvent.error(img);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent(/Couldn't render that source/);
  });

  it("falls back to the generic label for a data URL it did not read itself", () => {
    render(<LogoUploader value="data:image/png;base64,AAAA" onChange={vi.fn()} />);
    expect(screen.getByText("Uploaded file (preview)")).toBeInTheDocument();
  });

  it("replaces the logo when a file is dropped on the preview", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <LogoUploader value="https://example.com/logo.png" onChange={onChange} />,
    );
    const preview = container.querySelector("[data-slot=logo-uploader-preview]") as Element;
    fireEvent.dragOver(preview);
    expect(preview).toHaveAttribute("data-drag-over");
    const file = fileOf("new.png", "image/png");
    fireEvent.drop(preview, { dataTransfer: { files: { 0: file, length: 1, item: () => file } } });
    expect(preview).not.toHaveAttribute("data-drag-over");
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls[0][0]).toMatch(/^data:/);
  });

  it("applies the accept policy to a dropped replacement too", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <LogoUploader value="https://example.com/logo.png" onChange={onChange} accept=".png" />,
    );
    const preview = container.querySelector("[data-slot=logo-uploader-preview]") as Element;
    const file = fileOf("photo.jpg", "image/jpeg");
    fireEvent.drop(preview, { dataTransfer: { files: { 0: file, length: 1, item: () => file } } });
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores drops on the preview while disabled", () => {
    const onChange = vi.fn();
    const { container } = render(
      <LogoUploader value="https://example.com/logo.png" onChange={onChange} disabled />,
    );
    const preview = container.querySelector("[data-slot=logo-uploader-preview]") as Element;
    fireEvent.dragOver(preview);
    expect(preview).not.toHaveAttribute("data-drag-over");
    const file = fileOf("new.png", "image/png");
    fireEvent.drop(preview, { dataTransfer: { files: { 0: file, length: 1, item: () => file } } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
