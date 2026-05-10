import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const EMAIL = process.env.E2E_EMAIL!;
const PASSWORD = process.env.E2E_PASSWORD!;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

async function supabaseClient() {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  return sb;
}

test.describe("smoke", () => {
  test("app shell is visible after login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });
  });

  test("login → create server → create channel → send message", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    const guildName = `e2e-${Date.now()}`;
    let guildId: string | null = null;

    try {
      // Create server
      await page.getByTitle("Create a server").click();
      await page.getByPlaceholder("My Awesome Server").fill(guildName);
      await page.getByRole("button", { name: "Create" }).click();
      await expect(page.getByTitle(guildName)).toBeVisible({ timeout: 8_000 });

      const sb = await supabaseClient();
      const { data: guild } = await sb.from("guilds").select("id").eq("name", guildName).single();
      guildId = guild?.id ?? null;

      // Create text channel
      const channelName = `e2e-ch-${Date.now()}`;
      await page.getByTitle("Add channel").click();
      await page.getByPlaceholder("new-channel").fill(channelName);
      await page.getByRole("button", { name: "Create Channel" }).click();
      await page.getByRole("button", { name: channelName }).click();

      // Send message
      const messageText = `hello from e2e ${Date.now()}`;
      await page.getByPlaceholder(`Message #${channelName}`).fill(messageText);
      await page.keyboard.press("Enter");
      await expect(page.getByText(messageText)).toBeVisible({ timeout: 15_000 });
    } finally {
      if (guildId) {
        const sb = await supabaseClient();
        await sb.from("guilds").delete().eq("id", guildId);
      }
    }
  });
});
