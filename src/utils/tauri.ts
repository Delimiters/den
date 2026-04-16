/** Returns true when running inside the Tauri desktop app. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Open a URL safely:
 * - In Tauri: uses the system browser via the opener plugin
 * - In browser: opens a new tab with noopener/noreferrer
 * Only allows https:// and http:// URLs.
 */
export async function openUrl(url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) return;
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-opener");
    await open(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
