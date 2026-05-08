import { useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";

export function useVoiceChannel(_currentUserId: string) {
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

    const { token, url, e2eeKey } = await res.json();
    setVoiceChannel(channelId, token, url, e2eeKey ?? null);
  }, [setVoiceChannel]);

  const leave = useCallback(() => {
    if (!useAppStore.getState().voiceChannelId) return;
    clearVoiceChannel();
  }, [clearVoiceChannel]);

  return { join, leave, voiceChannelId, isConnected: !!voiceChannelId };
}
