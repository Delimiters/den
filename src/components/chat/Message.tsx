import { Avatar } from "../ui/Avatar";
import type { Message as MessageType } from "../../types";
import { formatTimestamp } from "../../utils/message";

interface MessageProps {
  message: MessageType;
  compact?: boolean;
}

export function Message({ message, compact = false }: MessageProps) {
  const author = message.author;
  const displayName = author?.display_name || author?.username || "Unknown";

  if (compact) {
    return (
      <div className="group flex items-start gap-4 px-4 py-0.5 hover:bg-msg-hover">
        <span className="text-text-muted text-xs w-10 mt-0.5 text-right shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatTimestamp(message.created_at, true)}
        </span>
        <p className="text-text-secondary text-sm leading-relaxed break-words min-w-0">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-4 px-4 py-1 hover:bg-msg-hover">
      <Avatar
        src={author?.avatar_url}
        name={displayName}
        size={40}
        className="mt-0.5 cursor-pointer"
      />
      <div className="flex flex-col min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-text-primary text-sm font-semibold cursor-pointer hover:underline">
            {displayName}
          </span>
          <span className="text-text-muted text-xs">
            {formatTimestamp(message.created_at, false)}
          </span>
        </div>
        <p className="text-text-secondary text-sm leading-relaxed break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
}
