import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";
import type { Message } from "../types";

export function useRealtimeMessages(channelId: string | null) {
  const { setMessages, appendMessage } = useAppStore();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load initial messages
  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    supabase
      .from("messages")
      .select("*, author:users(*)")
      .eq("channel_id", channelId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data as Message[]);
      });
  }, [channelId]);

  // Subscribe to new messages
  useEffect(() => {
    if (!channelId) return;

    // Clean up previous subscription
    subscriptionRef.current?.unsubscribe();

    subscriptionRef.current = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch the full message with author info
          const { data } = await supabase
            .from("messages")
            .select("*, author:users(*)")
            .eq("id", payload.new.id)
            .single();
          if (data) appendMessage(data as Message);
        }
      )
      .subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [channelId]);

  async function sendMessage(content: string, authorId: string) {
    if (!channelId || !content.trim()) return;
    await supabase.from("messages").insert({
      channel_id: channelId,
      author_id: authorId,
      content: content.trim(),
    });
  }

  return { sendMessage };
}
