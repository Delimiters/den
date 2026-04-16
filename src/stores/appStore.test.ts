import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./appStore";
import type { Guild, Channel, Message, User } from "../types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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
};

// Reset store to a clean slate before each test
beforeEach(() => {
  useAppStore.setState({
    currentUser: null,
    currentGuildId: null,
    currentChannelId: null,
    guilds: [],
    channels: [],
    messages: [],
    members: [],
  });
});

// ─── Auth state ───────────────────────────────────────────────────────────────

describe("setCurrentUser", () => {
  it("sets and clears the current user", () => {
    useAppStore.getState().setCurrentUser(user);
    expect(useAppStore.getState().currentUser).toEqual(user);

    useAppStore.getState().setCurrentUser(null);
    expect(useAppStore.getState().currentUser).toBeNull();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("setCurrentGuild", () => {
  it("sets the guild id", () => {
    useAppStore.getState().setCurrentGuild("guild-1");
    expect(useAppStore.getState().currentGuildId).toBe("guild-1");
  });

  it("clears currentChannelId, messages, and members when guild changes", () => {
    // Pre-populate state
    useAppStore.setState({
      currentChannelId: "ch-1",
      messages: [message],
      members: [{ guild_id: "guild-1", user_id: "user-1", joined_at: "", nickname: null }],
    });

    useAppStore.getState().setCurrentGuild("guild-2");

    const { currentChannelId, messages, members } = useAppStore.getState();
    expect(currentChannelId).toBeNull();
    expect(messages).toHaveLength(0);
    expect(members).toHaveLength(0);
  });
});

describe("setCurrentChannel", () => {
  it("sets the channel id", () => {
    useAppStore.getState().setCurrentChannel("ch-1");
    expect(useAppStore.getState().currentChannelId).toBe("ch-1");
  });

  it("clears messages when channel changes", () => {
    useAppStore.setState({ messages: [message] });
    useAppStore.getState().setCurrentChannel("ch-2");
    expect(useAppStore.getState().messages).toHaveLength(0);
  });
});

// ─── Data mutations ───────────────────────────────────────────────────────────

describe("setGuilds", () => {
  it("replaces the guilds array", () => {
    useAppStore.getState().setGuilds([guild]);
    expect(useAppStore.getState().guilds).toEqual([guild]);
  });
});

describe("setChannels", () => {
  it("replaces the channels array", () => {
    useAppStore.getState().setChannels([channel]);
    expect(useAppStore.getState().channels).toEqual([channel]);
  });
});

describe("setMessages / appendMessage / prependMessages", () => {
  it("setMessages replaces messages array", () => {
    useAppStore.getState().setMessages([message]);
    expect(useAppStore.getState().messages).toHaveLength(1);
  });

  it("appendMessage adds to the front (newest-first order)", () => {
    const older: Message = { ...message, id: "msg-0", content: "older" };
    const newer: Message = { ...message, id: "msg-1", content: "newer" };

    useAppStore.getState().setMessages([older]);
    useAppStore.getState().appendMessage(newer);

    const { messages } = useAppStore.getState();
    expect(messages[0].id).toBe("msg-1"); // newest at front
    expect(messages[1].id).toBe("msg-0");
  });

  it("prependMessages appends older messages to the end (for pagination)", () => {
    const recent: Message = { ...message, id: "msg-5", content: "recent" };
    const old1: Message = { ...message, id: "msg-1", content: "old 1" };
    const old2: Message = { ...message, id: "msg-2", content: "old 2" };

    useAppStore.getState().setMessages([recent]);
    useAppStore.getState().prependMessages([old1, old2]);

    const { messages } = useAppStore.getState();
    expect(messages[0].id).toBe("msg-5"); // recent still at front
    expect(messages[1].id).toBe("msg-1");
    expect(messages[2].id).toBe("msg-2");
  });
});

describe("updateMessage", () => {
  it("updates a specific message by id", () => {
    useAppStore.getState().setMessages([message]);
    useAppStore.getState().updateMessage("msg-1", { content: "edited!" });
    expect(useAppStore.getState().messages[0].content).toBe("edited!");
  });

  it("leaves other messages unchanged", () => {
    const other: Message = { ...message, id: "msg-2", content: "other" };
    useAppStore.getState().setMessages([message, other]);
    useAppStore.getState().updateMessage("msg-1", { content: "changed" });
    expect(useAppStore.getState().messages[1].content).toBe("other");
  });
});
