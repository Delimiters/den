import { useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { Avatar } from "../ui/Avatar";
import { StatusIndicator } from "../ui/StatusIndicator";
import type { DmChannel, User, UserStatus } from "../../types";

interface DmSidebarProps {
  dmChannels: DmChannel[];
  currentDmId: string | null;
  currentUser: User;
  userStatus: UserStatus;
  unread: Record<string, true>;
  onDmSelect: (dmId: string) => void;
  onOpenDm: (userId: string) => void;
  onStatusChange: (s: UserStatus) => void;
  onSignOut: () => void;
}

export function DmSidebar({ dmChannels, currentDmId, currentUser, userStatus, unread, onDmSelect, onOpenDm, onStatusChange, onSignOut }: DmSidebarProps) {
  const [showNewDm, setShowNewDm] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  return (
    <div className="w-60 bg-sidebar flex flex-col shrink-0">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-divider shadow-sm shrink-0">
        <h2 className="text-text-primary font-semibold text-sm">Direct Messages</h2>
        <button
          onClick={() => setShowNewDm(true)}
          title="New message"
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5a2 2 0 00-2 2v14l4-4h12a2 2 0 002-2V5a2 2 0 00-2-2zm-7 12H8v-2h4v2zm4-4H8v-2h8v2zm0-4H8V5h8v2z"/>
            <path d="M20 2v4h4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {showNewDm && (
        <NewDmModal
          currentUserId={currentUser.id}
          onSelect={(userId) => { onOpenDm(userId); setShowNewDm(false); }}
          onClose={() => setShowNewDm(false)}
        />
      )}

      {/* DM list */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {dmChannels.length === 0 ? (
          <p className="text-text-muted text-xs px-3 py-2">No conversations yet.<br />Click a member to start one.</p>
        ) : (
          dmChannels.map((dm) => {
            const other = dm.participants[0];
            if (!other) return null;
            const name = other.display_name || other.username;
            const hasUnread = !!unread[dm.id];
            return (
              <button
                key={dm.id}
                onClick={() => onDmSelect(dm.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                  dm.id === currentDmId
                    ? "bg-white/[0.12] text-text-primary"
                    : "text-text-muted hover:bg-white/[0.06] hover:text-text-secondary"
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar src={other.avatar_url} name={name} size={32} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-sidebar rounded-full flex items-center justify-center">
                    <StatusIndicator status={other.status ?? "offline"} size={10} />
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-sm truncate ${hasUnread ? "text-text-primary font-semibold" : ""}`}>{name}</span>
                    {hasUnread && (
                      <span className="w-2 h-2 bg-white rounded-full shrink-0" />
                    )}
                  </div>
                  {dm.lastMessage && (
                    <p className="text-xs truncate text-text-muted mt-0.5">
                      {dm.lastMessage.content || "📎 Attachment"}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* User panel */}
      <div className="h-14 bg-overlay px-3 flex items-center gap-2 shrink-0 relative">
        {showStatusMenu && (
          <div
            ref={statusMenuRef}
            className="absolute bottom-16 left-3 bg-overlay border border-divider rounded-lg shadow-xl py-1 z-20 w-44"
          >
            {(["online", "idle", "dnd", "offline"] as UserStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => { onStatusChange(s); setShowStatusMenu(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-msg-hover transition-colors ${userStatus === s ? "text-text-primary" : "text-text-secondary"}`}
              >
                <StatusIndicator status={s} size={10} />
                <span className="capitalize">{s === "dnd" ? "Do Not Disturb" : s}</span>
                {userStatus === s && <span className="ml-auto text-accent text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
        <div className="relative cursor-pointer" onClick={() => setShowStatusMenu((v) => !v)}>
          <Avatar src={currentUser.avatar_url} name={currentUser.display_name || currentUser.username} size={32} />
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-overlay rounded-full flex items-center justify-center">
            <StatusIndicator status={userStatus} size={10} />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-xs font-semibold truncate">
            {currentUser.display_name || currentUser.username}
          </p>
          <p className="text-text-muted text-xs truncate">@{currentUser.username}</p>
        </div>
        <button onClick={onSignOut} title="Sign out" className="text-text-muted hover:text-danger transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z" />
            <path d="M20 3h-9c-1.1 0-2 .9-2 2v4h2V5h9v14h-9v-4H9v4c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function NewDmModal({ currentUserId, onSelect, onClose }: {
  currentUserId: string;
  onSelect: (userId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  async function search(q: string) {
    setQuery(q);
    if (!q.trim() || q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("users")
      .select("*")
      .ilike("username", `%${q.trim()}%`)
      .neq("id", currentUserId)
      .limit(10);
    setResults((data ?? []) as User[]);
    setSearching(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-overlay rounded-lg w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-divider flex items-center justify-between">
          <h2 className="text-text-primary font-semibold text-base">New Message</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">✕</button>
        </div>
        <div className="p-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Search by username…"
            className="w-full bg-input-bg text-text-primary rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="max-h-64 overflow-y-auto pb-2">
          {searching && <p className="text-text-muted text-sm text-center py-4">Searching…</p>}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-text-muted text-sm text-center py-4">No users found</p>
          )}
          {results.map((u) => {
            const name = u.display_name || u.username;
            return (
              <button
                key={u.id}
                onClick={() => onSelect(u.id)}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/[0.06] transition-colors"
              >
                <Avatar src={u.avatar_url} name={name} size={32} />
                <div className="text-left">
                  <p className="text-text-primary text-sm font-medium">{name}</p>
                  {u.display_name && <p className="text-text-muted text-xs">@{u.username}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
