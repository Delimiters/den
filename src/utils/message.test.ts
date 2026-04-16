import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatTimestamp, shouldCompact } from "./message";
import type { Message } from "../types";

// ─── formatTimestamp ──────────────────────────────────────────────────────────

describe("formatTimestamp", () => {
  beforeEach(() => {
    // Fix "now" to a known date so tests don't break at midnight
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T14:30:00Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("compact mode returns only the time", () => {
    const result = formatTimestamp("2025-06-15T10:00:00Z", true);
    expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });

  it("full mode for today shows 'Today at HH:MM'", () => {
    const result = formatTimestamp("2025-06-15T10:00:00Z", false);
    expect(result).toMatch(/^Today at \d{1,2}:\d{2} (AM|PM)$/);
  });

  it("full mode for yesterday shows 'Yesterday at HH:MM'", () => {
    const result = formatTimestamp("2025-06-14T10:00:00Z", false);
    expect(result).toMatch(/^Yesterday at \d{1,2}:\d{2} (AM|PM)$/);
  });

  it("full mode for older dates shows MM/DD/YYYY", () => {
    const result = formatTimestamp("2025-01-01T10:00:00Z", false);
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}/);
  });
});

// ─── shouldCompact ────────────────────────────────────────────────────────────

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    channel_id: "ch-1",
    author_id: "user-1",
    content: "hello",
    created_at: "2025-06-15T10:00:00Z",
    edited_at: null,
    deleted_at: null,
    ...overrides,
  };
}

describe("shouldCompact", () => {
  it("returns false when there is no previous message", () => {
    expect(shouldCompact(makeMessage(), undefined)).toBe(false);
  });

  it("returns false when authors are different", () => {
    const prev = makeMessage({ author_id: "user-1" });
    const curr = makeMessage({ author_id: "user-2", created_at: "2025-06-15T10:01:00Z" });
    expect(shouldCompact(curr, prev)).toBe(false);
  });

  it("returns true when same author posts within 7 minutes", () => {
    const prev = makeMessage({ created_at: "2025-06-15T10:00:00Z" });
    const curr = makeMessage({ created_at: "2025-06-15T10:06:00Z" }); // 6 min later
    expect(shouldCompact(curr, prev)).toBe(true);
  });

  it("returns false when same author posts after 7 minutes", () => {
    const prev = makeMessage({ created_at: "2025-06-15T10:00:00Z" });
    const curr = makeMessage({ created_at: "2025-06-15T10:08:00Z" }); // 8 min later
    expect(shouldCompact(curr, prev)).toBe(false);
  });

  it("returns false exactly at the 7 minute boundary", () => {
    const prev = makeMessage({ created_at: "2025-06-15T10:00:00Z" });
    const curr = makeMessage({ created_at: "2025-06-15T10:07:00Z" }); // exactly 7 min
    expect(shouldCompact(curr, prev)).toBe(false);
  });
});
