import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";

/**
 * Subscribes to message inserts across all channels the user is in.
 * Marks channels as unread when a message arrives in a non-active channel.
 */
export function useUnreadTracker(guildId: string | null) {
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!guildId) return;

    subRef.current?.unsubscribe();

    subRef.current = supabase
      .channel(`unread:${guildId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const { currentChannelId, markUnread } = useAppStore.getState();
          const incomingChannelId = payload.new.channel_id as string;
          if (incomingChannelId !== currentChannelId) {
            markUnread(incomingChannelId);
          }
        }
      )
      .subscribe();

    return () => { subRef.current?.unsubscribe(); };
  }, [guildId]);
}
