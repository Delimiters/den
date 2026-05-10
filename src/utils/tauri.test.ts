import { isTauri, openUrl } from "./tauri";

describe("isTauri", () => {
  it("returns false in a plain browser environment", () => {
    expect(isTauri()).toBe(false);
  });

  it("returns true when __TAURI_INTERNALS__ is present on window", () => {
    (window as any).__TAURI_INTERNALS__ = {};
    expect(isTauri()).toBe(true);
    delete (window as any).__TAURI_INTERNALS__;
  });
});

describe("openUrl", () => {
  let windowOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    windowOpen = vi.fn();
    vi.stubGlobal("open", windowOpen);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as any).__TAURI_INTERNALS__;
  });

  it("opens https URLs in a new tab in browser mode", async () => {
    await openUrl("https://example.com");
    expect(windowOpen).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
  });

  it("opens http URLs in a new tab in browser mode", async () => {
    await openUrl("http://example.com");
    expect(windowOpen).toHaveBeenCalledWith("http://example.com", "_blank", "noopener,noreferrer");
  });

  it("ignores non-http/https URLs", async () => {
    await openUrl("javascript:alert(1)");
    expect(windowOpen).not.toHaveBeenCalled();
  });

  it("ignores file:// URLs", async () => {
    await openUrl("file:///etc/passwd");
    expect(windowOpen).not.toHaveBeenCalled();
  });

  it("ignores empty string", async () => {
    await openUrl("");
    expect(windowOpen).not.toHaveBeenCalled();
  });
});
