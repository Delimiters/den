import { useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";

const TYPING_TIMEOUT_MS = 3000;

export function useTyping(channelId: string | null, currentUsername: string) {
  const setTyping = useAppStore((s) => s.setTyping);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  useEffect(() => {
    if (!channelId) return;

    channelRef.current?.unsubscribe();

    const channel = supabase.channel(`typing:${channelId}`, {
      config: { presence: { key: currentUsername } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ username: string }>();
        const typingUsers = Object.values(state)
          .flat()
          .map((p: any) => p.username)
          .filter((u: string) => u !== currentUsername);
        setTyping(channelId, typingUsers);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      setTyping(channelId, []);
    };
  }, [channelId, currentUsername]);

  const sendTyping = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || !channelId) return;

    if (!isTyping.current) {
      isTyping.current = true;
      channel.track({ username: currentUsername });
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isTyping.current = false;
      channel.untrack();
    }, TYPING_TIMEOUT_MS);
  }, [channelId, currentUsername]);

  return { sendTyping };
}
