import { requestNotificationPermission, notify } from "./desktopNotification";

function mockNotification(permission: NotificationPermission, hasFocus = false) {
  const NotificationMock = vi.fn() as unknown as typeof Notification & { permission: NotificationPermission };
  NotificationMock.permission = permission;
  NotificationMock.requestPermission = vi.fn().mockResolvedValue(permission);
  vi.stubGlobal("Notification", NotificationMock);
  vi.spyOn(document, "hasFocus").mockReturnValue(hasFocus);
  return NotificationMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("requestNotificationPermission", () => {
  it("requests permission when it is 'default'", async () => {
    const N = mockNotification("default");
    await requestNotificationPermission();
    expect(N.requestPermission).toHaveBeenCalled();
  });

  it("does not re-request if already granted", async () => {
    const N = mockNotification("granted");
    await requestNotificationPermission();
    expect(N.requestPermission).not.toHaveBeenCalled();
  });

  it("does not throw when Notification API is unavailable", async () => {
    vi.stubGlobal("Notification", undefined);
    await expect(requestNotificationPermission()).resolves.toBeUndefined();
  });
});

describe("notify", () => {
  it("does not fire when window has focus", () => {
    const N = mockNotification("granted", true);
    notify("title", "body");
    expect(N).not.toHaveBeenCalled();
  });

  it("does not fire when permission is 'denied'", () => {
    const N = mockNotification("denied", false);
    notify("title", "body");
    expect(N).not.toHaveBeenCalled();
  });

  it("fires a Notification when permission is granted and window is unfocused", () => {
    const N = mockNotification("granted", false);
    notify("Alert", "Something happened");
    expect(N).toHaveBeenCalledWith("Alert", expect.objectContaining({ body: "Something happened" }));
  });

  it("passes an icon when provided", () => {
    const N = mockNotification("granted", false);
    notify("Title", "Body", "https://example.com/icon.png");
    expect(N).toHaveBeenCalledWith("Title", expect.objectContaining({ icon: "https://example.com/icon.png" }));
  });

  it("does not throw when Notification API is unavailable", () => {
    vi.stubGlobal("Notification", undefined);
    expect(() => notify("title", "body")).not.toThrow();
  });
});
