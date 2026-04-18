import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";
import type { DmChannel } from "../types";

/**
 * Subscribes to all DM channels for the current user and marks them as unread
 * when a new message arrives in a channel that isn't currently open.
 */
export function useDmUnreadTracker(dmChannels: DmChannel[]) {
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
      }, (payload) => {
        const dmChannelId = (payload.new as any).dm_channel_id;
        if (!channelIds.includes(dmChannelId)) return;
        const { currentDmId, viewMode, markUnread } = useAppStore.getState();
        if (viewMode !== "dm" || currentDmId !== dmChannelId) {
          markUnread(dmChannelId);
        }
      })
      .subscribe();

    return () => { subRef.current?.unsubscribe(); };
  }, [dmChannels.map((d) => d.id).join(",")]);
}
