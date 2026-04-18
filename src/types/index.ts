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

export interface ReplyRef {
  id: string;
  content: string;
  author?: Pick<User, "id" | "username" | "display_name">;
}

export interface Message {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  reply_to_id?: string | null;
  reply_to?: ReplyRef | null;
  author?: User;
  attachments?: Attachment[];
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

export interface Attachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  content_type: string;
}

export interface Role {
  id: string;
  guild_id: string;
  name: string;
  color: string;
  permissions_bitfield: number;
  position: number;
  created_at: string;
}

export interface MemberRole {
  guild_id: string;
  user_id: string;
  role_id: string;
}

export interface DmChannel {
  id: string;
  created_at: string;
  participants: User[];
  lastMessage?: { content: string; created_at: string; author_username: string } | null;
}

export interface DmAttachment {
  id: string;
  dm_message_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  content_type: string;
}

export interface DmMessage {
  id: string;
  dm_channel_id: string;
  author_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  reply_to_id?: string | null;
  author?: User;
  dm_attachments?: DmAttachment[];
}
