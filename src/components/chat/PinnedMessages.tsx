import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Avatar } from "../ui/Avatar";
import { formatTimestamp } from "../../utils/message";
import type { Message } from "../../types";

interface PinnedMessagesProps {
  channelId: string;
  currentUserId: string;
  canManage: boolean;
  onClose: () => void;
}

interface PinnedEntry {
  id: string;
  message_id: string;
  pinned_at: string;
  pinned_by: string;
  message: Message & { author?: { username: string; display_name: string; avatar_url: string | null } };
}

export function PinnedMessages({ channelId, canManage, onClose }: PinnedMessagesProps) {
  const [pins, setPins] = useState<PinnedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [channelId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("pinned_messages")
      .select("id, message_id, pinned_at, pinned_by, message:messages!message_id(id, content, created_at, author_id, author:users!author_id(username, display_name, avatar_url))")
      .eq("channel_id", channelId)
      .order("pinned_at", { ascending: false });
    setPins((data ?? []) as unknown as PinnedEntry[]);
    setLoading(false);
  }

  async function unpin(pinId: string) {
    await supabase.from("pinned_messages").delete().eq("id", pinId);
    setPins((p) => p.filter((x) => x.id !== pinId));
  }

  return (
    <div
      className="absolute inset-0 z-30 bg-main/95 flex flex-col"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="h-12 px-4 flex items-center gap-3 border-b border-divider shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted shrink-0">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
        </svg>
        <span className="text-text-primary font-semibold text-sm">Pinned Messages</span>
        <div className="flex-1" />
        <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors text-xs">
          Esc
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-text-muted text-sm text-center mt-8">Loading…</p>}
        {!loading && pins.length === 0 && (
          <p className="text-text-muted text-sm text-center mt-8">No pinned messages in this channel.</p>
        )}
        {!loading && pins.length > 0 && (
          <div className="flex flex-col divide-y divide-divider">
            {pins.map((pin) => {
              const msg = pin.message;
              const author = msg.author;
              const name = author?.display_name || author?.username || "Unknown";
              return (
                <div key={pin.id} className="flex items-start gap-3 px-4 py-3 hover:bg-msg-hover transition-colors group">
                  <Avatar src={author?.avatar_url ?? null} name={name} size={32} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-text-primary text-sm font-semibold">{name}</span>
                      <span className="text-text-muted text-xs">{formatTimestamp(msg.created_at, false)}</span>
                    </div>
                    <p className="text-text-secondary text-sm break-words line-clamp-3">{msg.content}</p>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => unpin(pin.id)}
                      className="text-text-muted hover:text-danger transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                      title="Unpin message"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Pin a message — call from Message action button */
export async function pinMessage(channelId: string, messageId: string, pinnedBy: string): Promise<boolean> {
  const { error } = await supabase
    .from("pinned_messages")
    .insert({ channel_id: channelId, message_id: messageId, pinned_by: pinnedBy });
  return !error;
}
