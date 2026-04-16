import { render, screen, waitFor } from "@testing-library/react";
import { MemberList } from "./MemberList";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: [
              {
                user_id: "user-1",
                guild_id: "guild-1",
                joined_at: new Date().toISOString(),
                nickname: null,
                user: {
                  id: "user-1",
                  username: "alice",
                  display_name: "Alice",
                  avatar_url: null,
                  presence: [{ status: "offline" }],
                },
              },
              {
                user_id: "user-2",
                guild_id: "guild-1",
                joined_at: new Date().toISOString(),
                nickname: null,
                user: {
                  id: "user-2",
                  username: "bob",
                  display_name: "Bob",
                  avatar_url: null,
                  presence: [{ status: "online" }],
                },
              },
            ],
          }),
      }),
    }),
    channel: () => ({
      on: function () { return this; },
      subscribe: () => ({ unsubscribe: vi.fn() }),
      unsubscribe: vi.fn(),
    }),
  },
}));

describe("MemberList", () => {
  it("shows current user as online regardless of DB presence status", async () => {
    render(<MemberList guildId="guild-1" currentUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText("Online — 2")).toBeInTheDocument();
    });
  });

  it("shows current user as offline when currentUserId is not provided", async () => {
    render(<MemberList guildId="guild-1" />);

    await waitFor(() => {
      // alice has offline status in DB and no currentUserId override → shows in offline group
      expect(screen.getByText("Offline — 1")).toBeInTheDocument();
      expect(screen.getByText("Online — 1")).toBeInTheDocument();
    });
  });

  it("renders nothing when guildId is null", () => {
    render(<MemberList guildId={null} />);
    expect(screen.queryByText(/online/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });
});
