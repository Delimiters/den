import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Avatar } from "../ui/Avatar";
import type { Message as MessageType, MessageReaction } from "../../types";
import { formatTimestamp } from "../../utils/message";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "😡"];

interface MessageProps {
  message: MessageType;
  compact?: boolean;
  currentUserId?: string;
  reactions?: MessageReaction[];
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

export function Message({
  message,
  compact = false,
  currentUserId,
  reactions = [],
  onEdit,
  onDelete,
  onReact,
}: MessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showPicker, setShowPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const author = message.author;
  const displayName = author?.display_name || author?.username || "Unknown";
  const isOwn = currentUserId === message.author_id;

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) setEditContent(message.content);
  }, [message.content, isEditing]);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  function startEdit() { setEditContent(message.content); setIsEditing(true); }
  function cancelEdit() { setEditContent(message.content); setIsEditing(false); }

  function submitEdit() {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== message.content) onEdit?.(message.id, trimmed);
    setIsEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(); }
    if (e.key === "Escape") cancelEdit();
  }

  // Group reactions by emoji
  const reactionGroups = reactions.reduce<Record<string, { count: number; mine: boolean }>>(
    (acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
      acc[r.emoji].count++;
      if (r.user_id === currentUserId) acc[r.emoji].mine = true;
      return acc;
    },
    {}
  );

  const contentBlock = isEditing ? (
    <div className="flex flex-col gap-1">
      <textarea
        ref={textareaRef}
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="bg-input-bg text-text-primary rounded px-3 py-2 text-base resize-none outline-none focus:ring-2 focus:ring-accent w-full"
        rows={1}
        style={{ minHeight: "2.25rem" }}
      />
      <p className="text-text-muted text-xs">Enter to save · Escape to cancel</p>
    </div>
  ) : (
    <>
      <p className="text-text-secondary text-base leading-relaxed break-words">
        {message.content}
        {message.edited_at && (
          <span className="text-text-muted text-xs ml-1">(edited)</span>
        )}
      </p>
      {Object.keys(reactionGroups).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {Object.entries(reactionGroups).map(([emoji, { count, mine }]) => (
            <button
              key={emoji}
              onClick={() => onReact?.(message.id, emoji)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm border transition-colors ${
                mine
                  ? "bg-accent/25 border-accent text-text-primary"
                  : "bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 hover:border-white/20"
              }`}
            >
              <span className="text-base leading-none">{emoji}</span>
              <span className="text-xs font-medium">{count}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );

  const actions = !isEditing ? (
    <div className="absolute right-4 -top-4 hidden group-hover:flex items-center bg-overlay border border-divider rounded shadow-lg z-10">
      {onReact && (
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker((p) => !p)}
            className="px-2 py-1 text-text-muted hover:text-text-primary hover:bg-msg-hover text-xs transition-colors"
            title="Add reaction"
          >
            😄
          </button>
          {showPicker && (
            <div className="absolute right-0 top-full mt-1 bg-overlay border border-divider rounded shadow-xl p-2 flex gap-1 z-20">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onReact(message.id, emoji); setShowPicker(false); }}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-msg-hover text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {isOwn && onEdit && (
        <button
          onClick={startEdit}
          className="px-2 py-1 text-text-muted hover:text-text-primary hover:bg-msg-hover text-xs transition-colors"
          title="Edit message"
        >
          ✏️
        </button>
      )}
      {isOwn && onDelete && (
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
        <span className="text-text-muted text-xs w-14 mt-0.5 text-right shrink-0 opacity-0 group-hover:opacity-100 transition-opacity leading-relaxed">
          {formatTimestamp(message.created_at, true)}
        </span>
        <div className="min-w-0 flex-1">{contentBlock}</div>
      </div>
    );
  }

  return (
    <div className="group relative flex items-start gap-4 px-4 py-2 hover:bg-msg-hover mt-1">
      {actions}
      <Avatar
        src={author?.avatar_url}
        name={displayName}
        size={40}
        className="mt-0.5 cursor-pointer shrink-0"
      />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-baseline gap-2 mb-0.5">
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
