import { useEffect, useRef } from "react";
import { Message } from "./Message";
import { useAppStore } from "../../stores/appStore";
import type { Message as MessageType } from "../../types";
import { shouldCompact } from "../../utils/message";

interface MessageListProps {
  channelName: string;
  currentUserId?: string;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

export function MessageList({ channelName, currentUserId, onEdit, onDelete, onReact }: MessageListProps) {
  const messages = useAppStore((s) => s.messages);
  const reactions = useAppStore((s) => s.reactions);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLength = useRef(0);

  useEffect(() => {
    if (messages.length > prevLength.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLength.current = messages.length;
  }, [messages.length]);

  const ordered = [...messages].reverse();

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
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
