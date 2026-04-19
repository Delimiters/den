import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { User, UserStatus } from "../types";

/** Tracks the current user's presence. Call setStatus to update the displayed status. */
export function usePresence(currentUser: User | null, status: UserStatus = "online") {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel("presence:global", {
      config: { presence: { key: currentUser.id } },
    });

    channelRef.current = channel;

    channel.subscribe(async (sub) => {
      if (sub === "SUBSCRIBED") {
        await channel.track({
          user_id: currentUser.id,
          username: currentUser.username,
          status,
          online_at: new Date().toISOString(),
        });

        await supabase.from("user_presence").upsert({
          user_id: currentUser.id,
          status,
          last_seen: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.from("user_presence").upsert({
        user_id: currentUser.id,
        status: "offline",
        last_seen: new Date().toISOString(),
      });
      channel.unsubscribe();
    };
  }, [currentUser?.id]);

  // Update status when it changes without re-subscribing
  useEffect(() => {
    if (!currentUser || !channelRef.current) return;
    channelRef.current.track({
      user_id: currentUser.id,
      username: currentUser.username,
      status,
      online_at: new Date().toISOString(),
    });
    supabase.from("user_presence").upsert({
      user_id: currentUser.id,
      status,
      last_seen: new Date().toISOString(),
    });
  }, [status]);
}
