import { format, isToday, isYesterday, isSameDay } from "date-fns";
import type { Message } from "../types";

/** Format a message timestamp for display */
export function formatTimestamp(iso: string, compact: boolean): string {
  const date = new Date(iso);
  if (compact) return format(date, "h:mm a");
  if (isToday(date)) return `Today at ${format(date, "h:mm a")}`;
  if (isYesterday(date)) return `Yesterday at ${format(date, "h:mm a")}`;
  return format(date, "MM/dd/yyyy h:mm a");
}

/** Format a date label for message separators: "Today", "Yesterday", or "March 15, 2024" */
export function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

/** Returns true when msg and prev are on different calendar days */
export function isDifferentDay(msg: Message, prev: Message | undefined): boolean {
  if (!prev) return false;
  return !isSameDay(new Date(msg.created_at), new Date(prev.created_at));
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
