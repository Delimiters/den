import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const EMAIL = process.env.E2E_EMAIL!;
const PASSWORD = process.env.E2E_PASSWORD!;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

test.describe("smoke", () => {
  let guildId: string | null = null;

  test.afterEach(async () => {
    // Clean up the test guild via API so the account stays tidy
    if (!guildId) return;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    await supabase.from("guilds").delete().eq("id", guildId);
    guildId = null;
  });

  test("login, create server, create channel, send message, delete channel", async ({ page }) => {
    await page.goto("/");

    // --- Log in ---
    await page.getByPlaceholder(/email/i).fill(EMAIL);
    await page.getByPlaceholder(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for app shell to load
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    // --- Create a server ---
    const guildName = `e2e-${Date.now()}`;
    await page.getByTitle("Create a server").click();
    await page.getByPlaceholder(/my awesome server/i).fill(guildName);
    await page.getByRole("button", { name: /^create$/i }).click();

    // Guild icon should appear; capture the guild id from the page URL or store
    await expect(page.getByTitle(guildName)).toBeVisible({ timeout: 8_000 });

    // Grab the guild id from Supabase so afterEach can clean up
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    const { data: guild } = await supabase
      .from("guilds")
      .select("id")
      .eq("name", guildName)
      .single();
    guildId = guild?.id ?? null;

    // --- Create a text channel ---
    const channelName = `e2e-channel-${Date.now()}`;
    await page.getByTitle(/new channel/i).click();
    await page.getByPlaceholder(/channel-name/i).fill(channelName);
    await page.getByRole("button", { name: /^create$/i }).click();

    await expect(page.getByText(`#${channelName}`)).toBeVisible({ timeout: 5_000 });

    // --- Send a message ---
    const messageText = `hello from e2e ${Date.now()}`;
    await page.getByPlaceholder(new RegExp(`message #${channelName}`, "i")).fill(messageText);
    await page.keyboard.press("Enter");

    await expect(page.getByText(messageText)).toBeVisible({ timeout: 5_000 });

    // --- Delete the channel ---
    await page.getByText(`#${channelName}`).click({ button: "right" });
    await page.getByRole("menuitem", { name: /delete channel/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();

    await expect(page.getByText(`#${channelName}`)).not.toBeVisible({ timeout: 5_000 });
  });
});
