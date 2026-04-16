import { create } from "zustand";
import type { Guild, Channel, Message, User, GuildMember } from "../types";

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
  setMembers: (members: GuildMember[]) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  currentGuildId: null,
  currentChannelId: null,
  setCurrentGuild: (guildId) =>
    set({ currentGuildId: guildId, currentChannelId: null, channels: [], messages: [], members: [] }),
  setCurrentChannel: (channelId) =>
    set({ currentChannelId: channelId, messages: [] }),

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
  setMembers: (members) => set({ members }),
}));
