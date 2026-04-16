import { create } from "zustand";
import type { Guild, Channel, Message, User, GuildMember, MessageReaction } from "../types";

interface AppStore {
  // Auth
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Navigation
  currentGuildId: string | null;
  currentChannelId: string | null;
  setCurrentGuild: (guildId: string | null) => void;
  setCurrentChannel: (channelId: string | null) => void;

  // Data
  guilds: Guild[];
  channels: Channel[];
  messages: Message[];
  members: GuildMember[];

  setGuilds: (guilds: Guild[]) => void;
  setChannels: (channels: Channel[]) => void;
  setMessages: (messages: Message[]) => void;
  prependMessages: (messages: Message[]) => void;
  appendMessage: (message: Message) => void;
  updateMessage: (id: string, partial: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  setMembers: (members: GuildMember[]) => void;

  // Reactions: messageId → reactions
  reactions: Record<string, MessageReaction[]>;
  setMessageReactions: (messageId: string, reactions: MessageReaction[]) => void;
  addReaction: (reaction: MessageReaction) => void;
  removeReaction: (messageId: string, userId: string, emoji: string) => void;
  clearReactions: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  currentGuildId: null,
  currentChannelId: null,
  setCurrentGuild: (guildId) =>
    set({ currentGuildId: guildId, currentChannelId: null, channels: [], messages: [], members: [], reactions: {} }),
  setCurrentChannel: (channelId) =>
    set({ currentChannelId: channelId, messages: [], reactions: {} }),

  guilds: [],
  channels: [],
  messages: [],
  members: [],

  setGuilds: (guilds) => set({ guilds }),
  setChannels: (channels) => set({ channels }),
  setMessages: (messages) => set({ messages }),
  prependMessages: (older) =>
    set((s) => ({ messages: [...s.messages, ...older] })),
  appendMessage: (message) =>
    set((s) => ({ messages: [message, ...s.messages] })),
  updateMessage: (id, partial) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    })),
  removeMessage: (id) =>
    set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
  setMembers: (members) => set({ members }),

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
}));
