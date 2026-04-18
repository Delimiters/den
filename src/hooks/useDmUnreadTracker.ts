import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";
import type { DmChannel, User } from "../types";

interface ToastPayload {
  type: "dm";
  senderName: string;
  senderAvatar: string | null;
  preview: string;
}

/**
 * Subscribes to all DM channels for the current user and marks them as unread
 * when a new message arrives in a channel that isn't currently open.
 */
export function useDmUnreadTracker(
  dmChannels: DmChannel[],
  currentUserId: string,
  onNotify?: (payload: ToastPayload) => void
) {
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (dmChannels.length === 0) return;
    subRef.current?.unsubscribe();

    const channelIds = dmChannels.map((d) => d.id);

    subRef.current = supabase
      .channel("dm-unread-tracker")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "dm_messages",
      }, async (payload) => {
        const row = payload.new as any;
        const dmChannelId = row.dm_channel_id;
        if (!channelIds.includes(dmChannelId)) return;
        if (row.author_id === currentUserId) return; // own messages
        const { currentDmId, viewMode, markUnread } = useAppStore.getState();
        if (viewMode !== "dm" || currentDmId !== dmChannelId) {
          markUnread(dmChannelId);
          if (onNotify) {
            // Fetch author info for the toast
            const { data: author } = await supabase
              .from("users")
              .select("username, display_name, avatar_url")
              .eq("id", row.author_id)
              .single();
            const a = author as Pick<User, "username" | "display_name" | "avatar_url"> | null;
            onNotify({
              type: "dm",
              senderName: a?.display_name || a?.username || "Someone",
              senderAvatar: a?.avatar_url ?? null,
              preview: row.content || "📎 Attachment",
            });
          }
        }
      })
      .subscribe();

    return () => { subRef.current?.unsubscribe(); };
  }, [dmChannels.map((d) => d.id).join(","), currentUserId]);
}
