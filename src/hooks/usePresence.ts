import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "../types";

/** Tracks the current user's presence and returns a map of userId → status */
export function usePresence(currentUser: User | null) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel("presence:global", {
      config: { presence: { key: currentUser.id } },
    });

    channelRef.current = channel;

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: currentUser.id,
          username: currentUser.username,
          online_at: new Date().toISOString(),
        });

        // Also write to the DB for persistent last-seen
        await supabase.from("user_presence").upsert({
          user_id: currentUser.id,
          status: "online",
          last_seen: new Date().toISOString(),
        });
      }
    });

    // Mark offline on cleanup
    return () => {
      supabase.from("user_presence").upsert({
        user_id: currentUser.id,
        status: "offline",
        last_seen: new Date().toISOString(),
      });
      channel.unsubscribe();
    };
  }, [currentUser?.id]);
}
