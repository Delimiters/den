import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Avatar } from "../ui/Avatar";
import type { Message as MessageType } from "../../types";
import { formatTimestamp } from "../../utils/message";

interface MessageProps {
  message: MessageType;
  compact?: boolean;
  currentUserId?: string;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
}

export function Message({ message, compact = false, currentUserId, onEdit, onDelete }: MessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const author = message.author;
  const displayName = author?.display_name || author?.username || "Unknown";
  const isOwn = currentUserId === message.author_id;
  const canModify = isOwn && (onEdit || onDelete);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }
  }, [isEditing]);

  // Keep editContent in sync if message updates externally
  useEffect(() => {
    if (!isEditing) setEditContent(message.content);
  }, [message.content, isEditing]);

  function startEdit() {
    setEditContent(message.content);
    setIsEditing(true);
  }

  function cancelEdit() {
    setEditContent(message.content);
    setIsEditing(false);
  }

  function submitEdit() {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit?.(message.id, trimmed);
    }
    setIsEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitEdit();
    }
    if (e.key === "Escape") {
      cancelEdit();
    }
  }

  const contentBlock = isEditing ? (
    <div className="flex flex-col gap-1">
      <textarea
        ref={textareaRef}
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="bg-input-bg text-text-primary rounded px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-accent w-full"
        rows={1}
        style={{ minHeight: "2.25rem" }}
      />
      <p className="text-text-muted text-xs">
        Enter to save · Escape to cancel
      </p>
    </div>
  ) : (
    <p className="text-text-secondary text-sm leading-relaxed break-words">
      {message.content}
      {message.edited_at && (
        <span className="text-text-muted text-xs ml-1">(edited)</span>
      )}
    </p>
  );

  const actions = canModify && !isEditing ? (
    <div className="absolute right-2 top-0 -translate-y-1/2 hidden group-hover:flex items-center bg-overlay border border-divider rounded shadow-lg z-10">
      {onEdit && (
        <button
          onClick={startEdit}
          className="px-2 py-1 text-text-muted hover:text-text-primary hover:bg-msg-hover text-xs rounded-l transition-colors"
          title="Edit message"
        >
          ✏️
        </button>
      )}
      {onDelete && (
        <button
          onClick={() => onDelete(message.id)}
          className="px-2 py-1 text-text-muted hover:text-danger hover:bg-msg-hover text-xs rounded-r transition-colors"
          title="Delete message"
        >
          🗑️
        </button>
      )}
    </div>
  ) : null;

  if (compact) {
    return (
      <div className="group relative flex items-start gap-4 px-4 py-0.5 hover:bg-msg-hover">
        {actions}
        <span className="text-text-muted text-xs w-10 mt-0.5 text-right shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatTimestamp(message.created_at, true)}
        </span>
        <div className="min-w-0 flex-1">{contentBlock}</div>
      </div>
    );
  }

  return (
    <div className="group relative flex items-start gap-4 px-4 py-1 hover:bg-msg-hover">
      {actions}
      <Avatar
        src={author?.avatar_url}
        name={displayName}
        size={40}
        className="mt-0.5 cursor-pointer shrink-0"
      />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-text-primary text-sm font-semibold cursor-pointer hover:underline">
            {displayName}
          </span>
          <span className="text-text-muted text-xs">
            {formatTimestamp(message.created_at, false)}
          </span>
        </div>
        {contentBlock}
      </div>
    </div>
  );
}
