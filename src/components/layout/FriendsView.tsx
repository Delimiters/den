import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Avatar } from "../ui/Avatar";
import { StatusIndicator } from "../ui/StatusIndicator";
import type { Friendship, User } from "../../types";

type Tab = "online" | "all" | "pending" | "add";

interface FriendsViewProps {
  currentUserId: string;
  friends: Friendship[];
  incoming: Friendship[];
  outgoing: Friendship[];
  onlineUserIds: Set<string>;
  onOpenDm: (userId: string) => void;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onRemove: (id: string) => void;
  onSendRequest: (userId: string) => Promise<{ error: string | null }>;
  initialTab?: Tab;
}

export function FriendsView({
  currentUserId,
  friends,
  incoming,
  outgoing,
  onlineUserIds,
  onOpenDm,
  onAccept,
  onDecline,
  onRemove,
  onSendRequest,
  initialTab = "online",
}: FriendsViewProps) {
  const [tab, setTab] = useState<Tab>(initialTab);

  const onlineFriends = friends.filter(
    (f) => f.friend && (onlineUserIds.has(f.friend.id) || f.friend.status === "online" || f.friend.status === "idle" || f.friend.status === "dnd")
  );
  const pendingCount = incoming.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-main">
      {/* Tab bar */}
      <div className="h-12 px-4 flex items-center gap-1 border-b border-divider shrink-0">
        <TabBtn label="Online" count={onlineFriends.length} active={tab === "online"} onClick={() => setTab("online")} />
        <TabBtn label="All" count={friends.length} active={tab === "all"} onClick={() => setTab("all")} />
        <TabBtn
          label="Pending"
          count={pendingCount + outgoing.length}
          active={tab === "pending"}
          onClick={() => setTab("pending")}
          badge={pendingCount > 0 ? pendingCount : undefined}
        />
        <div className="w-px h-5 bg-divider mx-2" />
        <button
          onClick={() => setTab("add")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            tab === "add"
              ? "bg-accent text-white"
              : "bg-accent/20 text-accent hover:bg-accent/30"
          }`}
        >
          Add Friend
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "online" && <OnlineTab friends={onlineFriends} onMessage={onOpenDm} onRemove={onRemove} />}
        {tab === "all" && <AllTab friends={friends} onlineUserIds={onlineUserIds} onMessage={onOpenDm} onRemove={onRemove} />}
        {tab === "pending" && (
          <PendingTab
            incoming={incoming}
            outgoing={outgoing}
            onAccept={onAccept}
            onDecline={onDecline}
            onCancel={onDecline}
          />
        )}
        {tab === "add" && <AddFriendTab currentUserId={currentUserId} friends={friends} incoming={incoming} outgoing={outgoing} onSend={onSendRequest} />}
      </div>
    </div>
  );
}

function TabBtn({
  label,
  count,
  active,
  onClick,
  badge,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        active
          ? "bg-white/[0.12] text-text-primary"
          : "text-text-muted hover:bg-white/[0.06] hover:text-text-secondary"
      }`}
    >
      {label}
      {count > 0 && (
        <span
          className={`text-xs rounded-full px-1.5 py-0.5 leading-none ${
            active ? "bg-white/20 text-text-primary" : "bg-white/[0.08] text-text-muted"
          }`}
        >
          {count}
        </span>
      )}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-danger text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
          {badge}
        </span>
      )}
    </button>
  );
}

