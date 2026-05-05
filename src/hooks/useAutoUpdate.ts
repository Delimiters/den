import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";

export function useAutoUpdate() {
  useEffect(() => {
    // Only run in production Tauri builds
    if (!isTauri()) return;
    if (import.meta.env.DEV) return;

    async function checkForUpdate() {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const { relaunch } = await import("@tauri-apps/plugin-process");
        const update = await check();
        if (update) {
          await update.downloadAndInstall();
          await relaunch();
        }
      } catch {
        // Silently ignore — update failure should never break the app
      }
    }

    checkForUpdate();
  }, []);
}
