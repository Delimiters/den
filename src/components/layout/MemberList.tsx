import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { Avatar } from "../ui/Avatar";
import { StatusIndicator } from "../ui/StatusIndicator";
import type { GuildMember, Role, UserStatus } from "../../types";

interface MemberListProps {
  guildId: string | null;
  currentUserId?: string;
  onlineUserIds?: Set<string>;
  roles?: Role[];
  canManageRoles?: boolean;
  getUserRoles?: (userId: string) => Role[];
  onOpenDm?: (userId: string) => void;
  onAssignRole?: (userId: string, roleId: string) => void;
  onRevokeRole?: (userId: string, roleId: string) => void;
}

interface MemberWithStatus extends GuildMember {
  presence_status: UserStatus;
}

interface ContextMenu {
  x: number;
  y: number;
  member: MemberWithStatus;
}

export function MemberList({
  guildId, currentUserId, onlineUserIds, roles = [], canManageRoles = false,
  getUserRoles, onOpenDm, onAssignRole, onRevokeRole,
}: MemberListProps) {
  const [members, setMembers] = useState<MemberWithStatus[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!guildId) { setMembers([]); return; }

    async function load() {
      const { data } = await supabase
        .from("guild_members")
        .select("*, user:users!user_id(*)")
        .eq("guild_id", guildId);

      if (data) {
        setMembers(data.map((m: any) => ({ ...m, presence_status: "offline" as UserStatus })));
      }
    }

    load();
  }, [guildId]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  function handleContextMenu(e: React.MouseEvent, member: MemberWithStatus) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, member });
  }

  const membersWithStatus = members.map((m) => ({
    ...m,
    presence_status: (m.user_id === currentUserId || onlineUserIds?.has(m.user_id) ? "online" : "offline") as UserStatus,
  }));
  const online = membersWithStatus.filter((m) => m.presence_status !== "offline");
  const offline = membersWithStatus.filter((m) => m.presence_status === "offline");

  return (
    <div className="w-60 bg-sidebar flex flex-col shrink-0 overflow-y-auto">
      <div className="px-3 py-5">
        {online.length > 0 && (
          <MemberSection
            label={`Online — ${online.length}`}
            members={online}
            currentUserId={currentUserId}
            onOpenDm={onOpenDm}
            onContextMenu={handleContextMenu}
          />
        )}
        {offline.length > 0 && (
          <MemberSection
            label={`Offline — ${offline.length}`}
            members={offline}
            currentUserId={currentUserId}
            onOpenDm={onOpenDm}
            onContextMenu={handleContextMenu}
          />
        )}

      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-overlay border border-divider rounded shadow-xl z-50 py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {(() => {
            const user = (contextMenu.member as any).user;
            const name = contextMenu.member.nickname ?? user?.display_name ?? user?.username ?? "Unknown";
            const isSelf = contextMenu.member.user_id === currentUserId;
            const memberRoles = getUserRoles?.(contextMenu.member.user_id) ?? [];
            const assignableRoles = roles.filter((r) => r.name !== "@everyone" && !memberRoles.find((mr) => mr.id === r.id));
            const revokableRoles = memberRoles.filter((r) => r.name !== "@everyone");

            return (
              <>
                <p className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-divider mb-1">
                  {name}
                </p>
                {!isSelf && onOpenDm && (
                  <button
                    onClick={() => { onOpenDm(contextMenu.member.user_id); setContextMenu(null); }}
                    className="w-full px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-msg-hover text-left transition-colors"
                  >
                    Send Message
                  </button>
                )}
                {canManageRoles && (assignableRoles.length > 0 || revokableRoles.length > 0) && (
                  <>
                    <div className="border-t border-divider my-1" />
                    <p className="px-3 py-0.5 text-xs text-text-muted">Roles</p>
                    {revokableRoles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => { onRevokeRole?.(contextMenu.member.user_id, role.id); setContextMenu(null); }}
                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-msg-hover transition-colors flex items-center gap-2"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                        <span className="text-text-secondary flex-1 truncate">{role.name}</span>
                        <span className="text-danger text-xs">✕</span>
                      </button>
                    ))}
                    {assignableRoles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => { onAssignRole?.(contextMenu.member.user_id, role.id); setContextMenu(null); }}
                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-msg-hover transition-colors flex items-center gap-2"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                        <span className="text-text-muted flex-1 truncate">{role.name}</span>
                        <span className="text-accent text-xs">+</span>
                      </button>
                    ))}
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function MemberSection({ label, members, currentUserId, onOpenDm, onContextMenu }: {
  label: string;
  members: MemberWithStatus[];
  currentUserId?: string;
  onOpenDm?: (userId: string) => void;
  onContextMenu: (e: React.MouseEvent, member: MemberWithStatus) => void;
}) {
  return (
    <div className="mb-4">
      <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-2 px-1">{label}</p>
      {members.map((m) => {
        const user = (m as any).user;
        const name = m.nickname ?? user?.display_name ?? user?.username ?? "Unknown";
        const isSelf = m.user_id === currentUserId;
        return (
          <div
            key={m.user_id}
            onClick={() => !isSelf && onOpenDm?.(m.user_id)}
            onContextMenu={(e) => onContextMenu(e, m)}
            className={`flex items-center gap-3 px-2 py-2.5 rounded hover:bg-msg-hover group ${!isSelf && onOpenDm ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className="relative shrink-0">
              <Avatar src={user?.avatar_url} name={name} size={32} />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-sidebar rounded-full flex items-center justify-center group-hover:bg-msg-hover transition-colors">
                <StatusIndicator status={m.presence_status} size={10} />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium truncate ${m.presence_status === "offline" ? "text-text-muted" : "text-text-secondary"}`}>
                {name}
              </p>
            </div>
            {!isSelf && onOpenDm && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
                className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
