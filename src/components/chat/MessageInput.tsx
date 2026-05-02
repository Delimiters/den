import { useState, useRef, type KeyboardEvent, type DragEvent } from "react";
import { formatFileSize, isImage } from "../../utils/upload";
import { useAppStore } from "../../stores/appStore";
import { Avatar } from "../ui/Avatar";
import type { Message } from "../../types";

interface PendingFile {
  file: File;
  preview: string | null; // object URL for images
}

interface MessageInputProps {
  channelName: string;
  onSend: (content: string, files?: File[], replyToId?: string | null) => void;
  onEdit?: (messageId: string, content: string) => void;
  onTyping?: () => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

interface MentionState {
  query: string;
  startIndex: number;
}

export function MessageInput({ channelName, onSend, onEdit, onTyping, replyingTo, onCancelReply }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [mentionState, setMentionState] = useState<MentionState | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingOriginal, setEditingOriginal] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const members = useAppStore((s) => s.members);
  const messages = useAppStore((s) => s.messages);
  const currentUser = useAppStore((s) => s.currentUser);

  const mentionCandidates = mentionState
    ? members
        .filter((m) => m.user)
        .filter((m) => {
          const q = mentionState.query.toLowerCase();
          return (
            m.user!.username.toLowerCase().includes(q) ||
            (m.user!.display_name || "").toLowerCase().includes(q)
          );
        })
        .slice(0, 8)
    : [];

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).slice(0, 10); // max 10 files
    const newPending: PendingFile[] = arr.map((f) => ({
      file: f,
      preview: isImage(f.type) ? URL.createObjectURL(f) : null,
    }));
    setPending((p) => [...p, ...newPending]);
  }

  function removeFile(index: number) {
    setPending((p) => {
      const next = [...p];
      if (next[index].preview) URL.revokeObjectURL(next[index].preview!);
      next.splice(index, 1);
      return next;
    });
  }

  function handleContentChange(value: string, cursorPos: number) {
    setContent(value);
    onTyping?.();

    // Detect @mention: find last @ before cursor with only word chars after it
    const textUpToCursor = value.slice(0, cursorPos);
    const mentionMatch = textUpToCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionState({ query: mentionMatch[1], startIndex: mentionMatch.index! });
      setMentionIndex(0);
    } else {
      setMentionState(null);
    }
  }

  function completeMention(username: string) {
    if (!mentionState) return;
    const before = content.slice(0, mentionState.startIndex);
    const after = content.slice(mentionState.startIndex + 1 + mentionState.query.length);
    const newContent = `${before}@${username} ${after}`;
    setContent(newContent);
    setMentionState(null);
    // Restore focus and move cursor after the inserted mention
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const pos = before.length + username.length + 2; // @username + space
      el.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionState && mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        completeMention(mentionCandidates[mentionIndex].user!.username);
        return;
      }
      if (e.key === "Escape") {
        setMentionState(null);
        return;
      }
    }
    if (e.key === "ArrowUp" && !content && onEdit && currentUser && !editingMessageId) {
      const lastOwn = messages.find((m) => m.author_id === currentUser.id && !m.deleted_at);
      if (lastOwn) {
        e.preventDefault();
        setEditingMessageId(lastOwn.id);
        setEditingOriginal(lastOwn.content);
        setContent(lastOwn.content);
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (!el) return;
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        });
        return;
      }
    }
    if (e.key === "Escape" && editingMessageId) {
      cancelEdit();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setEditingOriginal("");
    setContent("");
    setMentionState(null);
  }

  function submit() {
    const trimmed = content.trim();
    if (editingMessageId) {
      if (trimmed && trimmed !== editingOriginal) onEdit?.(editingMessageId, trimmed);
      cancelEdit();
      return;
    }
    if (!trimmed && pending.length === 0) return;
    onSend(trimmed, pending.map((p) => p.file), replyingTo?.id ?? null);
    onCancelReply?.();
    setContent("");
    setMentionState(null);
    pending.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview); });
    setPending([]);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  const canSend = content.trim().length > 0 || pending.length > 0;

  return (
    <div
      className={`px-4 pb-6 pt-2 shrink-0 transition-colors ${dragging ? "bg-accent/10" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Edit mode indicator */}
      {editingMessageId && (
        <div className="flex items-center gap-2 bg-input-bg rounded-t-lg px-4 py-2 border-b border-divider/50 -mb-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-accent shrink-0">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
          <span className="text-accent text-xs font-medium">Editing message</span>
          <span className="text-text-muted text-xs truncate flex-1 italic">
            {editingOriginal.slice(0, 80)}{editingOriginal.length > 80 ? "…" : ""}
          </span>
          <button
            onClick={cancelEdit}
            className="text-text-muted hover:text-text-primary shrink-0 text-sm leading-none"
          >
            ✕
          </button>
        </div>
      )}
      {/* Reply context bar */}
      {replyingTo && (
        <div className="flex items-center gap-2 bg-input-bg rounded-t-lg px-4 py-2 border-b border-divider/50 -mb-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted shrink-0">
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
          </svg>
          <span className="text-text-muted text-xs">
            Replying to{" "}
            <span className="text-text-primary font-medium">
              {replyingTo.author?.display_name || replyingTo.author?.username || "Unknown"}
            </span>
          </span>
          <span className="text-text-muted text-xs truncate flex-1 italic">
            {replyingTo.content.slice(0, 80)}{replyingTo.content.length > 80 ? "…" : ""}
          </span>
          <button
            onClick={onCancelReply}
            className="text-text-muted hover:text-text-primary shrink-0 text-sm leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* File previews */}
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pending.map((p, i) => (
            <div key={i} className="relative group bg-overlay rounded-lg overflow-hidden border border-divider">
              {p.preview ? (
                <img src={p.preview} alt={p.file.name} className="w-20 h-20 object-cover" />
              ) : (
                <div className="w-32 h-16 flex flex-col items-center justify-center gap-1 px-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                  <p className="text-text-muted text-xs truncate w-full text-center">{p.file.name}</p>
                  <p className="text-text-muted text-xs">{formatFileSize(p.file.size)}</p>
                </div>
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={`bg-input-bg rounded-lg flex items-center gap-2 px-3 py-3 ${dragging ? "ring-2 ring-accent" : ""}`}>
        {/* Add button */}
        <button
          onClick={() => fileRef.current?.click()}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-text-muted hover:text-text-primary transition-colors shrink-0"
          title="Add attachment"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />

        <div className="flex-1 relative">
          {mentionState && mentionCandidates.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-overlay border border-divider rounded-lg shadow-xl overflow-hidden z-20">
              <p className="text-text-muted text-xs font-semibold px-3 pt-2 pb-1">Members</p>
              {mentionCandidates.map((m, i) => (
                <button
                  key={m.user!.id}
                  onMouseDown={(e) => { e.preventDefault(); completeMention(m.user!.username); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${i === mentionIndex ? "bg-accent/20" : "hover:bg-msg-hover"}`}
                >
                  <Avatar src={m.user!.avatar_url} name={m.user!.display_name || m.user!.username} size={16} />
                  <span className="text-text-primary text-sm font-medium">{m.user!.display_name || m.user!.username}</span>
                  <span className="text-text-muted text-xs">@{m.user!.username}</span>
                </button>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value, e.target.selectionStart)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channelName}`}
            rows={1}
            className="w-full bg-transparent text-text-primary text-base outline-none resize-none leading-relaxed max-h-48 placeholder:text-text-muted"
            style={{ lineHeight: "1.5rem" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.files);
              if (files.length > 0) { e.preventDefault(); addFiles(files); }
            }}
          />
        </div>

        <button
          onClick={submit}
          disabled={!canSend}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-accent hover:bg-accent/80 disabled:opacity-30 disabled:bg-white/10 disabled:hover:bg-white/10 transition-colors shrink-0"
          title="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {dragging && (
        <p className="text-accent text-xs text-center mt-1">Drop files to attach</p>
      )}
    </div>
  );
}
