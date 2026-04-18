import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Avatar } from "../ui/Avatar";
import { UserPopover } from "../ui/UserPopover";
import type { Message as MessageType, MessageReaction } from "../../types";
import { formatTimestamp } from "../../utils/message";
import { MessageContent } from "../../utils/markdown";
import { isImage, isVideo, formatFileSize } from "../../utils/upload";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "😡"];

interface MessageProps {
  message: MessageType;
  compact?: boolean;
  currentUserId?: string;
  reactions?: MessageReaction[];
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onOpenDm?: (userId: string) => void;
}

export function Message({
  message,
  compact = false,
  currentUserId,
  reactions = [],
  onEdit,
  onDelete,
  onReact,
  onOpenDm,
}: MessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showPicker, setShowPicker] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  function openProfile(e: React.MouseEvent) {
    e.stopPropagation();
    setPopoverAnchor(e.currentTarget.getBoundingClientRect());
  }

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
        <MessageContent content={message.content} />
        {message.edited_at && (
          <span className="text-text-muted text-xs ml-1">(edited)</span>
        )}
      </p>
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-col gap-2 mt-2 max-w-md">
          {message.attachments.map((att) =>
            isImage(att.content_type) ? (
              <img
                key={att.id}
                src={att.file_url}
                alt={att.file_name}
                className="rounded max-h-80 max-w-full object-contain cursor-pointer"
              />
            ) : isVideo(att.content_type) ? (
              <video
                key={att.id}
                src={att.file_url}
                controls
                className="rounded max-h-80 max-w-full"
              />
            ) : (
              <a
                key={att.id}
                href={att.file_url}
                download={att.file_name}
                className="flex items-center gap-3 bg-overlay border border-divider rounded p-3 hover:bg-msg-hover transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted shrink-0">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-text-primary text-sm truncate">{att.file_name}</p>
                  <p className="text-text-muted text-xs">{formatFileSize(att.file_size)}</p>
                </div>
              </a>
            )
          )}
        </div>
      )}
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
    <div className="absolute right-4 -top-5 hidden group-hover:flex items-center bg-overlay border border-divider rounded-lg shadow-xl z-10 overflow-visible">
      {/* Quick reaction emojis shown directly */}
      {onReact && QUICK_EMOJIS.slice(0, 3).map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(message.id, emoji)}
          className="w-9 h-9 flex items-center justify-center hover:bg-msg-hover text-xl transition-colors first:rounded-l-lg"
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}

      {/* More reactions picker */}
      {onReact && (
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker((p) => !p)}
            className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-msg-hover transition-colors"
            title="Add reaction"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 13.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2.5-6H14V7.5h-1.5V9.5h-2V7.5H9V9.5H6.5v1.5H9v2h1.5v-2h2v2H14v-2h2.5V9.5z"/>
            </svg>
          </button>
          {showPicker && (
            <div className="absolute right-0 top-full mt-1 bg-overlay border border-divider rounded-lg shadow-xl p-2 flex gap-1 z-20">
              {QUICK_EMOJIS.slice(3).map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onReact(message.id, emoji); setShowPicker(false); }}
                  className="w-9 h-9 flex items-center justify-center rounded hover:bg-msg-hover text-xl transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Divider before message actions */}
      {(isOwn && (onEdit || onDelete)) && (
        <div className="w-px h-5 bg-divider mx-0.5" />
      )}

      {/* Edit */}
      {isOwn && onEdit && (
        <button
          onClick={startEdit}
          className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-msg-hover transition-colors"
          title="Edit message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
      )}

      {/* Delete */}
      {isOwn && onDelete && (
        <button
          onClick={() => onDelete(message.id)}
          className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-danger hover:bg-msg-hover transition-colors last:rounded-r-lg"
          title="Delete message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      )}
    </div>
  ) : null;

  if (compact) {
    return (
      <div className="group relative flex items-start gap-4 px-4 py-0.5 hover:bg-msg-hover">
        {actions}
        <span className="text-text-muted text-xs w-10 mt-0.5 text-right shrink-0 opacity-0 group-hover:opacity-100 transition-opacity leading-relaxed">
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
        onClick={openProfile}
      />
      {popoverAnchor && author && (
        <UserPopover
          user={author}
          anchorRect={popoverAnchor}
          onClose={() => setPopoverAnchor(null)}
          onOpenDm={onOpenDm && author.id !== currentUserId ? () => onOpenDm(author.id) : undefined}
        />
      )}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span
            onClick={openProfile}
            className="text-text-primary text-sm font-semibold cursor-pointer hover:underline"
          >
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
