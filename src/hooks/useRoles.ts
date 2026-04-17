import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { computeMemberPermissions } from "../utils/permissions";
import type { Role, MemberRole } from "../types";

export function useRoles(guildId: string | null, userId: string, ownerId: string | null) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [memberRoles, setMemberRoles] = useState<MemberRole[]>([]);

  useEffect(() => {
    if (!guildId) { setRoles([]); setMemberRoles([]); return; }
    supabase.from("roles").select("*").eq("guild_id", guildId).order("position")
      .then(({ data }) => { if (data) setRoles(data as Role[]); });
    supabase.from("member_roles").select("*").eq("guild_id", guildId)
      .then(({ data }) => { if (data) setMemberRoles(data as MemberRole[]); });
  }, [guildId]);

  const myBitfields = memberRoles
    .filter((mr) => mr.user_id === userId)
    .map((mr) => roles.find((r) => r.id === mr.role_id)?.permissions_bitfield ?? 0);

  const myPermissions = computeMemberPermissions(myBitfields, ownerId === userId);

  const getUserRoles = useCallback((uid: string): Role[] => {
    const ids = memberRoles.filter((mr) => mr.user_id === uid).map((mr) => mr.role_id);
    return roles.filter((r) => ids.includes(r.id));
  }, [roles, memberRoles]);

  const assignRole = useCallback(async (uid: string, roleId: string) => {
    if (!guildId) return;
    await supabase.from("member_roles").insert({ guild_id: guildId, user_id: uid, role_id: roleId });
    setMemberRoles((prev) => [...prev, { guild_id: guildId, user_id: uid, role_id: roleId }]);
  }, [guildId]);

  const revokeRole = useCallback(async (uid: string, roleId: string) => {
    if (!guildId) return;
    await supabase.from("member_roles").delete()
      .eq("guild_id", guildId).eq("user_id", uid).eq("role_id", roleId);
    setMemberRoles((prev) => prev.filter((mr) => !(mr.user_id === uid && mr.role_id === roleId)));
  }, [guildId]);

  const createRole = useCallback(async (name: string, color: string, permsBitfield: number) => {
    if (!guildId) return null;
    const maxPos = roles.reduce((m, r) => Math.max(m, r.position), 0);
    const { data } = await supabase.from("roles")
      .insert({ guild_id: guildId, name, color, permissions_bitfield: permsBitfield, position: maxPos + 1 })
      .select().single();
    if (data) setRoles((prev) => [...prev, data as Role]);
    return data as Role | null;
  }, [guildId, roles]);

  const updateRole = useCallback(async (roleId: string, patch: Partial<Pick<Role, "name" | "color" | "permissions_bitfield">>) => {
    await supabase.from("roles").update(patch).eq("id", roleId);
    setRoles((prev) => prev.map((r) => r.id === roleId ? { ...r, ...patch } : r));
  }, []);

  const deleteRole = useCallback(async (roleId: string) => {
    await supabase.from("roles").delete().eq("id", roleId);
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    setMemberRoles((prev) => prev.filter((mr) => mr.role_id !== roleId));
  }, []);

  return { roles, memberRoles, myPermissions, getUserRoles, assignRole, revokeRole, createRole, updateRole, deleteRole };
}
