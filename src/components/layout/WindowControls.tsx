import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

// Custom close/minimize/maximize buttons for Windows (shown when native decorations are removed)
export function WindowControls() {
  if (!isTauri() || !navigator.userAgent.includes("Windows")) return null;

  const win = getCurrentWindow();

  return (
    <div className="fixed top-0 right-0 z-[9999] flex items-stretch h-8 select-none">
      <button
        onClick={() => win.minimize()}
        title="Minimize"
        className="w-11 h-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
          <rect width="10" height="1" />
        </svg>
      </button>
      <button
        onClick={() => win.toggleMaximize()}
        title="Maximize"
        className="w-11 h-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="0.5" y="0.5" width="9" height="9" />
        </svg>
      </button>
      <button
        onClick={() => win.close()}
        title="Close"
        className="w-11 h-full flex items-center justify-center text-text-muted hover:text-white hover:bg-red-600 transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
