import { render, screen } from "@testing-library/react";
import { ChannelSidebar } from "./ChannelSidebar";
import type { Channel, Guild, User } from "../../types";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({ data: [], error: null }) }) }) }),
  },
}));

vi.mock("./UserSettingsModal", () => ({
  UserSettingsModal: () => null,
}));

const guild: Guild = {
  id: "g1",
  name: "Test Server",
  icon_url: null,
  owner_id: "u1",
  invite_code: "abc",
  created_at: new Date().toISOString(),
};

const currentUser: User = {
  id: "u1",
  username: "alice",
  display_name: "Alice",
  avatar_url: null,
  status: "online",
  created_at: new Date().toISOString(),
};

const voiceChannel: Channel = {
  id: "ch-voice",
  guild_id: "g1",
  name: "general-voice",
  type: "voice",
  position: 1,
  parent_id: null,
};

const baseProps = {
  guild,
  channels: [voiceChannel],
  currentChannelId: null,
  currentUser,
  userStatus: "online" as const,
  unread: {},
  voicePresence: [
    { userId: "u1", channelId: "ch-voice", displayName: "Alice", avatarUrl: null },
    { userId: "u2", channelId: "ch-voice", displayName: "Bob", avatarUrl: null },
  ],
  onChannelSelect: vi.fn(),
  onChannelsRefresh: vi.fn(),
  onStatusChange: vi.fn(),
  onSignOut: vi.fn(),
};

describe("VoiceParticipantRow speaking indicator", () => {
  it("shows no speaking indicator when nobody is speaking", () => {
    render(<ChannelSidebar {...baseProps} speakingUserIds={new Set()} />);
    expect(screen.queryByTestId("speaking-indicator")).toBeNull();
  });

  it("shows speaking indicator on the speaking participant", () => {
    render(<ChannelSidebar {...baseProps} speakingUserIds={new Set(["u1"])} />);
    const indicators = screen.getAllByTestId("speaking-indicator");
    expect(indicators).toHaveLength(1);
  });

  it("shows speaking indicators on multiple speaking participants", () => {
    render(<ChannelSidebar {...baseProps} speakingUserIds={new Set(["u1", "u2"])} />);
    const indicators = screen.getAllByTestId("speaking-indicator");
    expect(indicators).toHaveLength(2);
  });

  it("updates when speaking state changes", () => {
    const { rerender } = render(<ChannelSidebar {...baseProps} speakingUserIds={new Set()} />);
    expect(screen.queryByTestId("speaking-indicator")).toBeNull();

    rerender(<ChannelSidebar {...baseProps} speakingUserIds={new Set(["u2"])} />);
    expect(screen.getAllByTestId("speaking-indicator")).toHaveLength(1);

    rerender(<ChannelSidebar {...baseProps} speakingUserIds={new Set()} />);
    expect(screen.queryByTestId("speaking-indicator")).toBeNull();
  });
});
