import { useAppStore } from "./appStore";
import type { Guild, Channel, Message, User } from "../types";

const user: User = {
  id: "user-1",
  username: "jake",
  display_name: "Jake",
  avatar_url: null,
  status: "online",
  created_at: "2025-01-01T00:00:00Z",
};

const guild: Guild = {
  id: "guild-1",
  name: "My Server",
  icon_url: null,
  owner_id: "user-1",
  invite_code: "abc123",
  created_at: "2025-01-01T00:00:00Z",
};

const channel: Channel = {
  id: "ch-1",
  guild_id: "guild-1",
  name: "general",
  type: "text",
  position: 0,
  parent_id: null,
};

const message: Message = {
  id: "msg-1",
  channel_id: "ch-1",
  author_id: "user-1",
  content: "hello",
  created_at: "2025-01-01T10:00:00Z",
  edited_at: null,
  deleted_at: null,
};

beforeEach(() => {
  useAppStore.setState({
    currentUser: null,
    currentGuildId: null,
    currentChannelId: null,
    guilds: [],
    channels: [],
    messages: [],
    members: [],
    reactions: {},
  });
});

describe("setCurrentUser", () => {
  it("sets and clears the current user", () => {
    useAppStore.getState().setCurrentUser(user);
    expect(useAppStore.getState().currentUser).toEqual(user);
    useAppStore.getState().setCurrentUser(null);
    expect(useAppStore.getState().currentUser).toBeNull();
  });
});

describe("setCurrentGuild", () => {
  it("sets the guild id", () => {
    useAppStore.getState().setCurrentGuild("guild-1");
    expect(useAppStore.getState().currentGuildId).toBe("guild-1");
  });

  it("clears channelId, messages, members, and reactions when guild changes", () => {
    useAppStore.setState({
      currentChannelId: "ch-1",
      messages: [message],
      members: [{ guild_id: "guild-1", user_id: "user-1", joined_at: "", nickname: null }],
      reactions: { "msg-1": [{ message_id: "msg-1", user_id: "user-1", emoji: "👍" }] },
    });
    useAppStore.getState().setCurrentGuild("guild-2");
    const { currentChannelId, messages, members, reactions } = useAppStore.getState();
    expect(currentChannelId).toBeNull();
    expect(messages).toHaveLength(0);
    expect(members).toHaveLength(0);
    expect(reactions).toEqual({});
  });
});

describe("setCurrentChannel", () => {
  it("clears messages and reactions when channel changes", () => {
    useAppStore.setState({
      messages: [message],
      reactions: { "msg-1": [{ message_id: "msg-1", user_id: "user-1", emoji: "👍" }] },
    });
    useAppStore.getState().setCurrentChannel("ch-2");
    expect(useAppStore.getState().messages).toHaveLength(0);
    expect(useAppStore.getState().reactions).toEqual({});
  });
});

describe("setGuilds / setChannels", () => {
  it("replaces guilds", () => {
    useAppStore.getState().setGuilds([guild]);
    expect(useAppStore.getState().guilds).toEqual([guild]);
  });
  it("replaces channels", () => {
    useAppStore.getState().setChannels([channel]);
    expect(useAppStore.getState().channels).toEqual([channel]);
  });
});

describe("message mutations", () => {
  it("appendMessage adds to the front (newest-first)", () => {
    const older: Message = { ...message, id: "msg-0" };
    const newer: Message = { ...message, id: "msg-1" };
    useAppStore.getState().setMessages([older]);
    useAppStore.getState().appendMessage(newer);
    expect(useAppStore.getState().messages[0].id).toBe("msg-1");
  });

  it("prependMessages appends older messages to end", () => {
    const recent: Message = { ...message, id: "msg-5" };
    useAppStore.getState().setMessages([recent]);
    useAppStore.getState().prependMessages([{ ...message, id: "msg-1" }]);
    expect(useAppStore.getState().messages[0].id).toBe("msg-5");
    expect(useAppStore.getState().messages[1].id).toBe("msg-1");
  });

  it("updateMessage patches a specific message", () => {
    useAppStore.getState().setMessages([message]);
    useAppStore.getState().updateMessage("msg-1", { content: "edited!" });
    expect(useAppStore.getState().messages[0].content).toBe("edited!");
  });

  it("removeMessage removes by id", () => {
    useAppStore.getState().setMessages([message, { ...message, id: "msg-2" }]);
    useAppStore.getState().removeMessage("msg-1");
    expect(useAppStore.getState().messages).toHaveLength(1);
    expect(useAppStore.getState().messages[0].id).toBe("msg-2");
  });
});

describe("voice state", () => {
  it("setVoiceChannel stores all three fields", () => {
    useAppStore.getState().setVoiceChannel("ch-1", "jwt-token", "wss://lk.cloud");
    const { voiceChannelId, voiceToken, voiceLivekitUrl } = useAppStore.getState();
    expect(voiceChannelId).toBe("ch-1");
    expect(voiceToken).toBe("jwt-token");
    expect(voiceLivekitUrl).toBe("wss://lk.cloud");
  });

  it("clearVoiceChannel nulls all voice fields", () => {
    useAppStore.setState({ voiceChannelId: "ch-1", voiceToken: "t", voiceLivekitUrl: "wss://x" });
    useAppStore.getState().clearVoiceChannel();
    expect(useAppStore.getState().voiceChannelId).toBeNull();
    expect(useAppStore.getState().voiceToken).toBeNull();
    expect(useAppStore.getState().voiceLivekitUrl).toBeNull();
  });
});

describe("reactions", () => {
  it("addReaction inserts a new reaction", () => {
    useAppStore.getState().addReaction({ message_id: "msg-1", user_id: "user-1", emoji: "👍" });
    expect(useAppStore.getState().reactions["msg-1"]).toHaveLength(1);
  });

  it("addReaction is idempotent (same user+emoji)", () => {
    useAppStore.getState().addReaction({ message_id: "msg-1", user_id: "user-1", emoji: "👍" });
    useAppStore.getState().addReaction({ message_id: "msg-1", user_id: "user-1", emoji: "👍" });
    expect(useAppStore.getState().reactions["msg-1"]).toHaveLength(1);
  });

  it("removeReaction removes the matching reaction", () => {
    useAppStore.setState({
      reactions: {
        "msg-1": [
          { message_id: "msg-1", user_id: "user-1", emoji: "👍" },
          { message_id: "msg-1", user_id: "user-2", emoji: "👍" },
        ],
      },
    });
    useAppStore.getState().removeReaction("msg-1", "user-1", "👍");
    expect(useAppStore.getState().reactions["msg-1"]).toHaveLength(1);
    expect(useAppStore.getState().reactions["msg-1"][0].user_id).toBe("user-2");
  });

  it("setMessageReactions replaces all reactions for a message", () => {
    useAppStore.getState().addReaction({ message_id: "msg-1", user_id: "user-1", emoji: "👍" });
    useAppStore.getState().setMessageReactions("msg-1", [
      { message_id: "msg-1", user_id: "user-2", emoji: "❤️" },
    ]);
    expect(useAppStore.getState().reactions["msg-1"]).toHaveLength(1);
    expect(useAppStore.getState().reactions["msg-1"][0].emoji).toBe("❤️");
  });
});
