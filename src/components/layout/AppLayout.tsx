import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useAppStore } from "../../stores/appStore";
import { useRealtimeMessages } from "../../hooks/useRealtimeMessages";
import { useDirectMessages, loadDmChannels, openDm } from "../../hooks/useDirectMessages";
import { useDmUnreadTracker } from "../../hooks/useDmUnreadTracker";
import { usePresence } from "../../hooks/usePresence";
import { useReactions } from "../../hooks/useReactions";
import { useUnreadTracker } from "../../hooks/useUnreadTracker";
import { useTyping } from "../../hooks/useTyping";
import { useRoles } from "../../hooks/useRoles";
import { useVoiceChannel } from "../../hooks/useVoiceChannel";
import { hasPermission, Permissions } from "../../utils/permissions";
import { GuildSidebar } from "./GuildSidebar";
import { ChannelSidebar } from "./ChannelSidebar";
import { DmSidebar } from "./DmSidebar";
import { MemberList } from "./MemberList";
import { MessageList } from "../chat/MessageList";
import { MessageInput } from "../chat/MessageInput";
import { ServerSettingsModal } from "./ServerSettingsModal";
import { MessageSearch } from "../chat/MessageSearch";
import { PinnedMessages, pinMessage } from "../chat/PinnedMessages";
import { ToastContainer } from "../ui/Toast";
import { useToasts } from "../../hooks/useToasts";
import { requestNotificationPermission, notify } from "../../utils/desktopNotification";
import { QuickSwitcher } from "../ui/QuickSwitcher";
import type { User, Guild, Channel } from "../../types";

// Lazy-load LiveKit — ~500KB chunk only loaded when entering a voice channel
const VoiceChannelView = lazy(() =>
  import("../voice/VoiceChannelView").then((m) => ({ default: m.VoiceChannelView }))
);

interface AppLayoutProps {
  currentUser: User;
  onSignOut: () => void;
}

