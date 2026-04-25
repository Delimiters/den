import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const EMAIL = process.env.E2E_EMAIL!;
const PASSWORD = process.env.E2E_PASSWORD!;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

test.describe("smoke", () => {
  let guildId: string | null = null;

  test.afterEach(async () => {
    // Delete the test guild (and all its channels/messages) via API
    if (!guildId) return;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    await supabase.from("guilds").delete().eq("id", guildId);
    guildId = null;
  });

  test("login → create server → create channel → send message", async ({ page }) => {
    await page.goto("/");

    // --- Log in ---
    await page.getByPlaceholder("you@example.com").fill(EMAIL);
    await page.locator("input[type=password]").fill(PASSWORD);
    await page.getByRole("button", { name: "Log In" }).click();

    // App shell loaded
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    // --- Create a server ---
    const guildName = `e2e-${Date.now()}`;
    await page.getByTitle("Create a server").click();
    await page.getByPlaceholder("My Awesome Server").fill(guildName);
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByTitle(guildName)).toBeVisible({ timeout: 8_000 });

    // Grab the guild id for afterEach cleanup
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    const { data: guild } = await supabase
      .from("guilds").select("id").eq("name", guildName).single();
    guildId = guild?.id ?? null;

    // --- Create a text channel ---
    const channelName = `e2e-channel-${Date.now()}`;
    await page.getByTitle("Add channel").click();
    await page.getByPlaceholder("new-channel").fill(channelName);
    await page.getByRole("button", { name: "Create Channel" }).click();

    await expect(page.getByText(`#${channelName}`)).toBeVisible({ timeout: 5_000 });
    await page.getByText(`#${channelName}`).click();

    // --- Send a message ---
    const messageText = `hello from e2e ${Date.now()}`;
    await page.getByPlaceholder(`Message #${channelName}`).fill(messageText);
    await page.keyboard.press("Enter");

    await expect(page.getByText(messageText)).toBeVisible({ timeout: 5_000 });
  });
});
