import { format, isToday, isYesterday } from "date-fns";
import type { Message } from "../types";

/** Format a message timestamp for display */
export function formatTimestamp(iso: string, compact: boolean): string {
  const date = new Date(iso);
  if (compact) return format(date, "h:mm a");
  if (isToday(date)) return `Today at ${format(date, "h:mm a")}`;
  if (isYesterday(date)) return `Yesterday at ${format(date, "h:mm a")}`;
  return format(date, "MM/dd/yyyy h:mm a");
}

/**
 * Whether a message should render in compact mode (no avatar/header).
 * True when same author posted within 7 minutes of the previous message.
 */
export function shouldCompact(
  msg: Message,
  prev: Message | undefined
): boolean {
  if (!prev) return false;
  if (msg.author_id !== prev.author_id) return false;
  const diffMs =
    new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime();
  return diffMs < 7 * 60 * 1000;
}