function FriendRow({
  friendship,
  isOnline,
  onMessage,
  onRemove,
  extra,
}: {
  friendship: Friendship;
  isOnline: boolean;
  onMessage?: (id: string) => void;
  onRemove?: (id: string) => void;
  extra?: React.ReactNode;
}) {
  const user = friendship.friend;
  if (!user) return null;
  const name = user.display_name || user.username;
  const status = isOnline
    ? (user.status === "idle" || user.status === "dnd" ? user.status : "online")
    : "offline";

  return (
    <div className="flex items-center gap-3 px-6 py-3 hover:bg-white/[0.04] rounded-lg mx-2 group transition-colors">
      <div className="relative shrink-0">
        <Avatar src={user.avatar_url} name={name} size={40} />
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-main rounded-full flex items-center justify-center">
          <StatusIndicator status={status} size={11} />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-semibold truncate">{name}</p>
        <p className="text-text-muted text-xs truncate capitalize">
          {status === "dnd" ? "Do Not Disturb" : status}
        </p>
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {extra}
        {onMessage && (
          <IconBtn title="Message" onClick={() => onMessage(user.id)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
            </svg>
          </IconBtn>
        )}
        {onRemove && (
          <IconBtn title="Remove friend" onClick={() => onRemove(friendship.id)} danger>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </IconBtn>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
        danger
          ? "text-text-muted hover:text-danger hover:bg-danger/10"
          : "text-text-muted hover:text-text-primary hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <p className="text-text-muted text-xs font-semibold uppercase tracking-wider px-6 pt-6 pb-2">
      {label} — {count}
    </p>
  );
}

function OnlineTab({
  friends,
  onMessage,
  onRemove,
}: {
  friends: Friendship[];
  onMessage: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (friends.length === 0) {
    return (
      <EmptyState
        icon={
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted/40">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
        }
        title="No one's around to play"
        subtitle="All your friends are offline. Check back later!"
      />
    );
  }

  return (
    <div className="py-2">
      <SectionHeader label="Online" count={friends.length} />
      {friends.map((f) => (
        <FriendRow
          key={f.id}
          friendship={f}
          isOnline={true}
          onMessage={onMessage}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function AllTab({
  friends,
  onlineUserIds,
  onMessage,
  onRemove,
}: {
  friends: Friendship[];
  onlineUserIds: Set<string>;
  onMessage: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (friends.length === 0) {
    return (
      <EmptyState
        icon={
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted/40">
            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        }
        title="No friends yet"
        subtitle="Add some friends to get started!"
      />
    );
  }

  const online = friends.filter(
    (f) => f.friend && (onlineUserIds.has(f.friend.id) || ["online", "idle", "dnd"].includes(f.friend.status ?? ""))
  );
  const offline = friends.filter(
    (f) => !f.friend || (!onlineUserIds.has(f.friend.id) && f.friend.status === "offline")
  );

  return (
    <div className="py-2">
      {online.length > 0 && (
        <>
          <SectionHeader label="Online" count={online.length} />
          {online.map((f) => (
            <FriendRow key={f.id} friendship={f} isOnline={true} onMessage={onMessage} onRemove={onRemove} />
          ))}
        </>
      )}
      {offline.length > 0 && (
        <>
          <SectionHeader label="Offline" count={offline.length} />
          {offline.map((f) => (
            <FriendRow key={f.id} friendship={f} isOnline={false} onMessage={onMessage} onRemove={onRemove} />
          ))}
        </>
      )}
    </div>
  );
}

function PendingTab({
  incoming,
  outgoing,
  onAccept,
  onDecline,
  onCancel,
}: {
  incoming: Friendship[];
  outgoing: Friendship[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <EmptyState
        icon={
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted/40">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        }
        title="No pending requests"
        subtitle="You're all caught up!"
      />
    );
  }

  return (
    <div className="py-2">
      {incoming.length > 0 && (
        <>
          <SectionHeader label="Incoming" count={incoming.length} />
          {incoming.map((f) => {
            const user = f.friend;
            if (!user) return null;
            const name = user.display_name || user.username;
            return (
              <div key={f.id} className="flex items-center gap-3 px-6 py-3 hover:bg-white/[0.04] rounded-lg mx-2 group transition-colors">
                <div className="relative shrink-0">
                  <Avatar src={user.avatar_url} name={name} size={40} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-semibold truncate">{name}</p>
                  <p className="text-text-muted text-xs">Incoming friend request</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAccept(f.id)}
                    title="Accept"
                    className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-status-online hover:bg-status-online/10 transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDecline(f.id)}
                    title="Decline"
                    className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}
      {outgoing.length > 0 && (
        <>
          <SectionHeader label="Outgoing" count={outgoing.length} />
          {outgoing.map((f) => {
            const user = f.friend;
            if (!user) return null;
            const name = user.display_name || user.username;
            return (
              <div key={f.id} className="flex items-center gap-3 px-6 py-3 hover:bg-white/[0.04] rounded-lg mx-2 group transition-colors">
                <Avatar src={user.avatar_url} name={name} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-semibold truncate">{name}</p>
                  <p className="text-text-muted text-xs">Outgoing friend request</p>
                </div>
                <button
                  onClick={() => onCancel(f.id)}
                  title="Cancel request"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function AddFriendTab({
  currentUserId,
  friends,
  incoming,
  outgoing,
  onSend,
}: {
  currentUserId: string;
  friends: Friendship[];
  incoming: Friendship[];
  outgoing: Friendship[];
  onSend: (userId: string) => Promise<{ error: string | null }>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);

  const friendIds = new Set([
    ...friends.map((f) => f.friend?.id).filter(Boolean),
    ...incoming.map((f) => f.friend?.id).filter(Boolean),
    ...outgoing.map((f) => f.friend?.id).filter(Boolean),
  ] as string[]);

  async function search(q: string) {
    setQuery(q);
    setErr(null);
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

  async function handleSend(userId: string) {
    setSending(userId);
    setErr(null);
    const { error } = await onSend(userId);
    if (error) {
      setErr(error.includes("duplicate") ? "Friend request already sent." : error);
    } else {
      setSent((s) => new Set([...s, userId]));
    }
    setSending(null);
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <h2 className="text-text-primary font-bold text-xl mb-1">Add Friend</h2>
      <p className="text-text-muted text-sm mb-5">
        Search by username to send a friend request.
      </p>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search by username…"
          className="flex-1 bg-input-bg text-text-primary rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent placeholder:text-text-muted"
        />
      </div>
      {err && <p className="text-danger text-xs mt-2">{err}</p>}

      <div className="mt-4 space-y-1">
        {searching && <p className="text-text-muted text-sm py-4 text-center">Searching…</p>}
        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <p className="text-text-muted text-sm py-4 text-center">No users found for "{query}"</p>
        )}
        {results.map((u) => {
          const name = u.display_name || u.username;
          const alreadyFriend = friendIds.has(u.id);
          const wasSent = sent.has(u.id);
          return (
            <div
              key={u.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <Avatar src={u.avatar_url} name={name} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-semibold">{name}</p>
                {u.display_name && <p className="text-text-muted text-xs">@{u.username}</p>}
              </div>
              {alreadyFriend ? (
                <span className="text-text-muted text-xs px-3 py-1.5 rounded-lg bg-white/[0.06]">
                  {friends.some((f) => f.friend?.id === u.id) ? "Friends" : "Pending"}
                </span>
              ) : wasSent ? (
                <span className="text-status-online text-xs px-3 py-1.5 rounded-lg bg-status-online/10 font-medium">
                  Request sent!
                </span>
              ) : (
                <button
                  onClick={() => handleSend(u.id)}
                  disabled={sending === u.id}
                  className="text-sm font-medium px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-60 transition-colors"
                >
                  {sending === u.id ? "Sending…" : "Add Friend"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-8">
      {icon}
      <div>
        <p className="text-text-primary font-semibold text-base">{title}</p>
        <p className="text-text-muted text-sm mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
