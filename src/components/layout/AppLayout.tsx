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
import { useCustomEmojis } from "../../hooks/useCustomEmojis";
import { hasPermission, Permissions } from "../../utils/permissions";
import { GuildSidebar } from "./GuildSidebar";
import { ChannelSidebar } from "./ChannelSidebar";
import { DmSidebar } from "./DmSidebar";
import { FriendsView } from "./FriendsView";
import { useFriendships } from "../../hooks/useFriendships";
import { MemberList } from "./MemberList";
import { MessageList } from "../chat/MessageList";
import { MessageInput } from "../chat/MessageInput";
import { ServerSettingsModal } from "./ServerSettingsModal";
import { MessageSearch } from "../chat/MessageSearch";
import { PinnedMessages, pinMessage } from "../chat/PinnedMessages";
import { ToastContainer } from "../ui/Toast";
import { useToasts } from "../../hooks/useToasts";
import { requestNotificationPermission, notify } from "../../utils/desktopNotification";
import { prefs } from "../../utils/prefs";
import { QuickSwitcher } from "../ui/QuickSwitcher";
import { WindowControls } from "./WindowControls";
import { useDmCallSignaling } from "../../hooks/useDmCallSignaling";
import { isTauri, invoke } from "@tauri-apps/api/core";
import type { User, Guild, Channel } from "../../types";

