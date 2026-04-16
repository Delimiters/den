import { Avatar } from "../ui/Avatar";
import { StatusIndicator } from "../ui/StatusIndicator";
import type { DmChannel, User } from "../../types";

interface DmSidebarProps {
  dmChannels: DmChannel[];
  currentDmId: string | null;
  currentUser: User;
  onDmSelect: (dmId: string) => void;
  onSignOut: () => void;
}

export function DmSidebar({ dmChannels, currentDmId, currentUser, onDmSelect, onSignOut }: DmSidebarProps) {
  return (
    <div className="w-60 bg-sidebar flex flex-col shrink-0">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-divider shadow-sm shrink-0">
        <h2 className="text-text-primary font-semibold text-sm">Direct Messages</h2>
      </div>

      {/* DM list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {dmChannels.length === 0 ? (
          <p className="text-text-muted text-xs px-2 py-2">No conversations yet.<br />Click a member to start one.</p>
        ) : (
          dmChannels.map((dm) => {
            const other = dm.participants[0];
            if (!other) return null;
            const name = other.display_name || other.username;
            return (
              <button
                key={dm.id}
                onClick={() => onDmSelect(dm.id)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded transition-colors ${
                  dm.id === currentDmId
                    ? "bg-msg-hover text-text-primary"
                    : "text-text-muted hover:bg-msg-hover hover:text-text-secondary"
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar src={other.avatar_url} name={name} size={32} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-sidebar rounded-full flex items-center justify-center">
                    <StatusIndicator status={other.status ?? "offline"} size={10} />
                  </span>
                </div>
                <span className="text-sm truncate">{name}</span>
              </button>
            );
          })
        )}
      </div>

      {/* User panel */}
      <div className="h-14 bg-overlay px-2 flex items-center gap-2 shrink-0">
        <div className="relative">
          <Avatar src={currentUser.avatar_url} name={currentUser.display_name || currentUser.username} size={32} />
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
