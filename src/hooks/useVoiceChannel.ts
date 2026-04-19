import { useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";

export function useVoiceChannel(currentUserId: string) {
  const { voiceChannelId, setVoiceChannel, clearVoiceChannel } = useAppStore();

  const join = useCallback(async (channelId: string, guildId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livekit-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ channelId, guildId }),
      }
    );

    if (!res.ok) {
      console.error("Failed to get LiveKit token:", await res.text());
      return;
    }

    const { token, url } = await res.json();
    setVoiceChannel(channelId, token, url);

    // Track presence in voice_sessions
    await supabase.from("voice_sessions").upsert({
      user_id: currentUserId,
      channel_id: channelId,
      guild_id: guildId,
    });
  }, [currentUserId, setVoiceChannel]);

  const leave = useCallback(() => {
    if (!useAppStore.getState().voiceChannelId) return;
    // .then() is required — Supabase builders are lazy and only send the HTTP request when awaited
    supabase.from("voice_sessions").delete().eq("user_id", currentUserId).then();
    clearVoiceChannel();
  }, [currentUserId, clearVoiceChannel]);

  // Clean up voice session if the component unmounts while connected
  useEffect(() => {
    return () => {
      if (useAppStore.getState().voiceChannelId) {
        supabase.from("voice_sessions").delete().eq("user_id", currentUserId).then();
        useAppStore.getState().clearVoiceChannel();
      }
    };
  }, [currentUserId]);

  return { join, leave, voiceChannelId, isConnected: !!voiceChannelId };
}
