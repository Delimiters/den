import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAppStore } from "../../stores/appStore";
import { useRealtimeMessages } from "../../hooks/useRealtimeMessages";
import { useDirectMessages, loadDmChannels, openDm } from "../../hooks/useDirectMessages";
import { usePresence } from "../../hooks/usePresence";
import { useReactions } from "../../hooks/useReactions";
import { useUnreadTracker } from "../../hooks/useUnreadTracker";
import { useTyping } from "../../hooks/useTyping";
import { useRoles } from "../../hooks/useRoles";
import { hasPermission, Permissions } from "../../utils/permissions";
import { GuildSidebar } from "./GuildSidebar";
import { ChannelSidebar } from "./ChannelSidebar";
import { DmSidebar } from "./DmSidebar";
import { MemberList } from "./MemberList";
import { MessageList } from "../chat/MessageList";
import { MessageInput } from "../chat/MessageInput";
import { ServerSettingsModal } from "./ServerSettingsModal";
import type { User, Guild, Channel } from "../../types";

interface AppLayoutProps {
  currentUser: User;
  onSignOut: () => void;
}

export function AppLayout({ currentUser, onSignOut }: AppLayoutProps) {
  const [showServerSettings, setShowServerSettings] = useState(false);

  const {
    viewMode, setCurrentGuild, setCurrentDm,
    guilds, setGuilds,
    channels, setChannels,
    currentGuildId,
    currentChannelId, setCurrentChannel,
    currentDmId,
    dmChannels, setDmChannels,
    unread, typing,
  } = useAppStore();

  const { sendMessage, editMessage, deleteMessage } = useRealtimeMessages(
    viewMode === "guild" ? currentChannelId : null
  );
  const { sendDm, editDm, deleteDm } = useDirectMessages(
    viewMode === "dm" ? currentDmId : null
  );
  const currentGuild = guilds.find((g) => g.id === currentGuildId);
  const { roles, myPermissions, getUserRoles, assignRole, revokeRole, createRole, updateRole, deleteRole } = useRoles(
    currentGuildId,
    currentUser.id,
    currentGuild?.owner_id ?? null
  );

  usePresence(currentUser);
  useUnreadTracker(currentGuildId);
  const activeChannelId = viewMode === "guild" ? currentChannelId : currentDmId;
  const { sendTyping } = useTyping(activeChannelId, currentUser.username);

  const messages = useAppStore((s) => s.messages);
  const messageIds = messages.map((m) => m.id);
  const { toggleReaction } = useReactions(
    viewMode === "guild" ? currentChannelId : null,
    messageIds
  );

  useEffect(() => { loadGuilds(); loadDms(); }, [currentUser.id]);
  // Re-load channels when switching to guild mode OR when currentGuildId changes
  useEffect(() => {
    if (viewMode === "guild" && currentGuildId) loadChannels(currentGuildId);
  }, [currentGuildId, viewMode]);

  async function loadGuilds() {
    const { data } = await supabase
      .from("guild_members")
      .select("guild:guilds!guild_id(*)")
      .eq("user_id", currentUser.id);
    if (data) {
      const g = data.map((r: any) => r.guild).filter(Boolean) as Guild[];
      setGuilds(g);
      if (g.length > 0 && !useAppStore.getState().currentGuildId) setCurrentGuild(g[0].id);
    }
  }

  async function loadDms() {
    const dms = await loadDmChannels(currentUser.id);
    setDmChannels(dms);
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

  async function handleOpenDm(userId: string) {
    const dmId = await openDm(userId);
    if (!dmId) return;
    // Refresh DM list so the new conversation appears
    const dms = await loadDmChannels(currentUser.id);
    setDmChannels(dms);
    setCurrentDm(dmId);
  }

  const currentChannel = channels.find((c) => c.id === currentChannelId);
  const currentDm = dmChannels.find((d) => d.id === currentDmId);
  const dmPartner = currentDm?.participants[0];

  const isGuildMode = viewMode === "guild";
  const sendFn = isGuildMode
    ? (content: string, files?: File[]) => sendMessage(content, currentUser.id, files)
    : (content: string) => sendDm(content, currentUser.id);
  const editFn = isGuildMode ? editMessage : editDm;
  const deleteFn = isGuildMode ? deleteMessage : deleteDm;

  const channelName = isGuildMode
    ? (currentChannel?.name ?? "")
    : (dmPartner ? (dmPartner.display_name || dmPartner.username) : "");

  const channelId = isGuildMode ? currentChannel?.id : currentDmId ?? undefined;
  const hasContent = isGuildMode ? !!currentChannel : !!currentDmId;

  return (
    <div className="h-full flex bg-main overflow-hidden">
      {/* Guild rail */}
      <GuildSidebar
        guilds={guilds}
        currentGuildId={currentGuildId}
        userId={currentUser.id}
        viewMode={viewMode}
        onGuildSelect={(id) => setCurrentGuild(id)}
        onGuildsRefresh={loadGuilds}
        onOpenDms={() => setCurrentDm(dmChannels[0]?.id ?? null)}
      />

      {/* Left sidebar — guild channels or DM list */}
      {isGuildMode ? (
        <ChannelSidebar
          guild={currentGuild}
          channels={channels}
          currentChannelId={currentChannelId}
          currentUser={currentUser}
          unread={unread}
          canManageChannels={hasPermission(myPermissions, Permissions.MANAGE_CHANNELS)}
          onChannelSelect={(id) => setCurrentChannel(id)}
          onChannelsRefresh={() => currentGuildId && loadChannels(currentGuildId)}
          onSignOut={onSignOut}
          onOpenServerSettings={() => setShowServerSettings(true)}
        />
      ) : (
        <DmSidebar
          dmChannels={dmChannels}
          currentDmId={currentDmId}
          currentUser={currentUser}
          onDmSelect={(id) => setCurrentDm(id)}
          onSignOut={onSignOut}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {hasContent ? (
          <>
            <div className="h-12 px-4 flex items-center gap-2 border-b border-divider shrink-0 shadow-sm">
              {isGuildMode ? (
                <>
                  <span className="text-text-muted font-bold text-lg">#</span>
                  <h3 className="text-text-primary font-semibold text-sm">{channelName}</h3>
                </>
              ) : (
                <>
                  <span className="text-text-muted text-lg">@</span>
                  <h3 className="text-text-primary font-semibold text-sm">{channelName}</h3>
                </>
              )}
            </div>

            <MessageList
              channelName={channelName}
              channelId={channelId}
              currentUserId={currentUser.id}
              typingUsers={typing[activeChannelId ?? ""] ?? []}
              onEdit={editFn}
              onDelete={deleteFn}
              onReact={isGuildMode ? (msgId, emoji) => toggleReaction(msgId, emoji, currentUser.id) : undefined}
            />
            <MessageInput channelName={channelName} onSend={sendFn} onTyping={sendTyping} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-text-muted text-lg">
              {viewMode === "dm"
                ? "Select a conversation or click a member to start one"
                : currentGuild
                ? "Select a channel to start chatting"
                : "Select or create a server"}
            </p>
          </div>
        )}
      </div>

      {/* Member list (guild mode only) */}
      {isGuildMode && currentGuildId && (
        <MemberList
          guildId={currentGuildId}
          currentUserId={currentUser.id}
          roles={roles}
          canManageRoles={hasPermission(myPermissions, Permissions.MANAGE_ROLES)}
          getUserRoles={getUserRoles}
          onOpenDm={handleOpenDm}
          onAssignRole={assignRole}
          onRevokeRole={revokeRole}
        />
      )}

      {/* Server settings modal */}
      {showServerSettings && currentGuild && (
        <ServerSettingsModal
          guild={currentGuild}
          currentUserId={currentUser.id}
          roles={roles}
          onCreateRole={createRole}
          onUpdateRole={updateRole}
          onDeleteRole={deleteRole}
          onClose={() => setShowServerSettings(false)}
        />
      )}
    </div>
  );
}
