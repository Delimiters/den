import { useState } from "react";
import { Permissions, PERMISSION_LABELS, hasPermission } from "../../utils/permissions";
import type { Guild, Role } from "../../types";

type Tab = "roles";

interface ServerSettingsModalProps {
  guild: Guild;
  currentUserId: string;
  roles: Role[];
  onCreateRole: (name: string, color: string, perms: number) => Promise<Role | null>;
  onUpdateRole: (roleId: string, patch: Partial<Pick<Role, "name" | "color" | "permissions_bitfield">>) => Promise<void>;
  onDeleteRole: (roleId: string) => Promise<void>;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#99aab5", "#1abc9c", "#2ecc71", "#3498db", "#9b59b6",
  "#e91e63", "#f1c40f", "#e67e22", "#e74c3c", "#607d8b",
];

export function ServerSettingsModal({
  guild, currentUserId, roles,
  onCreateRole, onUpdateRole, onDeleteRole, onClose,
}: ServerSettingsModalProps) {
  const [tab] = useState<Tab>("roles");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(roles[0]?.id ?? null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editPerms, setEditPerms] = useState(0);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = guild.owner_id === currentUserId;

  function selectRole(role: Role) {
    setSelectedRoleId(role.id);
    setEditName(role.name);
    setEditColor(role.color);
    setEditPerms(role.permissions_bitfield);
  }

  async function handleSave() {
    if (!selectedRoleId) return;
    setSaving(true);
    await onUpdateRole(selectedRoleId, { name: editName.trim(), color: editColor, permissions_bitfield: editPerms });
    setSaving(false);
  }

  async function handleCreate() {
    setCreating(true);
    const role = await onCreateRole("New Role", "#99aab5", 3);
    if (role) selectRole(role);
    setCreating(false);
  }

  async function handleDelete(roleId: string) {
    const role = roles.find((r) => r.id === roleId);
    if (role?.name === "@everyone") return; // can't delete @everyone
    await onDeleteRole(roleId);
    setSelectedRoleId(roles.find((r) => r.id !== roleId)?.id ?? null);
  }

  function togglePerm(flag: number) {
    setEditPerms((p) => (p & flag) ? p & ~flag : p | flag);
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const canEdit = isOwner; // full roles mgmt for now requires owner

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-overlay rounded-lg w-full max-w-2xl h-[560px] shadow-2xl flex overflow-hidden">
        {/* Left nav */}
        <div className="w-48 bg-guild-rail flex flex-col py-4 shrink-0">
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wide px-4 mb-2">
            {guild.name}
          </p>
          <button
            className={`px-4 py-1.5 text-sm text-left transition-colors rounded mx-2 ${
              tab === "roles" ? "bg-white/10 text-text-primary" : "text-text-secondary hover:text-text-primary hover:bg-white/5"
            }`}
          >
            Roles
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="mx-4 text-text-muted hover:text-text-primary text-sm transition-colors"
          >
            ✕ Close
          </button>
        </div>

        {/* Roles panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Role list */}
          <div className="w-48 border-r border-divider flex flex-col">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-text-primary font-semibold text-sm">Roles</p>
              {canEdit && (
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="text-accent hover:text-accent text-xs font-semibold disabled:opacity-50"
                >
                  + Add
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => selectRole(role)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${
                    selectedRoleId === role.id
                      ? "bg-white/10 text-text-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  <span className="truncate">{role.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Role editor */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
            {selectedRole ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-text-primary font-bold text-base">
                    {canEdit ? "Edit Role" : selectedRole.name}
                  </h3>
                  {canEdit && selectedRole.name !== "@everyone" && (
                    <button
                      onClick={() => handleDelete(selectedRole.id)}
                      className="text-danger hover:text-danger text-xs transition-colors"
                    >
                      Delete Role
                    </button>
                  )}
                </div>

                {canEdit && (
                  <>
                    {/* Name */}
                    <div className="flex flex-col gap-1">
                      <label className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
                        Role Name
                      </label>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={selectedRole.name === "@everyone"}
                        className="bg-input-bg text-text-primary rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                        maxLength={32}
                      />
                    </div>

                    {/* Color */}
                    <div className="flex flex-col gap-1">
                      <label className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
                        Role Color
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            className={`w-7 h-7 rounded-full transition-transform ${
                              editColor === c ? "scale-125 ring-2 ring-white" : "hover:scale-110"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="flex flex-col gap-2">
                      <label className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
                        Permissions
                      </label>
                      <div className="flex flex-col gap-1">
                        {(Object.entries(PERMISSION_LABELS) as [keyof typeof PERMISSION_LABELS, string][]).map(([key, label]) => {
                          const flag = Permissions[key];
                          const checked = hasPermission(editPerms, flag);
                          return (
                            <label
                              key={key}
                              className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-white/5 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePerm(flag)}
                                className="accent-accent"
                              />
                              <span className="text-text-secondary text-sm">{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSave}
                        disabled={saving || !editName.trim()}
                        className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50"
                      >
                        {saving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </>
                )}

                {!canEdit && (
                  <p className="text-text-muted text-sm">Only the server owner can manage roles.</p>
                )}
              </>
            ) : (
              <p className="text-text-muted text-sm">Select a role to edit it.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
