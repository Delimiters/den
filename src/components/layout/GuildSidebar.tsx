import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Avatar } from "../ui/Avatar";
import type { Guild } from "../../types";

interface GuildSidebarProps {
  guilds: Guild[];
  currentGuildId: string | null;
  userId: string;
  viewMode: "guild" | "dm";
  onGuildSelect: (guildId: string) => void;
  onGuildsRefresh: () => void;
  onOpenDms: () => void;
}

export function GuildSidebar({
  guilds,
  currentGuildId,
  userId,
  viewMode,
  onGuildSelect,
  onGuildsRefresh,
  onOpenDms,
}: GuildSidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  return (
    <>
      <div className="w-18 bg-guild-rail flex flex-col items-center py-3 gap-2 shrink-0 overflow-y-auto">
        {/* DM home button */}
        <button
          onClick={onOpenDms}
          title="Direct Messages"
          className={`w-12 h-12 transition-all overflow-hidden flex items-center justify-center ${
            viewMode === "dm"
              ? "rounded-2xl bg-accent text-white"
              : "rounded-3xl hover:rounded-2xl bg-sidebar hover:bg-accent text-accent hover:text-white"
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </button>

        <div className="w-8 h-px bg-divider my-1 rounded" />

        {/* Guild list */}
        {guilds.map((guild) => (
          <GuildButton
            key={guild.id}
            guild={guild}
            active={guild.id === currentGuildId}
            onClick={() => onGuildSelect(guild.id)}
          />
        ))}

        <div className="w-8 h-px bg-divider my-1 rounded" />

        {/* Create server */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-12 h-12 rounded-3xl hover:rounded-2xl bg-sidebar hover:bg-success transition-all flex items-center justify-center text-success hover:text-white text-2xl font-light"
          title="Create a server"
        >
          +
        </button>

        {/* Join server */}
        <button
          onClick={() => setShowJoinModal(true)}
          className="w-12 h-12 rounded-3xl hover:rounded-2xl bg-sidebar hover:bg-accent transition-all flex items-center justify-center text-accent hover:text-white"
          title="Join a server"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm-1 12H5V8h14v8z" />
          </svg>
        </button>
      </div>

      {showCreateModal && (
        <CreateGuildModal
          userId={userId}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); onGuildsRefresh(); }}
        />
      )}

      {showJoinModal && (
        <JoinGuildModal
          onClose={() => setShowJoinModal(false)}
          onJoined={(guildId) => { setShowJoinModal(false); onGuildsRefresh(); onGuildSelect(guildId); }}
        />
      )}
    </>
  );
}

function GuildButton({ guild, active, onClick }: { guild: Guild; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={guild.name}
      className="relative group"
    >
      {/* Active pill */}
      <span
        className={`absolute -left-3 top-1/2 -translate-y-1/2 w-1 bg-text-primary rounded-r transition-all ${
          active ? "h-10" : "h-0 group-hover:h-5"
        }`}
      />
      <div
        className={`w-12 h-12 transition-all overflow-hidden ${
          active ? "rounded-2xl" : "rounded-3xl group-hover:rounded-2xl"
        }`}
      >
        <Avatar src={guild.icon_url} name={guild.name} size={48} />
      </div>
    </button>
  );
}

function CreateGuildModal({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from("guilds")
      .insert({ name: name.trim(), owner_id: userId });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onCreated();
  }

  return (
    <Modal title="Create a server" onClose={onClose}>
      <p className="text-text-muted text-sm mb-4">Give your server a name. You can always change it later.</p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        placeholder="My Awesome Server"
        className="w-full bg-input-bg text-text-primary rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent mb-4"
      />
      {error && <p className="text-danger text-sm mb-2">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-sm px-4 py-2">Cancel</button>
        <button
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded disabled:opacity-50"
        >
          Create
        </button>
      </div>
    </Modal>
  );
}

function JoinGuildModal({ onClose, onJoined }: { onClose: () => void; onJoined: (guildId: string) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!code.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("join_guild_by_invite", { invite: code.trim() });
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("expired")) setError("This invite link has expired.");
      else if (msg.includes("maximum")) setError("This invite link has reached its maximum uses.");
      else setError("Invalid invite code.");
      return;
    }
    onJoined(data as string);
  }

  return (
    <Modal title="Join a server" onClose={onClose}>
      <p className="text-text-muted text-sm mb-4">Enter an invite code to join an existing server.</p>
      <input
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        placeholder="Invite code (e.g. a3f8c2d1)"
        className="w-full bg-input-bg text-text-primary rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent mb-4"
      />
      {error && <p className="text-danger text-sm mb-2">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-sm px-4 py-2">Cancel</button>
        <button
          onClick={handleJoin}
          disabled={!code.trim() || loading}
          className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded disabled:opacity-50"
        >
          Join Server
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-overlay rounded-lg p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-text-primary text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
