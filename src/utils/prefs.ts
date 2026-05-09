const PREFIX = "den:";

function get(key: string, fallback: string): string {
  try { return localStorage.getItem(PREFIX + key) ?? fallback; } catch { return fallback; }
}
function set(key: string, value: string) {
  try { localStorage.setItem(PREFIX + key, value); } catch { /* ignore */ }
}

export const prefs = {
  getNoiseCancellation: () => get("noiseCancellation", "true") === "true",
  setNoiseCancellation: (v: boolean) => set("noiseCancellation", String(v)),

  getMicDeviceId: () => get("micDeviceId", ""),
  setMicDeviceId: (v: string) => set("micDeviceId", v),

  getSpeakerDeviceId: () => get("speakerDeviceId", ""),
  setSpeakerDeviceId: (v: string) => set("speakerDeviceId", v),

  getCameraDeviceId: () => get("cameraDeviceId", ""),
  setCameraDeviceId: (v: string) => set("cameraDeviceId", v),

  getNotifyMentions: () => get("notifyMentions", "true") === "true",
  setNotifyMentions: (v: boolean) => set("notifyMentions", String(v)),

  getNotifyDms: () => get("notifyDms", "true") === "true",
  setNotifyDms: (v: boolean) => set("notifyDms", String(v)),

  getMinimizeToTray: () => get("minimizeToTray", "true") === "true",
  setMinimizeToTray: (v: boolean) => set("minimizeToTray", String(v)),
};
