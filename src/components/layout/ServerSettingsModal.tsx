import { useState, useRef, type ChangeEvent } from "react";
import { supabase } from "../../lib/supabase";
import { useAppStore } from "../../stores/appStore";
import { Permissions, PERMISSION_LABELS, hasPermission } from "../../utils/permissions";
import { Avatar } from "../ui/Avatar";
import { uploadFile } from "../../utils/upload";
import type { Guild, Role, CustomEmoji } from "../../types";

type Tab = "overview" | "roles" | "emoji";

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
  const setGuilds = useAppStore((s) => s.setGuilds);
  const guilds = useAppStore((s) => s.guilds);
  const customEmojis = useAppStore((s) => s.customEmojis);
  const setCustomEmojis = useAppStore((s) => s.setCustomEmojis);

  const [tab, setTab] = useState<Tab>("overview");

  // Overview state
  const [guildName, setGuildName] = useState(guild.name);
  const [iconPreview, setIconPreview] = useState<string | null>(guild.icon_url);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewSaved, setOverviewSaved] = useState(false);
  const iconFileRef = useRef<HTMLInputElement>(null);

  // Roles state
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(roles[0]?.id ?? null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editPerms, setEditPerms] = useState(0);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = guild.owner_id === currentUserId;

  // Emoji state
  const [emojiName, setEmojiName] = useState("");
  const [emojiFile, setEmojiFile] = useState<File | null>(null);
  const [emojiPreview, setEmojiPreview] = useState<string | null>(null);
  const [emojiLoading, setEmojiLoading] = useState(false);
  const [emojiError, setEmojiError] = useState<string | null>(null);
  const emojiFileRef = useRef<HTMLInputElement>(null);

  function handleEmojiFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 256 * 1024) { setEmojiError("Emoji must be under 256 KB"); return; }
    if (!file.type.startsWith("image/")) { setEmojiError("Must be an image file"); return; }
    setEmojiFile(file);
    setEmojiPreview(URL.createObjectURL(file));
    setEmojiError(null);
  }

  async function handleAddEmoji() {
    if (!emojiFile || !emojiName.trim()) return;
    const cleanName = emojiName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (cleanName.length < 2) { setEmojiError("Name must be at least 2 characters"); return; }
    setEmojiLoading(true);
    setEmojiError(null);
    const result = await uploadFile(emojiFile, currentUserId);
    if (!result.ok) { setEmojiError(result.error); setEmojiLoading(false); return; }
    const { data, error } = await supabase
      .from("custom_emojis")
      .insert({ guild_id: guild.id, name: cleanName, image_url: result.attachment.file_url, created_by: currentUserId })
      .select()
      .single();
    if (error) {
      setEmojiError(error.code === "23505" ? `Name "${cleanName}" is already taken` : "Failed to add emoji");
      setEmojiLoading(false);
      return;
    }
    setCustomEmojis([...customEmojis, data as CustomEmoji]);
    setEmojiName("");
    setEmojiFile(null);
    setEmojiPreview(null);
    setEmojiLoading(false);
  }

  async function handleDeleteEmoji(emojiId: string) {
    await supabase.from("custom_emojis").delete().eq("id", emojiId);
    setCustomEmojis(customEmojis.filter((e) => e.id !== emojiId));
  }

  function handleIconChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setOverviewError("Icon must be under 4MB"); return; }
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
    setOverviewError(null);
  }

  async function handleOverviewSave() {
    if (!isOwner) return;
    setOverviewLoading(true);
    setOverviewError(null);

    let iconUrl = guild.icon_url;

    if (iconFile) {
      const ext = iconFile.name.split(".").pop();
      const path = `guild-icons/${guild.id}/icon.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, iconFile, { upsert: true });
      if (uploadErr) {
        setOverviewError("Icon upload failed. Make sure the avatars storage bucket exists.");
        setOverviewLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      iconUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    }

    const trimmedName = guildName.trim();
    if (!trimmedName) { setOverviewError("Server name cannot be empty."); setOverviewLoading(false); return; }

    const { error: updateErr } = await supabase
      .from("guilds")
      .update({ name: trimmedName, icon_url: iconUrl })
      .eq("id", guild.id);

    if (updateErr) {
      setOverviewError("Failed to save. Please try again.");
      setOverviewLoading(false);
      return;
    }

    // Update local store so name/icon refresh without re-fetching
    setGuilds(guilds.map((g) => g.id === guild.id ? { ...g, name: trimmedName, icon_url: iconUrl } : g));
    setOverviewLoading(false);
    setOverviewSaved(true);
    setTimeout(() => setOverviewSaved(false), 2000);
  }

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
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wide px-4 mb-2 truncate">
            {guild.name}
          </p>
          {(["overview", "roles", "emoji"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm text-left transition-colors rounded mx-2 capitalize ${
                tab === t ? "bg-white/10 text-text-primary" : "text-text-secondary hover:text-text-primary hover:bg-white/5"
              }`}
            >
              {t}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="mx-4 text-text-muted hover:text-text-primary text-sm transition-colors"
          >
            ✕ Close
          </button>
        </div>

        {/* Overview panel */}
        {tab === "overview" && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <h2 className="text-text-primary font-bold text-lg">Server Overview</h2>

            {/* Icon upload */}
            <div className="flex items-center gap-5">
              <div
                className="relative cursor-pointer group"
                onClick={() => isOwner && iconFileRef.current?.click()}
              >
                <Avatar src={iconPreview} name={guild.name} size={80} className="rounded-2xl" />
                {isOwner && (
                  <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-semibold text-center leading-tight px-1">Change Icon</span>
                  </div>
                )}
              </div>
              <input ref={iconFileRef} type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
              <div className="flex flex-col gap-1">
                <p className="text-text-secondary text-sm font-medium">Server Icon</p>
                <p className="text-text-muted text-xs">Recommended: 256×256 px, under 4 MB</p>
                {isOwner && (
                  <button
                    onClick={() => iconFileRef.current?.click()}
                    className="text-accent hover:text-accent text-xs font-semibold mt-1 w-fit"
                  >
                    Upload Image
                  </button>
                )}
              </div>
            </div>

            {/* Guild name */}
            <div className="flex flex-col gap-1">
              <label className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
                Server Name
              </label>
              <input
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                disabled={!isOwner}
                maxLength={100}
                className="bg-input-bg text-text-primary rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
              />
            </div>

            {overviewError && <p className="text-danger text-xs">{overviewError}</p>}

            {isOwner && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOverviewSave}
                  disabled={overviewLoading || !guildName.trim()}
                  className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50"
                >
                  {overviewLoading ? "Saving…" : overviewSaved ? "Saved!" : "Save Changes"}
                </button>
              </div>
            )}

            {!isOwner && (
              <p className="text-text-muted text-sm">Only the server owner can edit these settings.</p>
            )}
          </div>
        )}

        {/* Roles panel */}
        {tab === "roles" && (
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
        )}

        {/* Emoji panel */}
        {tab === "emoji" && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <h2 className="text-text-primary font-bold text-lg">Custom Emojis</h2>
            <p className="text-text-muted text-sm -mt-4">
              Use emojis in messages with <code className="bg-black/20 px-1 rounded">:name:</code> syntax.
            </p>

            {isOwner && (
              <div className="flex flex-col gap-3 bg-black/10 rounded-lg p-4">
                <p className="text-text-secondary text-sm font-semibold">Add Emoji</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 bg-black/20 rounded flex items-center justify-center cursor-pointer hover:bg-black/30 transition-colors shrink-0 overflow-hidden"
                    onClick={() => emojiFileRef.current?.click()}
                  >
                    {emojiPreview
                      ? <img src={emojiPreview} alt="preview" className="w-10 h-10 object-contain" />
                      : <span className="text-text-muted text-2xl">+</span>}
                  </div>
                  <input ref={emojiFileRef} type="file" accept="image/*" className="hidden" onChange={handleEmojiFileChange} />
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-text-muted text-xs uppercase tracking-wide font-semibold">Name</label>
                    <input
                      value={emojiName}
                      onChange={(e) => setEmojiName(e.target.value)}
                      placeholder="e.g. poggers"
                      maxLength={32}
                      className="bg-input-bg text-text-primary rounded px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <button
                    onClick={handleAddEmoji}
                    disabled={emojiLoading || !emojiFile || !emojiName.trim()}
                    className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50 shrink-0"
                  >
                    {emojiLoading ? "Adding…" : "Add"}
                  </button>
                </div>
                {emojiError && <p className="text-danger text-xs">{emojiError}</p>}
              </div>
            )}

            <div className="flex flex-col gap-1">
              {customEmojis.length === 0 && (
                <p className="text-text-muted text-sm">No custom emojis yet.</p>
              )}
              {customEmojis.map((emoji) => (
                <div key={emoji.id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/5 group">
                  <img src={emoji.image_url} alt={emoji.name} className="w-8 h-8 object-contain rounded" />
                  <span className="text-text-primary text-sm font-medium flex-1">:{emoji.name}:</span>
                  {isOwner && (
                    <button
                      onClick={() => handleDeleteEmoji(emoji.id)}
                      className="text-text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 text-xs"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
