import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";
import type { MessageReaction } from "../types";

export function useReactions(channelId: string | null, messageIds: string[]) {
  const { setMessageReactions, addReaction, removeReaction } = useAppStore();
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load reactions whenever visible message IDs change
  useEffect(() => {
    if (!channelId || messageIds.length === 0) return;

    supabase
      .from("message_reactions")
      .select("*")
      .in("message_id", messageIds)
      .then(({ data }) => {
        if (!data) return;
        // Group by message_id and set in store
        const grouped: Record<string, MessageReaction[]> = {};
        for (const r of data as MessageReaction[]) {
          if (!grouped[r.message_id]) grouped[r.message_id] = [];
          grouped[r.message_id].push(r);
        }
        for (const [msgId, reactions] of Object.entries(grouped)) {
          setMessageReactions(msgId, reactions);
        }
      });
  }, [channelId, messageIds.join(",")]);

  // Realtime subscription for reaction changes
  useEffect(() => {
    if (!channelId) return;

    subRef.current?.unsubscribe();

    subRef.current = supabase
      .channel(`reactions:${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload) => addReaction(payload.new as MessageReaction)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload) => {
          const r = payload.old as MessageReaction;
          removeReaction(r.message_id, r.user_id, r.emoji);
        }
      )
      .subscribe();

    return () => { subRef.current?.unsubscribe(); };
  }, [channelId]);

  async function toggleReaction(messageId: string, emoji: string, userId: string) {
    const reactions = useAppStore.getState().reactions[messageId] ?? [];
    const mine = reactions.find((r) => r.user_id === userId && r.emoji === emoji);

    if (mine) {
      removeReaction(messageId, userId, emoji);
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", userId)
        .eq("emoji", emoji);
    } else {
      addReaction({ message_id: messageId, user_id: userId, emoji });
      await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: userId, emoji });
    }
  }

  return { toggleReaction };
}
