import { prefs } from "./prefs";

beforeEach(() => {
  localStorage.clear();
});

describe("noise cancellation pref", () => {
  it("defaults to true", () => {
    expect(prefs.getNoiseCancellation()).toBe(true);
  });

  it("persists false", () => {
    prefs.setNoiseCancellation(false);
    expect(prefs.getNoiseCancellation()).toBe(false);
  });

  it("persists true after being set false", () => {
    prefs.setNoiseCancellation(false);
    prefs.setNoiseCancellation(true);
    expect(prefs.getNoiseCancellation()).toBe(true);
  });
});

describe("device id prefs", () => {
  it("mic device defaults to empty string", () => {
    expect(prefs.getMicDeviceId()).toBe("");
  });

  it("persists mic device id", () => {
    prefs.setMicDeviceId("mic-abc-123");
    expect(prefs.getMicDeviceId()).toBe("mic-abc-123");
  });

  it("persists speaker device id", () => {
    prefs.setSpeakerDeviceId("spk-xyz");
    expect(prefs.getSpeakerDeviceId()).toBe("spk-xyz");
  });

  it("persists camera device id", () => {
    prefs.setCameraDeviceId("cam-456");
    expect(prefs.getCameraDeviceId()).toBe("cam-456");
  });
});

describe("notification prefs", () => {
  it("mentions default to true", () => {
    expect(prefs.getNotifyMentions()).toBe(true);
  });

  it("DM notifications default to true", () => {
    expect(prefs.getNotifyDms()).toBe(true);
  });

  it("can disable mention notifications", () => {
    prefs.setNotifyMentions(false);
    expect(prefs.getNotifyMentions()).toBe(false);
  });

  it("can disable DM notifications", () => {
    prefs.setNotifyDms(false);
    expect(prefs.getNotifyDms()).toBe(false);
  });
});

describe("minimize to tray pref", () => {
  it("defaults to true", () => {
    expect(prefs.getMinimizeToTray()).toBe(true);
  });

  it("persists false", () => {
    prefs.setMinimizeToTray(false);
    expect(prefs.getMinimizeToTray()).toBe(false);
  });
});

describe("localStorage isolation", () => {
  it("uses den: prefix (does not collide with bare keys)", () => {
    localStorage.setItem("noiseCancellation", "false");
    expect(prefs.getNoiseCancellation()).toBe(true); // still reads from den:noiseCancellation
  });
});
