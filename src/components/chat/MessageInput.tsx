import { useState, type KeyboardEvent } from "react";

interface MessageInputProps {
  channelName: string;
  onSend: (content: string) => void;
}

export function MessageInput({ channelName, onSend }: MessageInputProps) {
  const [content, setContent] = useState("");

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setContent("");
  }

  return (
    <div className="px-4 pb-6 pt-2 shrink-0">
      <div className="bg-input-bg rounded-lg flex items-end gap-2 px-4 py-2.5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          rows={1}
          className="flex-1 bg-transparent text-text-primary text-base outline-none resize-none leading-relaxed max-h-48 placeholder:text-text-muted"
          style={{ lineHeight: "1.5rem" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }}
        />
        <button
          onClick={submit}
          disabled={!content.trim()}
          className="text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors pb-0.5"
          title="Send message"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
