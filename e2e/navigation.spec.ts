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

test.describe("navigation", () => {
  test("quick switcher opens and closes", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press("Control+K");
    await expect(page.getByPlaceholder(/jump to/i)).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder(/jump to/i)).not.toBeVisible();
  });

  test("quick switcher finds a channel", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    const guildName = `e2e-qs-${Date.now()}`;
    const channelName = `qs-ch-${Date.now()}`;
    let guildId: string | null = null;

    try {
      await page.getByTitle("Create a server").click();
      await page.getByPlaceholder("My Awesome Server").fill(guildName);
      await page.getByRole("button", { name: "Create" }).click();
      await expect(page.getByTitle(guildName)).toBeVisible({ timeout: 8_000 });

      await page.getByTitle("Add channel").click();
      await page.getByPlaceholder("new-channel").fill(channelName);
      await page.getByRole("button", { name: "Create Channel" }).click();

      const sb = await supabaseClient();
      const { data: guild } = await sb.from("guilds").select("id").eq("name", guildName).single();
      guildId = guild?.id ?? null;

      await page.keyboard.press("Control+K");
      await page.getByPlaceholder(/jump to/i).fill(channelName);
      await expect(page.getByText(channelName)).toBeVisible({ timeout: 5_000 });

      await page.getByText(channelName).click();
      // Should land in the channel
      await expect(page.getByPlaceholder(`Message #${channelName}`)).toBeVisible({ timeout: 8_000 });
    } finally {
      if (guildId) {
        const sb = await supabaseClient();
        await sb.from("guilds").delete().eq("id", guildId);
      }
    }
  });

  test("DM sidebar shows Messages and Friends tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    // Click the DMs icon in the guild rail
    await page.getByTitle("Direct Messages").click();

    await expect(page.getByRole("tab", { name: "Messages" })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("tab", { name: "Friends" })).toBeVisible();
  });

  test("Friends tab shows friends view with sub-tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    await page.getByTitle("Direct Messages").click();
    await page.getByRole("tab", { name: "Friends" }).click();

    await expect(page.getByRole("tab", { name: "Online" })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("tab", { name: "All" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Pending" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Add Friend" })).toBeVisible();
  });

  test("Add Friend tab accepts input and shows send button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    await page.getByTitle("Direct Messages").click();
    await page.getByRole("tab", { name: "Friends" }).click();
    await page.getByRole("tab", { name: "Add Friend" }).click();

    const usernameInput = page.getByPlaceholder(/username/i);
    await expect(usernameInput).toBeVisible({ timeout: 5_000 });

    await usernameInput.fill("nonexistent-user-xyz");
    await page.getByRole("button", { name: /send friend request/i }).click();

    // Should show an error (user not found) or "Request sent" — either way the button fired
    await expect(
      page.getByText(/not found|request sent|already/i)
    ).toBeVisible({ timeout: 8_000 });
  });
});