export function AppLayout({ currentUser, onSignOut }: AppLayoutProps) {
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [replyingTo, setReplyingTo] = useState<import("../../types").Message | null>(null);
  const [userStatus, setUserStatus] = useState<import("../../types").UserStatus>("online");
  const { toasts, addToast, dismiss } = useToasts();

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

  const { voiceChannelId, voiceToken, voiceLivekitUrl } = useAppStore();
  const { join: joinVoice, leave: leaveVoice } = useVoiceChannel(currentUser.id);

  usePresence(currentUser, userStatus);
  useUnreadTracker(currentGuildId);
  useDmUnreadTracker(dmChannels, currentUser.id, (payload) => {
    addToast(payload);
    notify(payload.senderName, payload.preview, payload.senderAvatar);
  });

  // Request notification permission once on mount
  useEffect(() => { requestNotificationPermission(); }, []);

  // Update window title with unread count
  const unreadCount = Object.keys(unread).length;
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) Den` : "Den";
  }, [unreadCount]);

  // Toast + desktop notification on @mention in guild channels
  const messages = useAppStore((s) => s.messages);
  const latestMsgId = useRef<string | null>(null);
  useEffect(() => {
    if (messages.length === 0) return;
    const newest = messages[0]; // newest-first
    if (!newest || newest.id === latestMsgId.current) return;
    latestMsgId.current = newest.id;
    // Only notify if authored by someone else and contains @username
    if (
      newest.author_id !== currentUser.id &&
      newest.content.includes(`@${currentUser.username}`)
    ) {
      const author = newest.author;
      const senderName = author?.display_name || author?.username || "Someone";
      addToast({
        type: "mention",
        senderName,
        senderAvatar: author?.avatar_url ?? null,
        preview: newest.content,
        onClick: () => {},
      });
      notify(`${senderName} mentioned you`, newest.content, author?.avatar_url ?? null);
    }
  }, [messages[0]?.id]);
  const activeChannelId = viewMode === "guild" ? currentChannelId : currentDmId;
  const { sendTyping } = useTyping(activeChannelId, currentUser.username);

  const messageIds = messages.map((m) => m.id);
  const { toggleReaction } = useReactions(
    viewMode === "guild" ? currentChannelId : null,
    messageIds
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const { currentChannelId: chId, currentDmId: dmId, viewMode: vm } = useAppStore.getState();
      const active = vm === "guild" ? !!chId : !!dmId;
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowQuickSwitcher((s) => !s);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "f" && active) {
        e.preventDefault();
        setShowSearch((s) => !s);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => { loadGuilds(); loadDms(); }, [currentUser.id]);
  // Re-load channels when switching to guild mode OR when currentGuildId changes
  useEffect(() => {
    if (viewMode === "guild" && currentGuildId) loadChannels(currentGuildId);
  }, [currentGuildId, viewMode]);
  // Clear reply context and pins panel on channel/DM switch
  useEffect(() => { setReplyingTo(null); setShowPins(false); }, [currentChannelId, currentDmId]);

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

  const unreadGuildIds = new Set(
    channels.filter((c) => unread[c.id]).map((c) => c.guild_id)
  );

  const currentChannel = channels.find((c) => c.id === currentChannelId);
  const currentDm = dmChannels.find((d) => d.id === currentDmId);
  const dmPartner = currentDm?.participants[0];

  const isGuildMode = viewMode === "guild";
  const sendFn = isGuildMode
    ? (content: string, files?: File[], replyToId?: string | null) => sendMessage(content, currentUser.id, files, replyToId)
    : (content: string, files?: File[], replyToId?: string | null) => sendDm(content, currentUser.id, files, replyToId);
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
        unreadGuildIds={unreadGuildIds}
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
          userStatus={userStatus}
          unread={unread}
          canManageChannels={hasPermission(myPermissions, Permissions.MANAGE_CHANNELS)}
          onChannelSelect={(id) => setCurrentChannel(id)}
          onChannelsRefresh={() => currentGuildId && loadChannels(currentGuildId)}
          onStatusChange={setUserStatus}
          onSignOut={onSignOut}
          onOpenServerSettings={() => setShowServerSettings(true)}
        />
      ) : (
        <DmSidebar
          dmChannels={dmChannels}
          currentDmId={currentDmId}
          currentUser={currentUser}
          userStatus={userStatus}
          unread={unread}
          onDmSelect={(id) => setCurrentDm(id)}
          onOpenDm={handleOpenDm}
          onStatusChange={setUserStatus}
          onSignOut={onSignOut}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Voice channel view — replaces chat area when a voice channel is selected */}
        {isGuildMode && currentChannel?.type === "voice" && voiceChannelId === currentChannel.id && voiceToken && voiceLivekitUrl ? (
          <Suspense fallback={<div className="flex-1 flex items-center justify-center"><p className="text-text-muted">Connecting…</p></div>}>
            <VoiceChannelView
              token={voiceToken}
              livekitUrl={voiceLivekitUrl}
              channel={currentChannel}
              currentUserId={currentUser.id}
              onLeave={leaveVoice}
            />
          </Suspense>
        ) : isGuildMode && currentChannel?.type === "voice" ? (
          /* Voice channel join screen */
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted">
              <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
            </svg>
            <div className="text-center">
              <h3 className="text-text-primary font-semibold text-lg">{currentChannel.name}</h3>
              <p className="text-text-muted text-sm mt-1">Voice Channel</p>
            </div>
            <button
              onClick={() => currentGuildId && joinVoice(currentChannel.id, currentGuildId)}
              className="bg-accent hover:bg-accent-hover text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Join Voice
            </button>
          </div>
        ) : hasContent ? (
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
              <div className="flex-1" />
              {/* Pinned messages button — guild text channels only */}
              {isGuildMode && currentChannel?.type === "text" && (
                <button
                  onClick={() => setShowPins((s) => !s)}
                  className={`text-text-muted hover:text-text-primary transition-colors p-1.5 rounded hover:bg-msg-hover ${showPins ? "bg-msg-hover text-text-primary" : ""}`}
                  title="Pinned messages"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                  </svg>
                </button>
              )}
              <button
                onClick={() => setShowSearch(true)}
                className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded hover:bg-msg-hover"
                title="Search messages (Ctrl+F)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </button>
            </div>
            {showSearch && channelId && (
              <MessageSearch
                channelId={channelId}
                isDm={!isGuildMode}
                onClose={() => setShowSearch(false)}
              />
            )}
            {showPins && channelId && isGuildMode && (
              <PinnedMessages
                channelId={channelId}
                currentUserId={currentUser.id}
                canManage={hasPermission(myPermissions, Permissions.MANAGE_MESSAGES)}
                onClose={() => setShowPins(false)}
              />
            )}

            <MessageList
              channelName={channelName}
              channelId={channelId}
              isDm={!isGuildMode}
              currentUserId={currentUser.id}
              typingUsers={typing[activeChannelId ?? ""] ?? []}
              onEdit={editFn}
              onDelete={deleteFn}
              onReact={isGuildMode ? (msgId, emoji) => toggleReaction(msgId, emoji, currentUser.id) : undefined}
              onReply={(msg) => setReplyingTo(msg)}
              onPin={isGuildMode && currentChannel?.type === "text" ? (msgId) => pinMessage(currentChannelId!, msgId, currentUser.id) : undefined}
              onOpenDm={handleOpenDm}
            />
            <MessageInput
              channelName={channelName}
              onSend={sendFn}
              onTyping={sendTyping}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
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

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {showQuickSwitcher && <QuickSwitcher onClose={() => setShowQuickSwitcher(false)} />}
    </div>
  );
}
