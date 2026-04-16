import { useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Channel, Guild, User } from "../../types";
import { Avatar } from "../ui/Avatar";
import { StatusIndicator } from "../ui/StatusIndicator";
import { UserSettingsModal } from "./UserSettingsModal";

interface ChannelSidebarProps {
  guild: Guild | undefined;
  channels: Channel[];
  currentChannelId: string | null;
  currentUser: User;
  onChannelSelect: (channelId: string) => void;
  onChannelsRefresh: () => void;
  onSignOut: () => void;
}

export function ChannelSidebar({
  guild,
  channels,
  currentChannelId,
  currentUser,
  onChannelSelect,
  onChannelsRefresh,
  onSignOut,
}: ChannelSidebarProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  return (
    <div className="w-60 bg-sidebar flex flex-col shrink-0">
      {/* Guild header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-divider shadow-sm shrink-0">
        <h2 className="text-text-primary font-semibold text-sm truncate">
          {guild?.name ?? "Select a server"}
        </h2>
        {guild && (
          <button
            onClick={() => setShowInvite(true)}
            className="text-text-muted hover:text-text-primary transition-colors"
            title="Invite people"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm-1 0a2 2 0 11-4 0 2 2 0 014 0z" />
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 8a8 8 0 100-16 8 8 0 000 16z" />
              <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        )}
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {guild && (
          <>
            <ChannelSection
              label="Text Channels"
              onAdd={() => setShowAddChannel(true)}
            >
              {textChannels.map((ch) => (
                <ChannelRow
                  key={ch.id}
                  channel={ch}
                  active={ch.id === currentChannelId}
                  onClick={() => onChannelSelect(ch.id)}
                />
              ))}
            </ChannelSection>

            {voiceChannels.length > 0 && (
              <ChannelSection label="Voice Channels">
                {voiceChannels.map((ch) => (
                  <ChannelRow
                    key={ch.id}
                    channel={ch}
                    active={ch.id === currentChannelId}
                    onClick={() => onChannelSelect(ch.id)}
                  />
                ))}
              </ChannelSection>
            )}
          </>
        )}
      </div>

      {/* User panel */}
      <div className="h-14 bg-overlay px-2 flex items-center gap-2 shrink-0">
        <div className="relative">
          <Avatar
            src={currentUser.avatar_url}
            name={currentUser.display_name || currentUser.username}
            size={32}
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-overlay rounded-full flex items-center justify-center">
            <StatusIndicator status="online" size={10} />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-xs font-semibold truncate">
            {currentUser.display_name || currentUser.username}
          </p>
          <p className="text-text-muted text-xs truncate">@{currentUser.username}</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          title="User settings"
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.07 7.07 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>
        <button
          onClick={onSignOut}
          title="Sign out"
          className="text-text-muted hover:text-danger transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z" />
            <path d="M20 3h-9c-1.1 0-2 .9-2 2v4h2V5h9v14h-9v-4H9v4c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
          </svg>
        </button>
      </div>

      {/* Invite modal */}
      {showInvite && guild && (
        <InviteModal
          inviteCode={guild.invite_code}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* User settings modal */}
      {showSettings && (
        <UserSettingsModal
          currentUser={currentUser}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Add channel modal */}
      {showAddChannel && guild && (
        <AddChannelModal
          guildId={guild.id}
          onClose={() => setShowAddChannel(false)}
          onCreated={() => { setShowAddChannel(false); onChannelsRefresh(); }}
        />
      )}
    </div>
  );
}

function ChannelSection({
  label,
  onAdd,
  children,
}: {
  label: string;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-1 mb-1 group">
        <span className="text-text-muted text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
        {onAdd && (
          <button
            onClick={onAdd}
            className="text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all"
            title="Add channel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ChannelRow({
  channel,
  active,
  onClick,
}: {
  channel: Channel;
  active: boolean;
  onClick: () => void;
}) {
  const icon = channel.type === "voice" ? "🔊" : "#";
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors group ${
        active
          ? "bg-msg-hover text-text-primary"
          : "text-text-muted hover:bg-msg-hover hover:text-text-secondary"
      }`}
    >
      <span className="text-text-muted text-base leading-none">{icon}</span>
      <span className="truncate">{channel.name}</span>
    </button>
  );
}

function InviteModal({ inviteCode, onClose }: { inviteCode: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-overlay rounded-lg p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-text-primary text-xl font-bold mb-1">Invite Friends</h2>
        <p className="text-text-muted text-sm mb-4">Share this invite code with anyone you want to add.</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteCode}
            className="flex-1 bg-input-bg text-text-primary text-sm rounded px-3 py-2 outline-none"
          />
          <button
            onClick={copy}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <button onClick={onClose} className="mt-4 text-text-muted hover:text-text-primary text-sm">
          Done
        </button>
      </div>
    </div>
  );
}

function AddChannelModal({ guildId, onClose, onCreated }: { guildId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    await supabase.from("channels").insert({
      guild_id: guildId,
      name: name.toLowerCase().replace(/\s+/g, "-"),
      type: "text",
      position: 99,
    });
    setLoading(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-overlay rounded-lg p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-text-primary text-xl font-bold mb-4">Create Channel</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="new-channel"
          className="w-full bg-input-bg text-text-primary rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-sm px-4 py-2">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded disabled:opacity-50"
          >
            Create Channel
          </button>
        </div>
      </div>
    </div>
  );
}
