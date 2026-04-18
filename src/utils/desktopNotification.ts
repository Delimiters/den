/**
 * Fires a Web Notification if the window isn't focused and permission is granted.
 * Works in both the Tauri WebView and standard browsers.
 */

let permissionRequested = false;

export async function requestNotificationPermission(): Promise<void> {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default" && !permissionRequested) {
    permissionRequested = true;
    await Notification.requestPermission();
  }
}

export function notify(title: string, body: string, icon?: string | null): void {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.hasFocus()) return;

  const n = new Notification(title, {
    body,
    icon: icon ?? undefined,
    silent: false,
  });

  // Auto-close after 8 seconds to avoid lingering notifications
  setTimeout(() => n.close(), 8000);
}
