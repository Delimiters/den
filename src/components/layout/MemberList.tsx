import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Avatar } from "../ui/Avatar";
import { StatusIndicator } from "../ui/StatusIndicator";
import type { GuildMember, UserStatus } from "../../types";

interface MemberListProps {
  guildId: string | null;
  currentUserId?: string;
}

interface MemberWithStatus extends GuildMember {
  presence_status: UserStatus;
}

export function MemberList({ guildId, currentUserId }: MemberListProps) {
  const [members, setMembers] = useState<MemberWithStatus[]>([]);

  useEffect(() => {
    if (!guildId) { setMembers([]); return; }

    async function load() {
      const { data } = await supabase
        .from("guild_members")
        .select("*, user:users!user_id(*, presence:user_presence!user_id(status))")
        .eq("guild_id", guildId);

      if (data) {
        const mapped: MemberWithStatus[] = data.map((m: any) => ({
          ...m,
          presence_status: m.user_id === currentUserId
            ? "online"
            : m.user?.presence?.[0]?.status ?? "offline",
        }));
        setMembers(mapped);
      }
    }

    load();

    // Subscribe to presence changes
    const sub = supabase
      .channel(`presence:guild:${guildId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "user_presence",
      }, () => load())
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [guildId]);

  const online = members.filter((m) => m.presence_status !== "offline");
  const offline = members.filter((m) => m.presence_status === "offline");

  return (
    <div className="w-60 bg-sidebar flex flex-col shrink-0 overflow-y-auto">
      <div className="px-4 py-4">
        {online.length > 0 && (
          <MemberSection label={`Online — ${online.length}`} members={online} />
        )}
        {offline.length > 0 && (
          <MemberSection label={`Offline — ${offline.length}`} members={offline} />
        )}
      </div>
    </div>
  );
}

function MemberSection({ label, members }: { label: string; members: MemberWithStatus[] }) {
  return (
    <div className="mb-4">
      <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2 px-2">{label}</p>
      {members.map((m) => {
        const user = (m as any).user;
        const name = m.nickname ?? user?.display_name ?? user?.username ?? "Unknown";
        return (
          <div
            key={m.user_id}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-msg-hover cursor-pointer group"
          >
            <div className="relative">
              <Avatar src={user?.avatar_url} name={name} size={32} />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-sidebar rounded-full flex items-center justify-center group-hover:bg-msg-hover transition-colors">
                <StatusIndicator status={m.presence_status} size={10} />
              </span>
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium truncate ${m.presence_status === "offline" ? "text-text-muted" : "text-text-secondary"}`}>
                {name}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
