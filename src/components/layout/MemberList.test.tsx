import { render, screen, waitFor } from "@testing-library/react";
import { MemberList } from "./MemberList";

const members = [
  {
    user_id: "user-1",
    guild_id: "guild-1",
    joined_at: new Date().toISOString(),
    nickname: null,
    user: { id: "user-1", username: "alice", display_name: "Alice", avatar_url: null },
  },
  {
    user_id: "user-2",
    guild_id: "guild-1",
    joined_at: new Date().toISOString(),
    nickname: null,
    user: { id: "user-2", username: "bob", display_name: "Bob", avatar_url: null },
  },
];

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: members }) }),
    }),
  },
}));

describe("MemberList", () => {
  it("shows current user as online regardless of onlineUserIds", async () => {
    render(<MemberList guildId="guild-1" currentUserId="user-1" onlineUserIds={new Set()} />);

    await waitFor(() => {
      expect(screen.getByText("Online — 1")).toBeInTheDocument();
      expect(screen.getByText("Offline — 1")).toBeInTheDocument();
    });
  });

  it("shows other users as online when their id is in onlineUserIds", async () => {
    render(
      <MemberList
        guildId="guild-1"
        currentUserId="user-1"
        onlineUserIds={new Set(["user-2"])}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Online — 2")).toBeInTheDocument();
    });
  });

  it("shows all offline when no currentUserId and empty onlineUserIds", async () => {
    render(<MemberList guildId="guild-1" onlineUserIds={new Set()} />);

    await waitFor(() => {
      expect(screen.getByText("Offline — 2")).toBeInTheDocument();
    });
  });

  it("renders nothing when guildId is null", () => {
    render(<MemberList guildId={null} />);
    expect(screen.queryByText(/online/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });
});
