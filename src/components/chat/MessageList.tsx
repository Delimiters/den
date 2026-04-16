import { useEffect, useRef, useCallback } from "react";
import { Message } from "./Message";
import { useAppStore } from "../../stores/appStore";
import { supabase } from "../../lib/supabase";
import type { Message as MessageType } from "../../types";
import { shouldCompact } from "../../utils/message";

const PAGE_SIZE = 50;

interface MessageListProps {
  channelName: string;
  channelId?: string;
  currentUserId?: string;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

export function MessageList({ channelName, channelId, currentUserId, onEdit, onDelete, onReact }: MessageListProps) {
  const messages = useAppStore((s) => s.messages);
  const reactions = useAppStore((s) => s.reactions);
  const prependMessages = useAppStore((s) => s.prependMessages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLength = useRef(0);
  const loadingOlder = useRef(false);
  const hasMore = useRef(true);

  // Reset pagination state when channel changes
  useEffect(() => {
    hasMore.current = true;
    loadingOlder.current = false;
  }, [channelId]);

  // Scroll to bottom on new incoming messages; instant jump on initial load
  useEffect(() => {
    if (prevLength.current === 0 && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
    } else if (messages.length > prevLength.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLength.current = messages.length;
  }, [messages.length]);

  // Load older messages when user scrolls to top
  const handleScroll = useCallback(async () => {
    const el = scrollRef.current;
    if (!el || !channelId || loadingOlder.current || !hasMore.current) return;
    if (el.scrollTop > 100) return;

    loadingOlder.current = true;
    const oldest = messages[messages.length - 1]; // store is newest-first, so last = oldest
    if (!oldest) { loadingOlder.current = false; return; }

    const { data } = await supabase
      .from("messages")
      .select("*, author:users!author_id(*)")
      .eq("channel_id", channelId)
      .is("deleted_at", null)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (data && data.length > 0) {
      const prevScrollHeight = el.scrollHeight;
      prependMessages(data as MessageType[]);
      requestAnimationFrame(() => {
        el.scrollTop += el.scrollHeight - prevScrollHeight;
      });
      if (data.length < PAGE_SIZE) hasMore.current = false;
    } else {
      hasMore.current = false;
    }
    loadingOlder.current = false;
  }, [channelId, messages]);

  const ordered = [...messages].reverse();

  return (
    <div ref={scrollRef} className="flex-1 flex flex-col overflow-y-auto" onScroll={handleScroll}>
      <div className="px-4 pt-10 pb-4">
        <div className="w-16 h-16 rounded-full bg-sidebar flex items-center justify-center text-3xl mb-4">
          #
        </div>
        <h3 className="text-text-primary text-2xl font-bold">
          Welcome to #{channelName}!
        </h3>
        <p className="text-text-muted text-sm mt-1">
          This is the start of the #{channelName} channel.
        </p>
      </div>

      <div className="border-t border-divider mx-4 mb-4" />

      <div className="flex flex-col pb-4">
        {ordered.map((msg, i) => (
          <Message
            key={msg.id}
            message={msg}
            compact={shouldCompact(msg, ordered[i - 1])}
            currentUserId={currentUserId}
            reactions={reactions[msg.id]}
            onEdit={onEdit}
            onDelete={onDelete}
            onReact={onReact}
          />
        ))}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
