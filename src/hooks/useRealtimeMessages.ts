import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";
import { uploadFile } from "../utils/upload";
import type { Message } from "../types";

const MSG_SELECT = "*, author:users!author_id(*), attachments(*)";

export function useRealtimeMessages(channelId: string | null) {
  const { setMessages, appendMessage, updateMessage, removeMessage } = useAppStore();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load initial messages
  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    supabase
      .from("messages")
      .select(MSG_SELECT)
      .eq("channel_id", channelId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data as Message[]);
      });
  }, [channelId]);

  // Subscribe to inserts and updates
  useEffect(() => {
    if (!channelId) return;

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
          const { data } = await supabase
            .from("messages")
            .select(MSG_SELECT)
            .eq("id", payload.new.id)
            .single();
          if (data) appendMessage(data as Message);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          if (updated.deleted_at) {
            removeMessage(updated.id);
          } else {
            updateMessage(updated.id, {
              content: updated.content,
              edited_at: updated.edited_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [channelId]);

  async function sendMessage(content: string, authorId: string, files?: File[]) {
    if (!channelId || (!content.trim() && !files?.length)) return;

    const { data: msg } = await supabase
      .from("messages")
      .insert({ channel_id: channelId, author_id: authorId, content: content.trim() })
      .select()
      .single();

    if (!msg) return;

    if (files?.length) {
      await Promise.all(
        files.map(async (file) => {
          const result = await uploadFile(file, authorId);
          if (result.ok) {
            await supabase.from("attachments").insert({ message_id: msg.id, ...result.attachment });
          }
        })
      );

      // Re-fetch the message with attachments now that uploads are done
      const { data: withAttachments } = await supabase
        .from("messages")
        .select(MSG_SELECT)
        .eq("id", msg.id)
        .single();
      if (withAttachments) {
        updateMessage(msg.id, { attachments: (withAttachments as Message).attachments });
      }
    }
  }

  async function editMessage(messageId: string, content: string) {
    if (!content.trim()) return;
    await supabase
      .from("messages")
      .update({ content: content.trim(), edited_at: new Date().toISOString() })
      .eq("id", messageId);
  }

  async function deleteMessage(messageId: string) {
    await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId);
    removeMessage(messageId);
  }

  return { sendMessage, editMessage, deleteMessage };
}
