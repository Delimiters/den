import { useState, useRef, type ChangeEvent } from "react";
import { supabase } from "../../lib/supabase";
import { useAppStore } from "../../stores/appStore";
import { Avatar } from "../ui/Avatar";
import type { User } from "../../types";

interface UserSettingsModalProps {
  currentUser: User;
  onClose: () => void;
}

export function UserSettingsModal({ currentUser, onClose }: UserSettingsModalProps) {
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const [displayName, setDisplayName] = useState(currentUser.display_name || currentUser.username);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatar_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Avatar must be under 2MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError(null);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);

    let avatarUrl = currentUser.avatar_url;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${currentUser.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) {
        setError("Failed to upload avatar. Make sure the avatars storage bucket exists.");
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the browser picks up the new image
      avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    }

    const trimmedName = displayName.trim();
    const { error: updateError } = await supabase
      .from("users")
      .update({ display_name: trimmedName, avatar_url: avatarUrl })
      .eq("id", currentUser.id);

    if (updateError) {
      setError("Failed to save profile.");
      setLoading(false);
      return;
    }

    setCurrentUser({ ...currentUser, display_name: trimmedName, avatar_url: avatarUrl });
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-overlay rounded-lg w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-divider flex items-center justify-between">
          <h2 className="text-text-primary text-xl font-bold">Edit Profile</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-6 flex flex-col gap-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
              <Avatar
                src={avatarPreview}
                name={displayName || currentUser.username}
                size={80}
              />
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold">
                Change
              </div>
            </div>
            <div>
              <p className="text-text-secondary text-sm font-medium mb-1">Profile picture</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="text-accent hover:underline text-sm"
              >
                Upload image
              </button>
              <p className="text-text-muted text-xs mt-0.5">JPG, PNG, GIF · Max 2MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Display name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={32}
              className="bg-input-bg text-text-primary rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Username (read-only) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
              Username
            </label>
            <input
              readOnly
              value={`@${currentUser.username}`}
              className="bg-input-bg text-text-muted rounded px-3 py-2 text-sm outline-none cursor-not-allowed"
            />
            <p className="text-text-muted text-xs">Username cannot be changed yet.</p>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-sm px-4 py-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !displayName.trim()}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
