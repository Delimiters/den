import { isImage, isVideo, formatFileSize } from "./upload";

describe("isImage", () => {
  it("returns true for image/jpeg", () => expect(isImage("image/jpeg")).toBe(true));
  it("returns true for image/png", () => expect(isImage("image/png")).toBe(true));
  it("returns true for image/gif", () => expect(isImage("image/gif")).toBe(true));
  it("returns true for image/webp", () => expect(isImage("image/webp")).toBe(true));
  it("returns false for video/mp4", () => expect(isImage("video/mp4")).toBe(false));
  it("returns false for application/pdf", () => expect(isImage("application/pdf")).toBe(false));
  it("returns false for empty string", () => expect(isImage("")).toBe(false));
});

describe("isVideo", () => {
  it("returns true for video/mp4", () => expect(isVideo("video/mp4")).toBe(true));
  it("returns true for video/webm", () => expect(isVideo("video/webm")).toBe(true));
  it("returns false for image/gif", () => expect(isVideo("image/gif")).toBe(false));
  it("returns false for application/octet-stream", () => expect(isVideo("application/octet-stream")).toBe(false));
});

describe("formatFileSize", () => {
  it("formats bytes under 1KB", () => expect(formatFileSize(512)).toBe("512 B"));
  it("formats exactly 1024 bytes as KB", () => expect(formatFileSize(1024)).toBe("1.0 KB"));
  it("formats KB range", () => expect(formatFileSize(2048)).toBe("2.0 KB"));
  it("formats exactly 1MB", () => expect(formatFileSize(1024 * 1024)).toBe("1.0 MB"));
  it("formats MB range", () => expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB"));
  it("formats 0 bytes", () => expect(formatFileSize(0)).toBe("0 B"));
});
