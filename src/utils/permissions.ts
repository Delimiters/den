export const Permissions = {
  SEND_MESSAGES:   1 << 0,  // 1
  READ_MESSAGES:   1 << 1,  // 2
  MANAGE_CHANNELS: 1 << 2,  // 4
  MANAGE_GUILD:    1 << 3,  // 8
  KICK_MEMBERS:    1 << 4,  // 16
  BAN_MEMBERS:     1 << 5,  // 32
  MANAGE_MESSAGES: 1 << 6,  // 64
  MANAGE_ROLES:    1 << 7,  // 128
  ADMINISTRATOR:   1 << 8,  // 256
} as const;

export type Permission = keyof typeof Permissions;

export const ALL_PERMISSIONS = Object.values(Permissions).reduce((a, b) => a | b, 0);

export const PERMISSION_LABELS: Record<Permission, string> = {
  SEND_MESSAGES:   "Send Messages",
  READ_MESSAGES:   "Read Messages",
  MANAGE_CHANNELS: "Manage Channels",
  MANAGE_GUILD:    "Manage Server",
  KICK_MEMBERS:    "Kick Members",
  BAN_MEMBERS:     "Ban Members",
  MANAGE_MESSAGES: "Manage Messages",
  MANAGE_ROLES:    "Manage Roles",
  ADMINISTRATOR:   "Administrator",
};

export function hasPermission(bitfield: number, permission: number): boolean {
  if ((bitfield & Permissions.ADMINISTRATOR) !== 0) return true;
  return (bitfield & permission) !== 0;
}

export function computeMemberPermissions(
  rolesBitfields: number[],
  isOwner: boolean,
): number {
  if (isOwner) return ALL_PERMISSIONS;
  return rolesBitfields.reduce((acc, b) => acc | b, 0);
}
