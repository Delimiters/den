import { hasPermission, computeMemberPermissions, Permissions, ALL_PERMISSIONS } from "./permissions";

describe("hasPermission", () => {
  it("returns true when exact permission bit is set", () => {
    expect(hasPermission(Permissions.SEND_MESSAGES, Permissions.SEND_MESSAGES)).toBe(true);
  });

  it("returns false when bit is not set", () => {
    expect(hasPermission(Permissions.READ_MESSAGES, Permissions.MANAGE_GUILD)).toBe(false);
  });

  it("ADMINISTRATOR bypasses all permission checks", () => {
    expect(hasPermission(Permissions.ADMINISTRATOR, Permissions.BAN_MEMBERS)).toBe(true);
    expect(hasPermission(Permissions.ADMINISTRATOR, Permissions.MANAGE_ROLES)).toBe(true);
  });

  it("handles combined bitfield", () => {
    const perms = Permissions.SEND_MESSAGES | Permissions.READ_MESSAGES | Permissions.MANAGE_CHANNELS;
    expect(hasPermission(perms, Permissions.MANAGE_CHANNELS)).toBe(true);
    expect(hasPermission(perms, Permissions.KICK_MEMBERS)).toBe(false);
  });
});

describe("computeMemberPermissions", () => {
  it("returns ALL_PERMISSIONS for guild owner", () => {
    expect(computeMemberPermissions([], true)).toBe(ALL_PERMISSIONS);
    expect(computeMemberPermissions([Permissions.SEND_MESSAGES], true)).toBe(ALL_PERMISSIONS);
  });

  it("ORs all role bitfields together", () => {
    const result = computeMemberPermissions([Permissions.SEND_MESSAGES, Permissions.MANAGE_GUILD], false);
    expect(result & Permissions.SEND_MESSAGES).not.toBe(0);
    expect(result & Permissions.MANAGE_GUILD).not.toBe(0);
    expect(result & Permissions.BAN_MEMBERS).toBe(0);
  });

  it("returns 0 for a member with no roles", () => {
    expect(computeMemberPermissions([], false)).toBe(0);
  });
});
