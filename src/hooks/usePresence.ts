import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { User, UserStatus } from "../types";

/** Tracks the current user's presence and returns the set of online user IDs. */
export function usePresence(currentUser: User | null, status: UserStatus = "online") {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel("presence:global", {
      config: { presence: { key: currentUser.id } },
    });

    channelRef.current = channel;

    function syncOnline() {
      const state = channel.presenceState<{ user_id: string }>();
      const ids = new Set(
        Object.values(state).flat().map((p) => p.user_id).filter(Boolean)
      );
      setOnlineUserIds(ids);
    }

    channel
      .on("presence", { event: "sync" }, syncOnline)
      .subscribe(async (sub) => {
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

  return { onlineUserIds };
}
