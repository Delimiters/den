import { render, screen } from "@testing-library/react";
import { MessageList } from "./MessageList";
import { useAppStore } from "../../stores/appStore";
import type { Message, User } from "../../types";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
    })),
  },
}));

vi.mock("./LinkPreview", () => ({ LinkPreview: () => null }));

const author: User = {
  id: "u1",
  username: "alice",
  display_name: "Alice",
  avatar_url: null,
  status: "online",
  created_at: "2025-01-01T00:00:00Z",
};

function makeMessage(n: number): Message {
  return {
    id: `msg-${n}`,
    channel_id: "ch-1",
    author_id: "u1",
    content: `Message ${n}`,
    created_at: new Date(Date.now() - n * 60_000).toISOString(),
    edited_at: null,
    deleted_at: null,
    author,
  };
}

beforeEach(() => {
  useAppStore.setState({ messages: [], reactions: {} });
  Element.prototype.scrollIntoView = vi.fn();
});

describe("MessageList", () => {
  it("shows empty state when there are no messages", () => {
    render(<MessageList channelName="general" />);
    // No messages = just the scroll container with nothing in it
    expect(screen.queryByText(/Message/)).not.toBeInTheDocument();
  });

  it("renders messages from the store (newest first → displayed oldest first)", () => {
    // Store is newest-first; component reverses to show oldest at top
    useAppStore.setState({ messages: [makeMessage(1), makeMessage(2), makeMessage(3)] });
    render(<MessageList channelName="general" currentUserId="u1" />);
    expect(screen.getByText("Message 1")).toBeInTheDocument();
    expect(screen.getByText("Message 2")).toBeInTheDocument();
    expect(screen.getByText("Message 3")).toBeInTheDocument();
  });

  it("renders author names", () => {
    useAppStore.setState({ messages: [makeMessage(1)] });
    render(<MessageList channelName="general" currentUserId="u1" />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders typing indicator when users are typing", () => {
    useAppStore.setState({ messages: [] });
    render(<MessageList channelName="general" typingUsers={["Bob"]} />);
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  it("groups compact messages from the same author", () => {
    // Two consecutive messages from the same author within 5 mins — second should be compact
    const now = Date.now();
    const msgs: Message[] = [
      { ...makeMessage(1), created_at: new Date(now - 1000).toISOString() },
      { ...makeMessage(2), id: "msg-2b", created_at: new Date(now - 2000).toISOString() },
    ];
    // Store is newest-first, so msg[0] is most recent
    useAppStore.setState({ messages: msgs });
    render(<MessageList channelName="general" currentUserId="u1" />);
    // Both messages present
    expect(screen.getByText("Message 1")).toBeInTheDocument();
    expect(screen.getByText("Message 2")).toBeInTheDocument();
    // Only one author header (the compact one has no header)
    expect(screen.getAllByText("Alice")).toHaveLength(1);
  });

  it("inserts date separator between messages from different days", () => {
    const msgs: Message[] = [
      { ...makeMessage(1), created_at: new Date().toISOString() },
      { ...makeMessage(2), id: "msg-old", created_at: new Date("2020-01-01").toISOString() },
    ];
    // Store is newest-first: today's msg then 2020 msg
    // Rendered oldest-first: 2020 msg → today's msg
    // Separator "Today" appears before today's msg (different day from 2020)
    useAppStore.setState({ messages: msgs });
    render(<MessageList channelName="general" currentUserId="u1" />);
    expect(screen.getByText("Today")).toBeInTheDocument();
  });
});
