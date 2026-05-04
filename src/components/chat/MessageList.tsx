import { useEffect, useRef, useCallback, useState } from "react";
import { Message } from "./Message";
import { useAppStore } from "../../stores/appStore";
import { supabase } from "../../lib/supabase";
import type { Message as MessageType } from "../../types";
import { shouldCompact, formatDateLabel, isDifferentDay } from "../../utils/message";

const PAGE_SIZE = 50;

interface MessageListProps {
  channelName: string;
  channelId?: string;
  isDm?: boolean;
  currentUserId?: string;
  currentUsername?: string;
  typingUsers?: string[];
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: MessageType) => void;
  onPin?: (messageId: string) => void;
  onOpenDm?: (userId: string) => void;
}

export function MessageList({ channelName, channelId, isDm = false, currentUserId, currentUsername, typingUsers = [], onEdit, onDelete, onReact, onReply, onPin, onOpenDm }: MessageListProps) {
  const messages = useAppStore((s) => s.messages);
  const reactions = useAppStore((s) => s.reactions);
  const prependMessages = useAppStore((s) => s.prependMessages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLength = useRef(0);
  const loadingOlder = useRef(false);
  const hasMore = useRef(true);
  const isNearBottom = useRef(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  // Reset pagination state when channel changes
  useEffect(() => {
    hasMore.current = true;
    loadingOlder.current = false;
    isNearBottom.current = true;
    prevLength.current = 0;
  }, [channelId]);

  // Scroll to bottom on initial load; only auto-scroll on new messages when near bottom
  useEffect(() => {
    if (prevLength.current === 0 && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
      isNearBottom.current = true;
    } else if (messages.length > prevLength.current && isNearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLength.current = messages.length;
  }, [messages.length]);

  // Load older messages when user scrolls to top; track whether we're scrolled up
  const handleScroll = useCallback(async () => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottom.current = distFromBottom < 100;
    setShowJumpToBottom(distFromBottom > 300);
    if (!channelId || loadingOlder.current || !hasMore.current) return;
    if (el.scrollTop > 100) return;

    loadingOlder.current = true;
    const oldest = messages[messages.length - 1]; // store is newest-first, so last = oldest
    if (!oldest) { loadingOlder.current = false; return; }

    let data: MessageType[] | null = null;

    if (isDm) {
      const { data: rows } = await supabase
        .from("dm_messages")
        .select("*, author:users!author_id(*), dm_attachments(*)")
        .eq("dm_channel_id", channelId)
        .is("deleted_at", null)
        .lt("created_at", oldest.created_at)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      data = rows
        ? rows.map((dm: any) => ({
            id: dm.id,
            channel_id: dm.dm_channel_id,
            author_id: dm.author_id,
            content: dm.content,
            created_at: dm.created_at,
            edited_at: dm.edited_at,
            deleted_at: dm.deleted_at,
            author: dm.author,
            attachments: dm.dm_attachments?.map((a: any) => ({
              id: a.id,
              message_id: a.dm_message_id,
              file_url: a.file_url,
              file_name: a.file_name,
              file_size: a.file_size,
              content_type: a.content_type,
            })),
          }))
        : null;
    } else {
      const { data: rows } = await supabase
        .from("messages")
        .select("*, author:users!author_id(*), attachments(*)")
        .eq("channel_id", channelId)
        .is("deleted_at", null)
        .lt("created_at", oldest.created_at)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      data = rows as MessageType[] | null;
    }

    if (data && data.length > 0) {
      const prevScrollHeight = el.scrollHeight;
      prependMessages(data);
      requestAnimationFrame(() => {
        el.scrollTop += el.scrollHeight - prevScrollHeight;
      });
      if (data.length < PAGE_SIZE) hasMore.current = false;
    } else {
      hasMore.current = false;
    }
    loadingOlder.current = false;
  }, [channelId, isDm, messages]);

  const ordered = [...messages].reverse();

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
    {showJumpToBottom && (
      <button
        onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-overlay border border-divider text-text-secondary hover:text-text-primary text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8z"/>
        </svg>
        Jump to bottom
      </button>
    )}
    <div ref={scrollRef} className="flex-1 flex flex-col overflow-y-auto" onScroll={handleScroll}>
      <div className="px-6 pt-10 pb-4">
        <div className="w-16 h-16 rounded-full bg-sidebar flex items-center justify-center text-3xl mb-4">
          {isDm ? "💬" : "#"}
        </div>
        {isDm ? (
          <>
            <h3 className="text-text-primary text-2xl font-bold">
              {channelName}
            </h3>
            <p className="text-text-muted text-base mt-1">
              This is the beginning of your conversation with {channelName}.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-text-primary text-2xl font-bold">
              Welcome to #{channelName}!
            </h3>
            <p className="text-text-muted text-base mt-1">
              This is the start of the #{channelName} channel.
            </p>
          </>
        )}
      </div>

      <div className="border-t border-divider mx-6 mb-4" />

      <div className="flex flex-col pb-4">
        {ordered.map((msg, i) => (
          <div key={msg.id}>
            {isDifferentDay(msg, ordered[i - 1]) && (
              <div className="flex items-center gap-3 px-4 my-3">
                <div className="flex-1 h-px bg-divider" />
                <span className="text-text-muted text-sm font-medium shrink-0">
                  {formatDateLabel(msg.created_at)}
                </span>
                <div className="flex-1 h-px bg-divider" />
              </div>
            )}
            <Message
              message={msg}
              compact={shouldCompact(msg, ordered[i - 1]) && !isDifferentDay(msg, ordered[i - 1])}
              currentUserId={currentUserId}
              currentUsername={currentUsername}
              reactions={reactions[msg.id]}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              onReply={onReply}
              onPin={onPin}
              onOpenDm={onOpenDm}
            />
          </div>
        ))}
      </div>

      {typingUsers.length > 0 && (
        <div className="px-6 py-1 text-text-muted text-sm flex items-center gap-1.5">
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 bg-text-muted rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing…`
              : typingUsers.length === 2
              ? `${typingUsers[0]} and ${typingUsers[1]} are typing…`
              : "Several people are typing…"}
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
    </div>
  );
}
