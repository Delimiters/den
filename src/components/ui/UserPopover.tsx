import { useEffect, useRef } from "react";
import { Avatar } from "./Avatar";
import { StatusIndicator } from "./StatusIndicator";
import type { User } from "../../types";

interface UserPopoverProps {
  user: User;
  anchorRect: DOMRect;
  onClose: () => void;
  onOpenDm?: () => void;
}

export function UserPopover({ user, anchorRect, onClose, onOpenDm }: UserPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Position below the anchor, flip up if too close to bottom
  const top = anchorRect.bottom + 8;
  const left = anchorRect.left;
  const style: React.CSSProperties = {
    position: "fixed",
    top,
    left,
    zIndex: 50,
    maxWidth: "240px",
    minWidth: "200px",
  };

  const displayName = user.display_name || user.username;

  return (
    <div ref={ref} style={style} className="bg-overlay border border-divider rounded-lg shadow-2xl overflow-hidden">
      {/* Header band */}
      <div className="h-12 bg-accent/20" />
      <div className="px-4 pb-4 -mt-6">
        <div className="flex items-end justify-between mb-3">
          <div className="relative">
            <Avatar src={user.avatar_url} name={displayName} size={48} className="ring-4 ring-overlay" />
            <span className="absolute -bottom-0.5 -right-0.5">
              <StatusIndicator status={user.status} size={12} />
            </span>
          </div>
        </div>
        <p className="text-text-primary font-bold text-base leading-tight">{displayName}</p>
        {user.display_name && (
          <p className="text-text-muted text-xs mt-0.5">@{user.username}</p>
        )}
        <div className="mt-3 border-t border-divider pt-3 flex flex-col gap-1.5">
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wide">Status</p>
          <p className="text-text-secondary text-sm capitalize">{user.status}</p>
        </div>
        {onOpenDm && (
          <button
            onClick={() => { onOpenDm(); onClose(); }}
            className="mt-3 w-full bg-accent hover:bg-accent-hover text-white text-sm font-semibold py-1.5 rounded transition-colors"
          >
            Message
          </button>
        )}
      </div>
    </div>
  );
}
