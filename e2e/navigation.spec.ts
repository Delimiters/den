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

    // Focus the page before sending keyboard shortcut
    await page.locator("body").click();
    await page.keyboard.press("Control+K");
    await expect(page.getByPlaceholder("Jump to channel or conversation…")).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder("Jump to channel or conversation…")).not.toBeVisible();
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

      await page.locator("body").click();
      await page.keyboard.press("Control+K");
      const switcher = page.getByPlaceholder("Jump to channel or conversation…");
      await expect(switcher).toBeVisible({ timeout: 5_000 });
      await switcher.fill(channelName);
      await expect(page.getByText(channelName)).toBeVisible({ timeout: 5_000 });

      await page.getByText(channelName).click();
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

    await page.getByTitle("Direct Messages").click();

    // Tabs are plain buttons, not role="tab"
    await expect(page.getByRole("button", { name: "Messages" })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: "Friends" })).toBeVisible();
  });

  test("Friends tab shows friends view with sub-tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    await page.getByTitle("Direct Messages").click();
    await page.getByRole("button", { name: "Friends" }).click();

    // FriendsView sub-tabs are also plain buttons
    await expect(page.getByRole("button", { name: "Online" })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pending" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Friend" })).toBeVisible();
  });

  test("Add Friend tab accepts username input and searches", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    await page.getByTitle("Direct Messages").click();
    await page.getByRole("button", { name: "Friends" }).click();
    await page.getByRole("button", { name: "Add Friend" }).click();

    const usernameInput = page.getByPlaceholder("Search by username…");
    await expect(usernameInput).toBeVisible({ timeout: 5_000 });

    await usernameInput.fill("zzz-nonexistent-xyz");

    // Should show "No users found" for a bogus search
    await expect(page.getByText(/No users found/)).toBeVisible({ timeout: 8_000 });
  });
});
