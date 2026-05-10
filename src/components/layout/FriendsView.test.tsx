import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FriendsView } from "./FriendsView";
import type { Friendship, User } from "../../types";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
    })),
  },
}));

import { supabase } from "../../lib/supabase";

const alice: User = {
  id: "alice",
  username: "alice",
  display_name: "Alice",
  avatar_url: null,
  status: "online",
  created_at: "2025-01-01T00:00:00Z",
};

const bob: User = {
  id: "bob",
  username: "bob",
  display_name: "Bob",
  avatar_url: null,
  status: "offline",
  created_at: "2025-01-01T00:00:00Z",
};

function makeFriend(user: User): Friendship {
  return {
    id: `f-${user.id}`,
    requester_id: "me",
    addressee_id: user.id,
    status: "accepted",
    created_at: "2025-01-01T00:00:00Z",
    friend: user,
  };
}

function makePending(user: User, direction: "incoming" | "outgoing"): Friendship {
  return {
    id: `p-${user.id}`,
    requester_id: direction === "incoming" ? user.id : "me",
    addressee_id: direction === "incoming" ? "me" : user.id,
    status: "pending",
    created_at: "2025-01-01T00:00:00Z",
    friend: user,
  };
}

function renderFriends(overrides: Partial<Parameters<typeof FriendsView>[0]> = {}) {
  const props = {
    friends: [],
    incoming: [],
    outgoing: [],
    onlineUserIds: new Set<string>(),
    currentUserId: "me",
    onOpenDm: vi.fn(),
    onAccept: vi.fn(),
    onDecline: vi.fn(),
    onRemove: vi.fn(),
    onSendRequest: vi.fn().mockResolvedValue({ error: null }),
    initialTab: "online" as const,
    ...overrides,
  };
  return render(<FriendsView {...props} />);
}

describe("FriendsView — Online tab", () => {
  it("shows empty state when no online friends", () => {
    renderFriends();
    expect(screen.getByText(/All your friends are offline/)).toBeInTheDocument();
  });

  it("lists online friends", () => {
    renderFriends({
      friends: [makeFriend(alice)],
      onlineUserIds: new Set(["alice"]),
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});

describe("FriendsView — All tab", () => {
  it("shows online and offline sections when both exist", async () => {
    renderFriends({ friends: [makeFriend(alice), makeFriend(bob)], onlineUserIds: new Set(["alice"]) });
    await userEvent.click(screen.getByRole("button", { name: /^All/ }));
    expect(screen.getByText(/Online —/)).toBeInTheDocument();
    expect(screen.getByText(/Offline —/)).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("calls onOpenDm when Message button is clicked", async () => {
    const onOpenDm = vi.fn();
    renderFriends({ friends: [makeFriend(alice)], onlineUserIds: new Set(["alice"]), onOpenDm });
    await userEvent.click(screen.getByRole("button", { name: /^All/ }));
    await userEvent.click(screen.getByTitle("Message"));
    expect(onOpenDm).toHaveBeenCalledWith("alice");
  });
});

describe("FriendsView — Pending tab", () => {
  it("shows incoming requests", async () => {
    renderFriends({ incoming: [makePending(alice, "incoming")] });
    await userEvent.click(screen.getByRole("button", { name: /Pending/ }));
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText(/Incoming —/)).toBeInTheDocument();
  });

  it("shows outgoing requests", async () => {
    renderFriends({ outgoing: [makePending(bob, "outgoing")] });
    await userEvent.click(screen.getByRole("button", { name: /Pending/ }));
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText(/Outgoing —/)).toBeInTheDocument();
  });

  it("calls onAccept when ✓ is clicked on incoming", async () => {
    const onAccept = vi.fn();
    renderFriends({ incoming: [makePending(alice, "incoming")], onAccept });
    await userEvent.click(screen.getByRole("button", { name: /Pending/ }));
    await userEvent.click(screen.getByTitle("Accept"));
    expect(onAccept).toHaveBeenCalledWith(`p-${alice.id}`);
  });

  it("calls onDecline when ✗ is clicked on incoming", async () => {
    const onDecline = vi.fn();
    renderFriends({ incoming: [makePending(alice, "incoming")], onDecline });
    await userEvent.click(screen.getByRole("button", { name: /Pending/ }));
    await userEvent.click(screen.getByTitle("Decline"));
    expect(onDecline).toHaveBeenCalledWith(`p-${alice.id}`);
  });

  it("shows empty state when no pending requests", async () => {
    renderFriends();
    await userEvent.click(screen.getByRole("button", { name: /Pending/ }));
    expect(screen.getByText(/No pending requests/)).toBeInTheDocument();
  });
});

describe("FriendsView — Add Friend tab", () => {
  it("shows the search input", async () => {
    renderFriends({ initialTab: "add" });
    expect(screen.getByPlaceholderText("Search by username…")).toBeInTheDocument();
  });

  it("shows 'No users found' for an empty result", async () => {
    renderFriends({ initialTab: "add" });
    await userEvent.type(screen.getByPlaceholderText("Search by username…"), "zzz");
    await waitFor(() => expect(screen.getByText(/No users found/)).toBeInTheDocument());
  });

  it("shows user results from Supabase", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [alice] }),
    };
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    renderFriends({ initialTab: "add" });
    await userEvent.type(screen.getByPlaceholderText("Search by username…"), "alic");
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
  });
});
