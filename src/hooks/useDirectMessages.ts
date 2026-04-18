import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";
import { uploadFile } from "../utils/upload";
import type { Message, DmChannel, DmMessage, User } from "../types";

/** Maps a dm_message row to the Message shape used by the store/UI */
function dmToMessage(dm: DmMessage): Message {
  return {
    id: dm.id,
    channel_id: dm.dm_channel_id,
    author_id: dm.author_id,
    content: dm.content,
    created_at: dm.created_at,
    edited_at: dm.edited_at,
    deleted_at: dm.deleted_at,
    author: dm.author,
    attachments: dm.dm_attachments?.map((a) => ({
      id: a.id,
      message_id: a.dm_message_id,
      file_url: a.file_url,
      file_name: a.file_name,
      file_size: a.file_size,
      content_type: a.content_type,
    })),
  };
}

export function useDirectMessages(dmId: string | null) {
  const { setMessages, appendMessage, updateMessage, removeMessage } = useAppStore();
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load messages on open
  useEffect(() => {
    if (!dmId) { setMessages([]); return; }

    supabase
      .from("dm_messages")
      .select("*, author:users!author_id(*), dm_attachments(*)")
      .eq("dm_channel_id", dmId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages((data as DmMessage[]).map(dmToMessage));
      });
  }, [dmId]);

  // Realtime subscription
  useEffect(() => {
    if (!dmId) return;
    subRef.current?.unsubscribe();

    subRef.current = supabase
      .channel(`dm:${dmId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "dm_messages",
        filter: `dm_channel_id=eq.${dmId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from("dm_messages")
          .select("*, author:users!author_id(*), dm_attachments(*)")
          .eq("id", payload.new.id)
          .single();
        if (data) appendMessage(dmToMessage(data as DmMessage));
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "dm_messages",
        filter: `dm_channel_id=eq.${dmId}`,
      }, (payload) => {
        const updated = payload.new as DmMessage;
        if (updated.deleted_at) {
          removeMessage(updated.id);
        } else {
          updateMessage(updated.id, { content: updated.content, edited_at: updated.edited_at });
        }
      })
      .subscribe();

    return () => { subRef.current?.unsubscribe(); };
  }, [dmId]);

  async function sendDm(content: string, authorId: string, files?: File[]) {
    if (!dmId || (!content.trim() && (!files || files.length === 0))) return;

    const { data: msg } = await supabase
      .from("dm_messages")
      .insert({ dm_channel_id: dmId, author_id: authorId, content: content.trim() })
      .select("id")
      .single();

    if (msg && files && files.length > 0) {
      const uploads = await Promise.all(files.map((f) => uploadFile(f, authorId)));
      const rows = uploads
        .filter((r): r is Extract<typeof r, { ok: true }> => r.ok)
        .map((r) => ({
          dm_message_id: msg.id,
          file_url: r.attachment.file_url,
          file_name: r.attachment.file_name,
          file_size: r.attachment.file_size,
          content_type: r.attachment.content_type,
        }));
      if (rows.length > 0) await supabase.from("dm_attachments").insert(rows);

      // Re-fetch to get attachments on the message in the store
      const { data: updated } = await supabase
        .from("dm_messages")
        .select("*, author:users!author_id(*), dm_attachments(*)")
        .eq("id", msg.id)
        .single();
      if (updated) updateMessage(msg.id, { attachments: dmToMessage(updated as DmMessage).attachments });
    }
  }

  async function editDm(messageId: string, content: string) {
    if (!content.trim()) return;
    await supabase
      .from("dm_messages")
      .update({ content: content.trim(), edited_at: new Date().toISOString() })
      .eq("id", messageId);
  }

  async function deleteDm(messageId: string) {
    removeMessage(messageId);
    await supabase
      .from("dm_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId);
  }

  return { sendDm, editDm, deleteDm };
}

/** Load all DM channels for the current user */
export async function loadDmChannels(userId: string): Promise<DmChannel[]> {
  const { data } = await supabase
    .from("dm_participants")
    .select("dm_channel_id, dm_channel:dm_channels(id, created_at)")
    .eq("user_id", userId);

  if (!data) return [];

  const channelIds = data.map((r: any) => r.dm_channel_id);
  if (channelIds.length === 0) return [];

  // For each channel, get the other participants
  const { data: participants } = await supabase
    .from("dm_participants")
    .select("dm_channel_id, user:users!user_id(id, username, display_name, avatar_url, status, created_at)")
    .in("dm_channel_id", channelIds)
    .neq("user_id", userId);

  if (!participants) return [];

  const participantsByChannel: Record<string, User[]> = {};
  for (const p of participants as any[]) {
    if (!participantsByChannel[p.dm_channel_id]) participantsByChannel[p.dm_channel_id] = [];
    if (p.user) participantsByChannel[p.dm_channel_id].push(p.user as User);
  }

  return data.map((r: any) => ({
    id: r.dm_channel_id,
    created_at: r.dm_channel?.created_at ?? "",
    participants: participantsByChannel[r.dm_channel_id] ?? [],
  })).filter((d) => d.participants.length > 0);
}

/** Get or create a DM channel with another user */
export async function openDm(otherUserId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_or_create_dm", { other_user_id: otherUserId });
  if (error) { console.error(error); return null; }
  return data as string;
}
