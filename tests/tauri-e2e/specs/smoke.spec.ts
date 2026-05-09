import { browser, $, expect as wdioExpect } from "@wdio/globals";
import { createClient } from "@supabase/supabase-js";

const EMAIL = process.env.E2E_EMAIL!;
const PASSWORD = process.env.E2E_PASSWORD!;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

// Switch to the main app window immediately.
// tauri-driver attaches to the splashscreen first (it opens first); we must
// switch to the main window handle before the splashscreen closes or our
// session becomes invalid. Window order: [splashscreen=0, main=1].
async function switchToMainWindow() {
  const handles = await browser.getWindowHandles();
  await browser.switchToWindow(handles[handles.length - 1]);
}

describe("Den desktop app — smoke tests", () => {
  before(async () => {
    await switchToMainWindow();
  });

  it("login form is visible on launch", async () => {
    // Give the app a moment to finish rendering
    await browser.pause(2000);

    const emailInput = await $('input[placeholder="you@example.com"]');
    await emailInput.waitForDisplayed({ timeout: 15_000 });

    const passwordInput = await $('input[type="password"]');
    await wdioExpect(passwordInput).toBeDisplayed();

    const loginBtn = await $('button=Log In');
    await wdioExpect(loginBtn).toBeDisplayed();
  });

  it("can log in and see the app shell", async () => {
    await $('input[placeholder="you@example.com"]').setValue(EMAIL);
    await $('input[type="password"]').setValue(PASSWORD);
    await $('button=Log In').click();

    // Guild rail button signals the app shell has loaded
    const createServerBtn = await $('[title="Create a server"]');
    await createServerBtn.waitForDisplayed({ timeout: 20_000 });
    await wdioExpect(createServerBtn).toBeDisplayed();
  });

  describe("server + channel + message", () => {
    let guildId: string | null = null;

    after(async () => {
      if (!guildId) return;
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
      await supabase.from("guilds").delete().eq("id", guildId);
    });

    it("create a server, channel, and send a message", async () => {
      // Create server
      const guildName = `e2e-tauri-${Date.now()}`;
      await $('[title="Create a server"]').click();
      await $('input[placeholder="My Awesome Server"]').setValue(guildName);
      await $('button=Create').click();

      await $(`[title="${guildName}"]`).waitForDisplayed({ timeout: 10_000 });

      // Grab guild id for cleanup
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
      const { data: guild } = await supabase
        .from("guilds").select("id").eq("name", guildName).single();
      guildId = guild?.id ?? null;

      // Create channel
      const channelName = `e2e-ch-${Date.now()}`;
      await $('[title="Add channel"]').click();
      await $('input[placeholder="new-channel"]').setValue(channelName);
      await $('button=Create Channel').click();

      // Navigate to the channel
      await $(`button=${channelName}`).click();

      // Send a message
      const msg = `tauri-smoke-${Date.now()}`;
      await $(`input[placeholder="Message #${channelName}"]`).setValue(msg);
      await browser.keys("Enter");

      // Message appears in the chat
      const msgEl = await $(`//*[contains(text(),"${msg}")]`);
      await msgEl.waitForDisplayed({ timeout: 15_000 });
      await wdioExpect(msgEl).toBeDisplayed();
    });
  });
});
