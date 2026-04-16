export type UserStatus = "online" | "idle" | "dnd" | "offline";
export type ChannelType = "text" | "voice" | "category";

export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: UserStatus;
  created_at: string;
}

export interface Guild {
  id: string;
  name: string;
  icon_url: string | null;
  owner_id: string;
  invite_code: string;
  created_at: string;
}

export interface Channel {
  id: string;
  guild_id: string;
  name: string;
  type: ChannelType;
  position: number;
  parent_id: string | null;
}

export interface Message {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  author?: User;
}

export interface GuildMember {
  guild_id: string;
  user_id: string;
  joined_at: string;
  nickname: string | null;
  user?: User;
}

export interface UserPresence {
  user_id: string;
  status: UserStatus;
  last_seen: string;
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
}
