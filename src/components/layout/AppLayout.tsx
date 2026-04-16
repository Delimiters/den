import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAppStore } from "../../stores/appStore";
import { useRealtimeMessages } from "../../hooks/useRealtimeMessages";
import { usePresence } from "../../hooks/usePresence";
import { useReactions } from "../../hooks/useReactions";
import { GuildSidebar } from "./GuildSidebar";
import { ChannelSidebar } from "./ChannelSidebar";
import { MemberList } from "./MemberList";
import { MessageList } from "../chat/MessageList";
import { MessageInput } from "../chat/MessageInput";
import type { User, Guild, Channel } from "../../types";

interface AppLayoutProps {
  currentUser: User;
  onSignOut: () => void;
}

export function AppLayout({ currentUser, onSignOut }: AppLayoutProps) {
  const {
    guilds, setGuilds,
    channels, setChannels,
    currentGuildId, setCurrentGuild,
    currentChannelId, setCurrentChannel,
  } = useAppStore();

  const { sendMessage, editMessage, deleteMessage } = useRealtimeMessages(currentChannelId);
  usePresence(currentUser);

  const messages = useAppStore((s) => s.messages);
  const messageIds = messages.map((m) => m.id);
  const { toggleReaction } = useReactions(currentChannelId, messageIds);

  // Load guilds on mount
  useEffect(() => { loadGuilds(); }, [currentUser.id]);

  // Load channels when guild changes
  useEffect(() => {
    if (currentGuildId) loadChannels(currentGuildId);
  }, [currentGuildId]);

  async function loadGuilds() {
    const { data } = await supabase
      .from("guild_members")
      .select("guild:guilds!guild_id(*)")
      .eq("user_id", currentUser.id);
    if (data) {
      const g = data.map((r: any) => r.guild).filter(Boolean) as Guild[];
      setGuilds(g);
      if (g.length > 0 && !currentGuildId) setCurrentGuild(g[0].id);
    }
  }

  async function loadChannels(guildId: string) {
    const { data } = await supabase
      .from("channels")
      .select("*")
      .eq("guild_id", guildId)
      .order("position");
    if (data) {
      setChannels(data as Channel[]);
      const first = (data as Channel[]).find((c) => c.type === "text");
      if (first && !currentChannelId) setCurrentChannel(first.id);
    }
  }

  const currentGuild = guilds.find((g) => g.id === currentGuildId);
  const currentChannel = channels.find((c) => c.id === currentChannelId);

  return (
    <div className="h-full flex bg-main overflow-hidden">
      {/* Guild icon rail */}
      <GuildSidebar
        guilds={guilds}
        currentGuildId={currentGuildId}
        userId={currentUser.id}
        onGuildSelect={(id) => setCurrentGuild(id)}
        onGuildsRefresh={loadGuilds}
      />

      {/* Channel sidebar */}
      <ChannelSidebar
        guild={currentGuild}
        channels={channels}
        currentChannelId={currentChannelId}
        currentUser={currentUser}
        onChannelSelect={(id) => setCurrentChannel(id)}
        onChannelsRefresh={() => currentGuildId && loadChannels(currentGuildId)}
        onSignOut={onSignOut}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentChannel ? (
          <>
            {/* Channel header */}
            <div className="h-12 px-4 flex items-center gap-2 border-b border-divider shrink-0 shadow-sm">
              <span className="text-text-muted font-bold text-lg">#</span>
              <h3 className="text-text-primary font-semibold text-sm">
                {currentChannel.name}
              </h3>
            </div>

            {/* Messages + input */}
            <MessageList
              channelName={currentChannel.name}
              channelId={currentChannel.id}
              currentUserId={currentUser.id}
              onEdit={editMessage}
              onDelete={deleteMessage}
              onReact={(msgId, emoji) => toggleReaction(msgId, emoji, currentUser.id)}
            />
            <MessageInput
              channelName={currentChannel.name}
              onSend={(content) => sendMessage(content, currentUser.id)}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-text-muted text-lg">
                {currentGuild ? "Select a channel to start chatting" : "Select or create a server"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Member list */}
      {currentGuildId && <MemberList guildId={currentGuildId} currentUserId={currentUser.id} />}
    </div>
  );
}