// Lazy-load LiveKit — only pulled in when a voice channel is active
const VoiceConnection = lazy(() =>
  import("../voice/VoiceChannelView").then((m) => ({ default: m.VoiceConnection }))
);
const DmCallView = lazy(() =>
  import("../voice/DmCallView").then((m) => ({ default: m.DmCallView }))
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
  const [dmTab, setDmTab] = useState<"messages" | "friends">("messages");
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

  const { voiceChannelId, voiceToken, voiceLivekitUrl, voiceE2eeKey, activeDmCall, incomingCall } = useAppStore();
  const { join: joinVoice, leave: leaveVoice } = useVoiceChannel(currentUser.id);
  const { startCall, acceptCall, declineCall, endCall } = useDmCallSignaling(currentUser);

  const { onlineUserIds } = usePresence(currentUser, userStatus);
  const { friends, incoming, outgoing, sendRequest, acceptRequest, declineRequest, removeFriend } = useFriendships(currentUser.id);
  useUnreadTracker(currentGuildId);
  useCustomEmojis(currentGuildId);

  useDmUnreadTracker(dmChannels, currentUser.id, (payload) => {
    addToast(payload);
    if (prefs.getNotifyDms()) notify(payload.senderName, payload.preview, payload.senderAvatar);
  });

  // Request notification permission once on mount
  useEffect(() => { requestNotificationPermission(); }, []);

  // Sync close-behavior preference to Rust on mount
  useEffect(() => {
    if (isTauri()) {
      invoke("set_minimize_to_tray", { value: prefs.getMinimizeToTray() }).catch(() => {});
    }
  }, []);

  // Update window title with unread count
  const unreadCount = Object.keys(unread).length;
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) Den` : "Den";
  }, [unreadCount]);

  const voicePanelRef = useRef<HTMLDivElement>(null);
  const [voiceContentEl, setVoiceContentEl] = useState<HTMLDivElement | null>(null);
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [speakingUserIds, setSpeakingUserIds] = useState<Set<string>>(new Set());

  // Voice presence — tracks who is in which voice channel via Supabase Presence.
  // Presence auto-removes entries when the WebSocket drops (force-quit, crash),
  // giving near-instant cleanup instead of waiting for a DB heartbeat to expire.
  const [voicePresence, setVoicePresence] = useState<{ userId: string; channelId: string; displayName: string; avatarUrl: string | null }[]>([]);
  const voicePresenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    voicePresenceChannelRef.current?.unsubscribe();
    voicePresenceChannelRef.current = null;
    setVoicePresence([]);
    if (!currentGuildId) return;

    const ch = supabase.channel(`voice-presence:${currentGuildId}`);

    ch.on("presence", { event: "sync" }, () => {
      const raw = ch.presenceState<{ userId: string; channelId: string; displayName: string; avatarUrl: string | null }>();
      setVoicePresence(Object.values(raw).flat());
    });

    ch.subscribe();
    voicePresenceChannelRef.current = ch;

    return () => { ch.unsubscribe(); voicePresenceChannelRef.current = null; };
  }, [currentGuildId]);

  // Track / untrack when voice channel changes
  useEffect(() => {
    const ch = voicePresenceChannelRef.current;
    if (!ch) return;
    if (voiceChannelId) {
      ch.track({
        userId: currentUser.id,
        channelId: voiceChannelId,
        displayName: currentUser.display_name || currentUser.username,
        avatarUrl: currentUser.avatar_url ?? null,
      });
    } else {
      ch.untrack();
    }
  }, [voiceChannelId, currentUser]);

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
      if (prefs.getNotifyMentions()) notify(`${senderName} mentioned you`, newest.content, author?.avatar_url ?? null);
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

  const isGuildMode = viewMode === "guild";
  const currentChannel = channels.find((c) => c.id === currentChannelId);
  const voiceChannel = channels.find((c) => c.id === voiceChannelId);
  // Show voice grid when viewing the connected voice channel OR when screen share is active
  const showVoiceGrid = !!(isGuildMode && voiceChannelId && (currentChannelId === voiceChannelId || screenShareActive));
  const currentDm = dmChannels.find((d) => d.id === currentDmId);
  const dmPartner = currentDm?.participants[0];
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
        onOpenDms={() => { setCurrentDm(null); setDmTab("messages"); }}
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
          voicePanelRef={voicePanelRef}
          voicePresence={voicePresence}
          speakingUserIds={speakingUserIds}
          onChannelSelect={(id) => {
            const ch = channels.find((c) => c.id === id);
            if (ch?.type === "voice") {
              if (voiceChannelId === id) {
                // Already connected to this channel — second click shows the participant grid
                setCurrentChannel(id);
              } else {
                // First click: join silently without navigating away from current text channel
                if (currentGuildId) joinVoice(id, currentGuildId);
              }
            } else {
              setCurrentChannel(id);
            }
          }}
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
          friends={friends}
          onlineUserIds={onlineUserIds}
          activeTab={dmTab}
          onTabChange={(tab) => {
            setDmTab(tab);
            if (tab === "friends") setCurrentDm(null);
          }}
          onDmSelect={(id) => { setCurrentDm(id); setDmTab("messages"); }}
          onOpenDm={(userId) => { handleOpenDm(userId); setDmTab("messages"); }}
          onStatusChange={setUserStatus}
          onSignOut={onSignOut}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Voice connection — keeps LiveKit audio alive regardless of what's shown in main content */}
        {isGuildMode && voiceChannelId && voiceToken && voiceLivekitUrl && voiceChannel && (
          <Suspense fallback={null}>
            <VoiceConnection
              token={voiceToken}
              livekitUrl={voiceLivekitUrl}
              e2eeKey={voiceE2eeKey}
              channel={voiceChannel}
              currentUserId={currentUser.id}
              voicePanelRef={voicePanelRef}
              contentEl={voiceContentEl}
              onLeave={() => { leaveVoice(); setSpeakingUserIds(new Set()); }}
              onScreenShareChange={setScreenShareActive}
              onSpeakingChange={setSpeakingUserIds}
              onViewVoiceChannel={() => setCurrentChannel(voiceChannelId)}
            />
          </Suspense>
        )}
        {showVoiceGrid ? (
          <>
            <div data-tauri-drag-region className="h-14 pl-8 pr-3 flex items-center gap-1.5 border-b border-divider shrink-0 shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted shrink-0">
                <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
              </svg>
              <h3 className="text-text-primary font-semibold text-base">{voiceChannel?.name ?? ""}</h3>
            </div>
            <div ref={setVoiceContentEl} className="flex-1 flex flex-col min-h-0 overflow-hidden" />
          </>
        ) : hasContent ? (
          <>
            <div data-tauri-drag-region className="h-14 pl-8 pr-3 flex items-center gap-1.5 border-b border-divider shrink-0 shadow-sm">
              {isGuildMode ? (
                <>
                  <span className="text-text-muted font-bold text-xl leading-none">#</span>
                  <h3 className="text-text-primary font-semibold text-base">{channelName}</h3>
                </>
              ) : (
                <>
                  <span className="text-text-muted text-xl leading-none">@</span>
                  <h3 className="text-text-primary font-semibold text-base">{channelName}</h3>
                </>
              )}
              <div className="flex-1" />
              {/* DM call button */}
              {!isGuildMode && currentDmId && !activeDmCall && (() => {
                const otherUser = currentDm?.participants.find((p) => p.id !== currentUser.id);
                return otherUser ? (
                  <button
                    onClick={() => startCall(currentDmId, otherUser.id)}
                    className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors rounded hover:bg-msg-hover"
                    title={`Call ${otherUser.display_name || otherUser.username}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
                    </svg>
                  </button>
                ) : null;
              })()}
              {/* Pinned messages button — guild text channels only */}
              <div className="flex items-center gap-0.5">
              {isGuildMode && currentChannel?.type === "text" && (
                <button
                  onClick={() => setShowPins((s) => !s)}
                  className={`w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors rounded hover:bg-msg-hover ${showPins ? "bg-msg-hover text-text-primary" : ""}`}
                  title="Pinned messages"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                  </svg>
                </button>
              )}
              <button
                onClick={() => setShowSearch(true)}
                className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors rounded hover:bg-msg-hover"
                title="Search messages (Ctrl+F)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </button>
              </div>
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

            {/* DM call view — rendered above messages when a call is active for this DM */}
            {!isGuildMode && activeDmCall && activeDmCall.dmChannelId === currentDmId && (() => {
              return (
                <Suspense fallback={null}>
                  <DmCallView
                    token={activeDmCall.token}
                    url={activeDmCall.url}
                    e2eeKey={activeDmCall.e2eeKey}
                    onHangUp={() => {
                      const other = currentDm?.participants.find((p) => p.id !== currentUser.id);
                      if (other && activeDmCall) endCall(activeDmCall.dmChannelId, other.id);
                      useAppStore.getState().clearActiveDmCall();
                    }}
                  />
                </Suspense>
              );
            })()}
            <MessageList
              channelName={channelName}
              channelId={channelId}
              isDm={!isGuildMode}
              currentUserId={currentUser.id}
              currentUsername={currentUser.username}
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
              onEdit={editFn}
              onTyping={sendTyping}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </>
        ) : viewMode === "dm" ? (
          <FriendsView
            currentUserId={currentUser.id}
            friends={friends}
            incoming={incoming}
            outgoing={outgoing}
            onlineUserIds={onlineUserIds}
            onOpenDm={(userId) => { handleOpenDm(userId); setDmTab("messages"); }}
            onAccept={acceptRequest}
            onDecline={declineRequest}
            onRemove={removeFriend}
            onSendRequest={sendRequest}
            initialTab={dmTab === "friends" ? "all" : "online"}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-text-muted text-lg">
              {currentGuild
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
          onlineUserIds={onlineUserIds}
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

      {/* Incoming call banner */}
      {incomingCall && (
        <div className="fixed bottom-4 right-4 z-50 bg-overlay border border-divider rounded-lg shadow-2xl p-4 flex items-center gap-4 min-w-[280px]">
          <div className="flex flex-col gap-0.5 flex-1">
            <p className="text-text-primary text-sm font-semibold">Incoming call</p>
            <p className="text-text-muted text-xs">{incomingCall.callerName}</p>
          </div>
          <button
            onClick={declineCall}
            className="w-8 h-8 rounded-full bg-danger hover:bg-danger/80 flex items-center justify-center text-white transition-colors"
            title="Decline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
            </svg>
          </button>
          <button
            onClick={acceptCall}
            className="w-8 h-8 rounded-full bg-status-online hover:bg-status-online/80 flex items-center justify-center text-white transition-colors"
            title="Accept"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
          </button>
        </div>
      )}

      <WindowControls />
    </div>
  );
}
