import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";
import type { CustomEmoji } from "../types";

export function useCustomEmojis(guildId: string | null) {
  const setCustomEmojis = useAppStore((s) => s.setCustomEmojis);

  useEffect(() => {
    if (!guildId) {
      setCustomEmojis([]);
      return;
    }
    supabase
      .from("custom_emojis")
      .select("*")
      .eq("guild_id", guildId)
      .order("name")
      .then(({ data }) => {
        if (data) setCustomEmojis(data as CustomEmoji[]);
      });
  }, [guildId]);
}
