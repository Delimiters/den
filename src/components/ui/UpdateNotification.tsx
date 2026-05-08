import type { UpdateState } from "../../hooks/useAutoUpdate";

export function UpdateNotification({ status, progress, version }: UpdateState) {
  if (status === "idle") return null;

  const isRestarting = status === "restarting";

  const title = {
    downloading: "Downloading update",
    installing:  "Installing update",
    restarting:  "Restarting Den",
  }[status];

  const sub = {
    downloading: version ? `v${version} — ${progress}%` : `${progress}%`,
    installing:  "Almost done…",
    restarting:  "See you in a second",
  }[status];

  return (
    <div
      className="fixed bottom-6 right-6 z-[9998] w-72 rounded-lg overflow-hidden shadow-2xl"
      style={{
        background: "var(--color-overlay)",
        border: "1px solid rgba(255,255,255,0.06)",
        animation: "den-update-slide-up 0.35s cubic-bezier(0.16,1,0.3,1) both",
        opacity: isRestarting ? 0.75 : 1,
        transition: "opacity 0.4s ease",
      }}
    >
      <div className="px-4 py-3.5 flex items-center gap-3">
        {/* Icon */}
        <div
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(124,77,255,0.15)" }}
        >
          <UpdateIcon status={status} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-semibold leading-tight">{title}</p>
          <p className="text-text-muted text-xs mt-0.5">{sub}</p>
        </div>
      </div>

      {/* Progress track */}
      <div className="h-[2px] relative" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${status === "installing" || isRestarting ? 100 : progress}%`,
            background: isRestarting
              ? "var(--color-status-online)"
              : "var(--color-accent)",
            boxShadow: `0 0 8px 1px ${isRestarting ? "var(--color-status-online)" : "var(--color-accent)"}`,
            transition: "width 0.25s ease-out, background 0.4s ease",
          }}
        />
        {/* Shimmer sweep — only while actively downloading */}
        {status === "downloading" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
              animation: "den-update-shimmer 1.6s ease-in-out infinite",
            }}
          />
        )}
      </div>
    </div>
  );
}

function UpdateIcon({ status }: { status: string }) {
  const cls = "text-accent";

  if (status === "downloading") {
    return (
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        className={cls}
        style={{ animation: "den-update-bob 1.2s ease-in-out infinite" }}
      >
        <path d="M12 3v13M5 13l7 7 7-7" />
        <path d="M3 21h18" strokeOpacity="0.4" />
      </svg>
    );
  }

  if (status === "installing") {
    return (
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        className={cls}
      >
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }

  // restarting
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      className={cls}
      style={{ animation: "den-update-spin 0.9s linear infinite" }}
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}
