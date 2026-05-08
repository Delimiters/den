import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { supabase } from "../../lib/supabase";
import { useAppStore } from "../../stores/appStore";
import { Avatar } from "../ui/Avatar";
import { prefs } from "../../utils/prefs";
import { requestNotificationPermission } from "../../utils/desktopNotification";
import type { User } from "../../types";

type Tab = "profile" | "audio" | "notifications" | "app" | "about";

interface UserSettingsModalProps {
  currentUser: User;
  onClose: () => void;
}

const TAB_LABELS: Record<Tab, string> = {
  profile: "Profile",
  audio: "Audio & Video",
  notifications: "Notifications",
  app: "App",
  about: "About",
};

export function UserSettingsModal({ currentUser, onClose }: UserSettingsModalProps) {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-overlay rounded-lg w-full max-w-2xl h-[520px] shadow-2xl flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left nav */}
        <div className="w-48 bg-guild-rail flex flex-col py-4 shrink-0">
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wide px-4 mb-2">
            User Settings
          </p>
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm text-left transition-colors rounded mx-2 ${
                tab === t ? "bg-white/10 text-text-primary" : "text-text-secondary hover:text-text-primary hover:bg-white/5"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={onClose} className="mx-4 text-text-muted hover:text-text-primary text-sm transition-colors">
            ✕ Close
          </button>
        </div>

        {/* Tab panels */}
        {tab === "profile" && <ProfileTab currentUser={currentUser} onClose={onClose} />}
        {tab === "audio" && <AudioTab />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "app" && <AppTab />}
        {tab === "about" && <AboutTab />}
      </div>
    </div>
  );
}

// ─── Profile ────────────────────────────────────────────────────────────────

function ProfileTab({ currentUser, onClose }: { currentUser: User; onClose: () => void }) {
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
    if (file.size > 2 * 1024 * 1024) { setError("Avatar must be under 2MB"); return; }
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
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (uploadError) { setError("Failed to upload avatar."); setLoading(false); return; }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    }
    const trimmedName = displayName.trim();
    const { error: updateError } = await supabase.from("users").update({ display_name: trimmedName, avatar_url: avatarUrl }).eq("id", currentUser.id);
    if (updateError) { setError("Failed to save profile."); setLoading(false); return; }
    setCurrentUser({ ...currentUser, display_name: trimmedName, avatar_url: avatarUrl });
    setLoading(false);
    onClose();
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <h2 className="text-text-primary font-bold text-lg">Profile</h2>

      <div className="flex items-center gap-4">
        <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
          <Avatar src={avatarPreview} name={displayName || currentUser.username} size={80} />
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold">
            Change
          </div>
        </div>
        <div>
          <p className="text-text-secondary text-sm font-medium mb-1">Profile picture</p>
          <button onClick={() => fileRef.current?.click()} className="text-accent hover:underline text-sm">
            Upload image
          </button>
          <p className="text-text-muted text-xs mt-0.5">JPG, PNG, GIF · Max 2MB</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-text-secondary text-xs font-semibold uppercase tracking-wide">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={32}
          className="bg-input-bg text-text-primary rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-text-secondary text-xs font-semibold uppercase tracking-wide">Username</label>
        <input readOnly value={`@${currentUser.username}`} className="bg-input-bg text-text-muted rounded px-3 py-2 text-sm outline-none cursor-not-allowed" />
        <p className="text-text-muted text-xs">Username cannot be changed yet.</p>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex justify-end gap-3 mt-auto">
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-sm px-4 py-2 transition-colors">Cancel</button>
        <button
          onClick={handleSave}
          disabled={loading || !displayName.trim()}
          className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Audio & Video ───────────────────────────────────────────────────────────

type DeviceKind = "audioinput" | "audiooutput" | "videoinput";

function AudioTab() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [micId, setMicId] = useState(prefs.getMicDeviceId);
  const [speakerId, setSpeakerId] = useState(prefs.getSpeakerDeviceId);
  const [cameraId, setCameraId] = useState(prefs.getCameraDeviceId);
  const [nc, setNc] = useState(prefs.getNoiseCancellation);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(setDevices).catch(() => {});
  }, []);

  function deviceOptions(kind: DeviceKind) {
    return devices.filter((d) => d.kind === kind);
  }

  function handleMic(v: string) { setMicId(v); prefs.setMicDeviceId(v); }
  function handleSpeaker(v: string) { setSpeakerId(v); prefs.setSpeakerDeviceId(v); }
  function handleCamera(v: string) { setCameraId(v); prefs.setCameraDeviceId(v); }
  function handleNc(v: boolean) { setNc(v); prefs.setNoiseCancellation(v); }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <h2 className="text-text-primary font-bold text-lg">Audio & Video</h2>

      <DeviceSelect label="Microphone" kind="audioinput" options={deviceOptions("audioinput")} value={micId} onChange={handleMic} />
      <DeviceSelect label="Speakers / Headphones" kind="audiooutput" options={deviceOptions("audiooutput")} value={speakerId} onChange={handleSpeaker} />
      <DeviceSelect label="Camera" kind="videoinput" options={deviceOptions("videoinput")} value={cameraId} onChange={handleCamera} />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-primary text-sm font-medium">Noise cancellation</p>
          <p className="text-text-muted text-xs mt-0.5">Suppress background noise during voice calls</p>
        </div>
        <Toggle value={nc} onChange={handleNc} />
      </div>

      <p className="text-text-muted text-xs">
        Device changes take effect when you join a voice channel. If no devices appear, grant microphone permission first.
      </p>
    </div>
  );
}

