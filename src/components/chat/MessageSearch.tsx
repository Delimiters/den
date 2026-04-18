import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import type { Message } from "../../types";
import { formatTimestamp } from "../../utils/message";
import { Avatar } from "../ui/Avatar";

interface MessageSearchProps {
  channelId: string;
  isDm?: boolean;
  onClose: () => void;
}

export function MessageSearch({ channelId, isDm = false, onClose }: MessageSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      if (isDm) {
        const { data } = await supabase
          .from("dm_messages")
          .select("*, author:users!author_id(*)")
          .eq("dm_channel_id", channelId)
          .is("deleted_at", null)
          .ilike("content", `%${query.trim()}%`)
          .order("created_at", { ascending: false })
          .limit(25);
        setResults(
          (data ?? []).map((dm: any) => ({
            id: dm.id,
            channel_id: dm.dm_channel_id,
            author_id: dm.author_id,
            content: dm.content,
            created_at: dm.created_at,
            edited_at: dm.edited_at,
            deleted_at: dm.deleted_at,
            author: dm.author,
          }))
        );
      } else {
        const { data } = await supabase
          .from("messages")
          .select("*, author:users!author_id(*)")
          .eq("channel_id", channelId)
          .is("deleted_at", null)
          .ilike("content", `%${query.trim()}%`)
          .order("created_at", { ascending: false })
          .limit(25);
        setResults((data ?? []) as Message[]);
      }
      setLoading(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, channelId, isDm]);

  function highlight(text: string, term: string) {
    if (!term.trim()) return text;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase()
        ? <mark key={i} className="bg-accent/30 text-text-primary rounded-sm">{part}</mark>
        : part
    );
  }

  return (
    <div className="absolute inset-0 z-30 bg-main/95 flex flex-col" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="h-12 px-4 flex items-center gap-3 border-b border-divider shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted shrink-0">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages…"
          className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted"
        />
        <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors text-xs">
          Esc
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="text-text-muted text-sm text-center mt-8">Searching…</p>
        )}
        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <p className="text-text-muted text-sm text-center mt-8">No results for "{query}"</p>
        )}
        {!loading && results.length > 0 && (
          <div className="flex flex-col divide-y divide-divider">
            {results.map((msg) => {
              const name = msg.author?.display_name || msg.author?.username || "Unknown";
              return (
                <div key={msg.id} className="flex items-start gap-3 px-4 py-3 hover:bg-msg-hover transition-colors">
                  <Avatar src={msg.author?.avatar_url} name={name} size={32} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-text-primary text-sm font-semibold">{name}</span>
                      <span className="text-text-muted text-xs">{formatTimestamp(msg.created_at, false)}</span>
                    </div>
                    <p className="text-text-secondary text-sm break-words">
                      {highlight(msg.content, query.trim())}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {query.trim().length < 2 && !loading && (
          <p className="text-text-muted text-sm text-center mt-8">Type at least 2 characters to search</p>
        )}
      </div>
    </div>
  );
}
