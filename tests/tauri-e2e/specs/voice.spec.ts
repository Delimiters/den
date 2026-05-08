import { browser, $, $$ } from "@wdio/globals";
import { createClient } from "@supabase/supabase-js";

const EMAIL = process.env.E2E_EMAIL!;
const PASSWORD = process.env.E2E_PASSWORD!;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

describe("Voice channel", () => {
  let guildId: string | null = null;
  let voiceChannelName: string;

  before(async () => {
    // Log in
    await browser.pause(1000);
    await $('input[placeholder="you@example.com"]').waitForDisplayed({ timeout: 15_000 });
    await $('input[placeholder="you@example.com"]').setValue(EMAIL);
    await $('input[type="password"]').setValue(PASSWORD);
    await $('button=Log In').click();
    await $('[title="Create a server"]').waitForDisplayed({ timeout: 20_000 });

    // Create a test server with a voice channel
    const guildName = `e2e-voice-${Date.now()}`;
    voiceChannelName = `voice-${Date.now()}`;

    await $('[title="Create a server"]').click();
    await $('input[placeholder="My Awesome Server"]').setValue(guildName);
    await $('button=Create').click();
    await $(`[title="${guildName}"]`).waitForDisplayed({ timeout: 10_000 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    const { data: guild } = await supabase
      .from("guilds").select("id").eq("name", guildName).single();
    guildId = guild?.id ?? null;

    // Create a voice channel via the UI
    await $('[title="Add channel"]').click();
    // Select Voice channel type if the selector is present
    const typeSelector = await $('select[name="type"], select');
    if (await typeSelector.isExisting()) {
      await typeSelector.selectByVisibleText("Voice").catch(() => {});
    }
    await $('input[placeholder="new-channel"]').setValue(voiceChannelName);
    await $('button=Create Channel').click();
  });

  after(async () => {
    if (!guildId) return;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    await supabase.from("guilds").delete().eq("id", guildId);
  });

  it("can join a voice channel", async () => {
    // Click the voice channel in the sidebar to join
    const voiceChBtn = await $(`button=${voiceChannelName}`);
    await voiceChBtn.waitForDisplayed({ timeout: 10_000 });
    await voiceChBtn.click();

    // The voice status panel should appear in the sidebar
    const statusPanel = await $('[data-testid="voice-status-panel"]');
    await statusPanel.waitForDisplayed({ timeout: 15_000 });
  });

  it("mic button toggles mute state", async () => {
    // Find the mic toggle button inside the voice status panel
    const micBtn = await $('[data-testid="voice-status-panel"] [title*="ic"]');
    await micBtn.waitForDisplayed({ timeout: 5_000 });

    const initialTitle = await micBtn.getAttribute("title");
    await micBtn.click();
    await browser.pause(500);

    const newTitle = await micBtn.getAttribute("title");
    // Title should have changed (Mute Microphone ↔ Unmute Microphone)
    expect(newTitle).not.toBe(initialTitle);
  });

  it("camera button toggles camera state", async () => {
    const cameraBtn = await $('[data-testid="voice-status-panel"] [title*="amera"]');
    await cameraBtn.waitForDisplayed({ timeout: 5_000 });

    const initialTitle = await cameraBtn.getAttribute("title");
    await cameraBtn.click();
    await browser.pause(800);

    const newTitle = await cameraBtn.getAttribute("title");
    expect(newTitle).not.toBe(initialTitle);

    // Toggle back off to clean up
    await cameraBtn.click();
    await browser.pause(300);
  });

  it("leave button exits voice channel", async () => {
    const leaveBtn = await $('[data-testid="voice-status-panel"] [title="Leave voice channel"]');
    await leaveBtn.waitForDisplayed({ timeout: 5_000 });
    await leaveBtn.click();
    await browser.pause(500);

    // Status panel should disappear
    const statusPanel = await $('[data-testid="voice-status-panel"]');
    await statusPanel.waitForDisplayed({ timeout: 5_000, reverse: true });
  });
});

describe("Settings modal", () => {
  it("can open settings and see Audio & Video tab", async () => {
    // Find the user settings button (avatar/username in bottom-left)
    const settingsBtn = await $('[title="User Settings"], [aria-label="User Settings"]');
    if (await settingsBtn.isExisting()) {
      await settingsBtn.click();
    } else {
      // Try clicking the gear icon in the bottom of the sidebar
      const gear = await $('[data-testid="user-settings-btn"], button[title*="etting"]');
      await gear.waitForDisplayed({ timeout: 5_000 });
      await gear.click();
    }

    const audioTab = await $('button=Audio & Video');
    await audioTab.waitForDisplayed({ timeout: 5_000 });
    await audioTab.click();

    // Should see device selects
    const micSelect = await $('select');
    await micSelect.waitForDisplayed({ timeout: 3_000 });

    // Close
    const closeBtn = await $('button*=Close');
    await closeBtn.click();
  });

  it("can open App tab and see close behavior toggle", async () => {
    const settingsBtn = await $('[title="User Settings"], [aria-label="User Settings"], [data-testid="user-settings-btn"], button[title*="etting"]');
    await settingsBtn.waitForDisplayed({ timeout: 5_000 });
    await settingsBtn.click();

    const appTab = await $('button=App');
    await appTab.waitForDisplayed({ timeout: 5_000 });
    await appTab.click();

    const toggle = await $('button[role="switch"]');
    await toggle.waitForDisplayed({ timeout: 3_000 });

    const before = await toggle.getAttribute("aria-checked");
    await toggle.click();
    await browser.pause(300);
    const after = await toggle.getAttribute("aria-checked");
    expect(after).not.toBe(before);

    // Toggle back
    await toggle.click();
    await browser.pause(200);

    const closeBtn = await $('button*=Close');
    await closeBtn.click();
  });
});