function DeviceSelect({ label, options, value, onChange }: { label: string; kind: DeviceKind; options: MediaDeviceInfo[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-text-secondary text-xs font-semibold uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-input-bg text-text-primary rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Default</option>
        {options.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>
        ))}
      </select>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

function AppTab() {
  const [minimizeToTray, setMinimizeToTray] = useState(prefs.getMinimizeToTray());

  async function handleMinimizeToTray(v: boolean) {
    setMinimizeToTray(v);
    prefs.setMinimizeToTray(v);
    if (isTauri()) {
      await invoke("set_minimize_to_tray", { value: v }).catch(() => {});
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <h2 className="text-text-primary font-bold text-lg">App</h2>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-primary text-sm font-medium">Minimize to tray on close</p>
          <p className="text-text-muted text-xs mt-0.5">
            When enabled, closing the window keeps Den running in the system tray.
            Disable to quit Den when you close the window.
          </p>
        </div>
        <Toggle value={minimizeToTray} onChange={handleMinimizeToTray} />
      </div>
    </div>
  );
}

// ─── Notifications ───────────────────────────────────────────────────────────

function NotificationsTab() {
  const [mentions, setMentions] = useState(prefs.getNotifyMentions);
  const [dms, setDms] = useState(prefs.getNotifyDms);
  const [permState, setPermState] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if ("Notification" in window) setPermState(Notification.permission);
  }, []);

  async function handleRequestPermission() {
    await requestNotificationPermission();
    setPermState("Notification" in window ? Notification.permission : "unsupported");
  }

  function handleMentions(v: boolean) { setMentions(v); prefs.setNotifyMentions(v); }
  function handleDms(v: boolean) { setDms(v); prefs.setNotifyDms(v); }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <h2 className="text-text-primary font-bold text-lg">Notifications</h2>

      {permState !== "granted" && (
        <div className="bg-white/5 rounded p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-text-primary text-sm font-medium">
              {permState === "denied" ? "Notifications blocked" : "Enable desktop notifications"}
            </p>
            <p className="text-text-muted text-xs mt-0.5">
              {permState === "denied"
                ? "Unblock in your OS notification settings, then relaunch."
                : "Allow Den to send you desktop alerts for mentions and DMs."}
            </p>
          </div>
          {permState !== "denied" && (
            <button
              onClick={handleRequestPermission}
              className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-1.5 rounded transition-colors shrink-0"
            >
              Allow
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-primary text-sm font-medium">Mentions & replies</p>
          <p className="text-text-muted text-xs mt-0.5">Notify when someone @mentions you</p>
        </div>
        <Toggle value={mentions} onChange={handleMentions} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-primary text-sm font-medium">Direct messages</p>
          <p className="text-text-muted text-xs mt-0.5">Notify on new DM messages</p>
        </div>
        <Toggle value={dms} onChange={handleDms} />
      </div>
    </div>
  );
}

// ─── About ───────────────────────────────────────────────────────────────────

function AboutTab() {
  const [version, setVersion] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "available" | "latest" | "error">("idle");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);

  useEffect(() => {
    if (isTauri()) {
      import("@tauri-apps/api/app").then(({ getVersion }) => getVersion().then(setVersion).catch(() => {}));
    }
  }, []);

  async function checkForUpdates() {
    setUpdateStatus("checking");
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        setUpdateVersion(update.version ?? null);
        setUpdateStatus("available");
      } else {
        setUpdateStatus("latest");
      }
    } catch {
      setUpdateStatus("error");
    }
  }

  const updateLabel = {
    idle: "Check for updates",
    checking: "Checking…",
    available: `Update available: v${updateVersion}`,
    latest: "You're up to date",
    error: "Check failed — try again",
  }[updateStatus];

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <h2 className="text-text-primary font-bold text-lg">About Den</h2>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-text-secondary text-sm">Version</span>
          <span className="text-text-primary text-sm font-mono">{version ? `v${version}` : "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary text-sm">Platform</span>
          <span className="text-text-primary text-sm">{isTauri() ? "Desktop (Tauri)" : "Web"}</span>
        </div>
      </div>

      <div className="h-px bg-divider" />

      {isTauri() && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-primary text-sm font-medium">Updates</p>
            <p className="text-text-muted text-xs mt-0.5">Den updates automatically on launch</p>
          </div>
          <button
            onClick={checkForUpdates}
            disabled={updateStatus === "checking"}
            className={`text-sm font-medium px-4 py-1.5 rounded transition-colors shrink-0 ${
              updateStatus === "available"
                ? "bg-accent hover:bg-accent-hover text-white"
                : "bg-white/10 hover:bg-white/15 text-text-primary disabled:opacity-50"
            }`}
          >
            {updateLabel}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <a
          href="https://github.com/Delimiters/den"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline text-sm"
        >
          View source on GitHub
        </a>
        <a
          href="https://github.com/Delimiters/den/issues/new"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline text-sm"
        >
          Report a bug
        </a>
      </div>
    </div>
  );
}

// ─── Shared components ───────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? "bg-accent" : "bg-white/20"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}
