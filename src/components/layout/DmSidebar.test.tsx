import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DmSidebar } from "./DmSidebar";
import type { Friendship, DmChannel, User } from "../../types";

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

const currentUser: User = {
  id: "me",
  username: "jake",
  display_name: "Jake",
  avatar_url: null,
  status: "online",
  created_at: "2025-01-01T00:00:00Z",
};

const alice: User = {
  id: "alice",
  username: "alice",
  display_name: "Alice",
  avatar_url: null,
  status: "online",
  created_at: "2025-01-01T00:00:00Z",
};

const friendAlice: Friendship = {
  id: "f1",
  requester_id: "me",
  addressee_id: "alice",
  status: "accepted",
  created_at: "2025-01-01T00:00:00Z",
  friend: alice,
};

const dmWithAlice: DmChannel = {
  id: "dm1",
  participants: [alice],
  created_at: "2025-01-01T00:00:00Z",
};

function renderSidebar(overrides: Partial<Parameters<typeof DmSidebar>[0]> = {}) {
  const props = {
    dmChannels: [],
    currentDmId: null,
    currentUser,
    userStatus: "online" as const,
    unread: {},
    friends: [],
    onlineUserIds: new Set<string>(),
    activeTab: "messages" as const,
    onTabChange: vi.fn(),
    onDmSelect: vi.fn(),
    onOpenDm: vi.fn(),
    onStatusChange: vi.fn(),
    onSignOut: vi.fn(),
    ...overrides,
  };
  return render(<DmSidebar {...props} />);
}

describe("DmSidebar — messages tab", () => {
  it("shows empty state when no DMs exist", () => {
    renderSidebar();
    expect(screen.getByText(/No conversations yet/)).toBeInTheDocument();
  });

  it("renders DM channel with participant name", () => {
    renderSidebar({ dmChannels: [dmWithAlice] });
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("calls onDmSelect when a DM is clicked", async () => {
    const onDmSelect = vi.fn();
    renderSidebar({ dmChannels: [dmWithAlice], onDmSelect });
    await userEvent.click(screen.getByText("Alice"));
    expect(onDmSelect).toHaveBeenCalledWith("dm1");
  });

  it("shows unread indicator for channels with unread messages", () => {
    renderSidebar({ dmChannels: [dmWithAlice], unread: { dm1: true } });
    // Unread channel name gets bold/primary styling — dot should be visible
    const dot = document.querySelector(".w-2.h-2.bg-white.rounded-full");
    expect(dot).toBeTruthy();
  });
});

describe("DmSidebar — tab switching", () => {
  it("calls onTabChange when Friends tab is clicked", async () => {
    const onTabChange = vi.fn();
    renderSidebar({ onTabChange });
    await userEvent.click(screen.getByRole("button", { name: "Friends" }));
    expect(onTabChange).toHaveBeenCalledWith("friends");
  });

  it("calls onTabChange when Messages tab is clicked", async () => {
    const onTabChange = vi.fn();
    renderSidebar({ activeTab: "friends", onTabChange });
    await userEvent.click(screen.getByRole("button", { name: "Messages" }));
    expect(onTabChange).toHaveBeenCalledWith("messages");
  });
});

describe("DmSidebar — friends tab", () => {
  it("shows 'no friends' empty state", () => {
    renderSidebar({ activeTab: "friends" });
    expect(screen.getByText(/No friends yet/)).toBeInTheDocument();
  });

  it("renders online friend in friends tab", () => {
    renderSidebar({
      activeTab: "friends",
      friends: [friendAlice],
      onlineUserIds: new Set(["alice"]),
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText(/Online/)).toBeInTheDocument();
  });

  it("renders offline friend in friends tab", () => {
    renderSidebar({
      activeTab: "friends",
      friends: [{ ...friendAlice, friend: { ...alice, status: "offline" } }],
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
  });

  it("calls onOpenDm when a friend is clicked", async () => {
    const onOpenDm = vi.fn();
    renderSidebar({
      activeTab: "friends",
      friends: [friendAlice],
      onlineUserIds: new Set(["alice"]),
      onOpenDm,
    });
    await userEvent.click(screen.getByText("Alice"));
    expect(onOpenDm).toHaveBeenCalledWith("alice");
  });
});

describe("DmSidebar — user panel", () => {
  it("shows the current user's display name", () => {
    renderSidebar();
    expect(screen.getByText("Jake")).toBeInTheDocument();
  });

  it("calls onSignOut when sign out is clicked", async () => {
    const onSignOut = vi.fn();
    renderSidebar({ onSignOut });
    await userEvent.click(screen.getByTitle("Sign out"));
    expect(onSignOut).toHaveBeenCalled();
  });
});
