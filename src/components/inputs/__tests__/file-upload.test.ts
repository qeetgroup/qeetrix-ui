import { describe, expect, it } from "vitest";

import { formatBytes, isFileAccepted } from "@/components/inputs/file-upload";

describe("formatBytes", () => {
  it("formats byte counts with sensible units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
  });
});

describe("isFileAccepted", () => {
  const file = (name: string, type: string) => new File(["x"], name, { type });

  it("matches wildcard, exact mime, and extension tokens", () => {
    expect(isFileAccepted(file("a.png", "image/png"), "image/*")).toBe(true);
    expect(isFileAccepted(file("a.png", "image/png"), "image/jpeg")).toBe(false);
    expect(isFileAccepted(file("doc.pdf", "application/pdf"), ".pdf")).toBe(true);
    expect(isFileAccepted(file("doc.pdf", "application/pdf"), "image/*,.pdf")).toBe(true);
  });

  it("accepts everything when no accept string is given", () => {
    expect(isFileAccepted(file("a.bin", "application/octet-stream"))).toBe(true);
  });
});
