import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";

export type UpdateStatus = "idle" | "downloading" | "installing" | "restarting";

export interface UpdateState {
  status: UpdateStatus;
  progress: number; // 0–100
  version: string | null;
}

export function useAutoUpdate(): UpdateState {
  const [state, setState] = useState<UpdateState>({ status: "idle", progress: 0, version: null });

  useEffect(() => {
    if (!isTauri()) return;
    if (import.meta.env.DEV) return;

    async function checkForUpdate() {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const { relaunch } = await import("@tauri-apps/plugin-process");
        const update = await check();
        if (!update) return;

        const version = update.version ?? null;
        let downloaded = 0;
        let total = 0;

        await update.downloadAndInstall((event: any) => {
          switch (event.event) {
            case "Started":
              total = event.data.contentLength ?? 0;
              setState({ status: "downloading", progress: 0, version });
              break;
            case "Progress":
              downloaded += event.data.chunkLength ?? 0;
              setState({
                status: "downloading",
                progress: total > 0 ? Math.min(99, Math.round((downloaded / total) * 100)) : 0,
                version,
              });
              break;
            case "Finished":
              setState({ status: "installing", progress: 100, version });
              break;
          }
        });

        setState({ status: "restarting", progress: 100, version });
        await new Promise((r) => setTimeout(r, 1800));
        await relaunch();
      } catch {
        // Silent — update failure must never surface to the user
      }
    }

    checkForUpdate();
  }, []);

  return state;
}
