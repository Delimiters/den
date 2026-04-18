import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../../stores/appStore";
import type { Channel, DmChannel } from "../../types";

interface QuickSwitcherProps {
  onClose: () => void;
}

interface Item {
  id: string;
  label: string;
  sublabel?: string;
  type: "text" | "voice" | "dm";
  action: () => void;
}

export function QuickSwitcher({ onClose }: QuickSwitcherProps) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { channels, dmChannels, setCurrentChannel, setCurrentDm } = useAppStore();

  const allItems: Item[] = [
    ...channels
      .filter((c) => c.type !== "category")
      .map((c: Channel) => ({
        id: c.id,
        label: c.name,
        sublabel: c.type === "voice" ? "Voice Channel" : "Text Channel",
        type: c.type as "text" | "voice",
        action: () => { setCurrentChannel(c.id); onClose(); },
      })),
    ...dmChannels.map((d: DmChannel) => {
      const partner = d.participants[0];
      const name = partner ? (partner.display_name || partner.username) : "Unknown";
      return {
        id: d.id,
        label: name,
        sublabel: "Direct Message",
        type: "dm" as const,
        action: () => { setCurrentDm(d.id); onClose(); },
      };
    }),
  ];

  const filtered = query.trim()
    ? allItems.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  useEffect(() => { setSelectedIdx(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const confirm = useCallback((idx: number) => {
    const item = filtered[idx];
    if (item) item.action();
  }, [filtered]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      confirm(selectedIdx);
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 pt-24"
      onClick={onClose}
    >
      <div
        className="bg-overlay border border-divider rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-divider">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted shrink-0">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to channel or conversation…"
            className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted"
          />
          <kbd className="text-text-muted text-xs border border-divider rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="text-text-muted text-sm text-center py-6">No channels or conversations found</p>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onMouseEnter={() => setSelectedIdx(i)}
              onClick={() => confirm(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === selectedIdx ? "bg-accent/20" : "hover:bg-msg-hover"
              }`}
            >
              <span className="text-text-muted w-4 text-center shrink-0 text-sm">
                {item.type === "voice" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
                  </svg>
                ) : item.type === "dm" ? "@" : "#"}
              </span>
              <span className="text-text-primary text-sm font-medium flex-1 truncate">{item.label}</span>
              <span className="text-text-muted text-xs shrink-0">{item.sublabel}</span>
            </button>
          ))}
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 border-t border-divider">
            <span className="text-text-muted text-xs flex items-center gap-1">
              <kbd className="border border-divider rounded px-1">↑↓</kbd> navigate
            </span>
            <span className="text-text-muted text-xs flex items-center gap-1">
              <kbd className="border border-divider rounded px-1">↵</kbd> open
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
