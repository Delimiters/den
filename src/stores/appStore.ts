import { create } from "zustand";
import type { Guild, Channel, Message, User, GuildMember, MessageReaction, DmChannel, CustomEmoji } from "../types";

interface AppStore {
  // Auth
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Navigation
  viewMode: "guild" | "dm";
  currentGuildId: string | null;
  currentChannelId: string | null;
  currentDmId: string | null;
  setViewMode: (mode: "guild" | "dm") => void;
  setCurrentGuild: (guildId: string | null) => void;
  setCurrentChannel: (channelId: string | null) => void;
  setCurrentDm: (dmId: string | null) => void;

  // Data
  guilds: Guild[];
  channels: Channel[];
  messages: Message[];
  members: GuildMember[];
  dmChannels: DmChannel[];
  customEmojis: CustomEmoji[];

  setGuilds: (guilds: Guild[]) => void;
  setChannels: (channels: Channel[]) => void;
  setCustomEmojis: (emojis: CustomEmoji[]) => void;
  setMessages: (messages: Message[]) => void;
  prependMessages: (messages: Message[]) => void;
  appendMessage: (message: Message) => void;
  updateMessage: (id: string, partial: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  setMembers: (members: GuildMember[]) => void;
  setDmChannels: (dms: DmChannel[]) => void;
  upsertDmChannel: (dm: DmChannel) => void;

  // Unread: channelIds with unread messages
  unread: Record<string, true>;
  markUnread: (channelId: string) => void;
  markRead: (channelId: string) => void;

  // Typing: channelId → set of usernames currently typing
  typing: Record<string, string[]>;
  setTyping: (channelId: string, usernames: string[]) => void;

  // Reactions: messageId → reactions
  reactions: Record<string, MessageReaction[]>;
  setMessageReactions: (messageId: string, reactions: MessageReaction[]) => void;
  addReaction: (reaction: MessageReaction) => void;
  removeReaction: (messageId: string, userId: string, emoji: string) => void;
  clearReactions: () => void;

  // Voice
  voiceChannelId: string | null;
  voiceToken: string | null;
  voiceLivekitUrl: string | null;
  setVoiceChannel: (channelId: string, token: string, url: string) => void;
  clearVoiceChannel: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  viewMode: "guild",
  currentGuildId: null,
  currentChannelId: null,
  currentDmId: null,
  setViewMode: (mode) => set({ viewMode: mode, messages: [], reactions: {} }),
  setCurrentGuild: (guildId) =>
    set((s) => {
      // No-op if already viewing this guild in guild mode — prevents StrictMode double-fire clearing channels
      if (s.currentGuildId === guildId && s.viewMode === "guild") return s;
      return { viewMode: "guild", currentGuildId: guildId, currentChannelId: null, channels: [], messages: [], members: [], reactions: {}, customEmojis: [] };
    }),
  setCurrentChannel: (channelId) =>
    set((s) => {
      const unread = { ...s.unread };
      if (channelId) delete unread[channelId];
      return { currentChannelId: channelId, messages: [], reactions: {}, unread };
    }),
  setCurrentDm: (dmId) =>
    set((s) => {
      const unread = { ...s.unread };
      if (dmId) delete unread[dmId];
      return { viewMode: "dm", currentDmId: dmId, messages: [], reactions: {}, unread };
    }),

  guilds: [],
  channels: [],
  messages: [],
  members: [],
  dmChannels: [],
  customEmojis: [],

  setGuilds: (guilds) => set({ guilds }),
  setChannels: (channels) => set({ channels }),
  setCustomEmojis: (customEmojis) => set({ customEmojis }),
  setMessages: (messages) => set({ messages }),
  prependMessages: (older) =>
    set((s) => ({ messages: [...s.messages, ...older] })),
  appendMessage: (message) =>
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === message.id);
      if (idx === -1) return { messages: [message, ...s.messages] };
      // Replace optimistic insert (no author) with realtime echo (has author)
      if (!s.messages[idx].author && message.author) {
        const next = [...s.messages];
        next[idx] = message;
        return { messages: next };
      }
      return s;
    }),
  updateMessage: (id, partial) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    })),
  removeMessage: (id) =>
    set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
  setMembers: (members) => set({ members }),
  setDmChannels: (dmChannels) => set({ dmChannels }),
  upsertDmChannel: (dm) =>
    set((s) => {
      const exists = s.dmChannels.find((d) => d.id === dm.id);
      if (exists) return { dmChannels: s.dmChannels.map((d) => d.id === dm.id ? dm : d) };
      return { dmChannels: [dm, ...s.dmChannels] };
    }),

  unread: {},
  markUnread: (channelId) =>
    set((s) => ({ unread: { ...s.unread, [channelId]: true } })),
  markRead: (channelId) =>
    set((s) => { const u = { ...s.unread }; delete u[channelId]; return { unread: u }; }),

  typing: {},
  setTyping: (channelId, usernames) =>
    set((s) => ({ typing: { ...s.typing, [channelId]: usernames } })),

  reactions: {},
  setMessageReactions: (messageId, reactions) =>
    set((s) => ({ reactions: { ...s.reactions, [messageId]: reactions } })),
  addReaction: (reaction) =>
    set((s) => {
      const existing = s.reactions[reaction.message_id] ?? [];
      const alreadyExists = existing.some(
        (r) => r.user_id === reaction.user_id && r.emoji === reaction.emoji
      );
      if (alreadyExists) return s;
      return { reactions: { ...s.reactions, [reaction.message_id]: [...existing, reaction] } };
    }),
  removeReaction: (messageId, userId, emoji) =>
    set((s) => ({
      reactions: {
        ...s.reactions,
        [messageId]: (s.reactions[messageId] ?? []).filter(
          (r) => !(r.user_id === userId && r.emoji === emoji)
        ),
      },
    })),
  clearReactions: () => set({ reactions: {} }),

  voiceChannelId: null,
  voiceToken: null,
  voiceLivekitUrl: null,
  setVoiceChannel: (channelId, token, url) =>
    set({ voiceChannelId: channelId, voiceToken: token, voiceLivekitUrl: url }),
  clearVoiceChannel: () =>
    set({ voiceChannelId: null, voiceToken: null, voiceLivekitUrl: null }),
}));
