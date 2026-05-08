import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type Phase = "checking" | "downloading" | "installing" | "launching";

export function Splashscreen() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      try {
        if (!import.meta.env.DEV) {
          const { check } = await import("@tauri-apps/plugin-updater");
          const { relaunch } = await import("@tauri-apps/plugin-process");
          const update = await check();

          if (update) {
            setVersion(update.version ?? null);
            let downloaded = 0;
            let total = 0;

            await update.downloadAndInstall((event: any) => {
              if (event.event === "Started") {
                total = event.data.contentLength ?? 0;
                setPhase("downloading");
              } else if (event.event === "Progress") {
                downloaded += event.data.chunkLength ?? 0;
                setProgress(total > 0 ? Math.min(99, Math.round((downloaded / total) * 100)) : 0);
              } else if (event.event === "Finished") {
                setPhase("installing");
                setProgress(100);
              }
            });

            setPhase("launching");
            await new Promise((r) => setTimeout(r, 600));
            await relaunch();
            return;
          }
        }
      } catch {
        // No update available or network error — proceed to launch
      }

      setPhase("launching");
      await new Promise((r) => setTimeout(r, 300));
      await invoke("close_splashscreen");
    }

    run();
  }, []);

  const statusText = {
    checking:    "Checking for updates...",
    downloading: version ? `Downloading v${version}...` : "Downloading update...",
    installing:  "Installing update...",
    launching:   "Launching...",
  }[phase];

  const showProgress = phase === "downloading" || phase === "installing";
  const barWidth = phase === "installing" ? 100 : progress;

  return (
    <div
      data-tauri-drag-region
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#1e1f22",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        fontFamily: "'gg sans', 'Noto Sans', Helvetica, Arial, sans-serif",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Campfire icon */}
      <div style={{ width: 72, height: 72 }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="72" height="72">
          <ellipse cx="16" cy="26" rx="9" ry="2.5" fill="#4a2c0a"/>
          <rect x="7" y="24.5" width="18" height="3" rx="1.5" fill="#5c3510"/>
          <path d="M16 5 C15 7 13 8 12 10 C11 11.5 11.5 13 10.5 14.5 C9.5 16 9 17 9.5 19 C10 21 11.5 22.5 13 23 C11 21 11.5 19 12.5 17.5 C13 16.5 13.5 16 13 14.5 C14 16 15 17 14.5 19 C14 20.5 14.5 22 16 23 C17.5 22 18 20.5 17.5 19 C17 17 18 16 19 14.5 C18.5 16 19 16.5 19.5 17.5 C20.5 19 21 21 19 23 C20.5 22.5 22 21 22.5 19 C23 17 22.5 16 21.5 14.5 C20.5 13 21 11.5 20 10 C19 8 17 7 16 5Z" fill="#e65100"/>
          <path d="M16 9 C15 11 14 12.5 14 14 C13.5 15.5 14 17 13.5 18.5 C13 20 13.5 21.5 16 22.5 C18.5 21.5 19 20 18.5 18.5 C18 17 18.5 15.5 18 14 C18 12.5 17 11 16 9Z" fill="#ff8f00"/>
          <path d="M16 13 C15.2 14.5 15 16 15.2 17.5 C15.4 19 15.8 20 16 20.5 C16.2 20 16.6 19 16.8 17.5 C17 16 16.8 14.5 16 13Z" fill="#fff176"/>
        </svg>
      </div>

      {/* App name */}
      <div style={{
        color: "#f2f3f5",
        fontSize: "15px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}>
        Den
      </div>

      {/* Status + progress */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        width: "200px",
      }}>
        <div style={{
          color: "#80848e",
          fontSize: "12px",
          textAlign: "center",
          lineHeight: 1.4,
        }}>
          {statusText}
        </div>

        {showProgress && (
          <div style={{
            width: "100%",
            height: "3px",
            backgroundColor: "rgba(255,255,255,0.08)",
            borderRadius: "2px",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${barWidth}%`,
              backgroundColor: "#7c4dff",
              borderRadius: "2px",
              boxShadow: "0 0 6px rgba(124,77,255,0.7)",
              transition: "width 0.2s ease-out",
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
