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

/** Dispatch a synthetic Ctrl+K that bypasses any browser-level interception. */
async function pressCtrlK(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true }));
  });
}

test.describe("navigation", () => {
  test("quick switcher opens and closes", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    await pressCtrlK(page);
    await expect(page.getByPlaceholder("Jump to channel or conversation…")).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder("Jump to channel or conversation…")).not.toBeVisible();
  });

  test("DM sidebar shows Messages and Friends tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    // force:true bypasses actionability checks (CI headless Chrome reports not-visible intermittently)
    await page.getByTitle("Direct Messages").click({ force: true });

    // Scope to the DM tab bar to avoid matching other "Messages" buttons on the page
    const tabBar = page.locator("[data-testid='dm-tab-bar']");
    await expect(tabBar).toBeVisible({ timeout: 5_000 });
    await expect(tabBar.getByRole("button", { name: "Messages" })).toBeVisible();
    await expect(tabBar.getByRole("button", { name: "Friends" })).toBeVisible();
  });

  test("Friends tab shows friends view with sub-tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    await page.getByTitle("Direct Messages").click({ force: true });
    const tabBar = page.locator("[data-testid='dm-tab-bar']");
    await expect(tabBar.getByRole("button", { name: "Friends" })).toBeVisible({ timeout: 5_000 });
    await tabBar.getByRole("button", { name: "Friends" }).click();

    // FriendsView sub-tabs (Online/All/Pending may include a count in their accessible name)
    await expect(page.getByRole("button", { name: /^Online/ })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: /^All/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pending/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Friend" })).toBeVisible();
  });

  test("Add Friend tab accepts username input and searches", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    await page.getByTitle("Direct Messages").click({ force: true });
    const tabBar = page.locator("[data-testid='dm-tab-bar']");
    await expect(tabBar.getByRole("button", { name: "Friends" })).toBeVisible({ timeout: 5_000 });
    await tabBar.getByRole("button", { name: "Friends" }).click({ force: true });
    await page.getByRole("button", { name: "Add Friend" }).click();

    const usernameInput = page.getByPlaceholder("Search by username…");
    await expect(usernameInput).toBeVisible({ timeout: 5_000 });

    // Use a short unique query to trigger one search; wait for searching OR no-results feedback
    await usernameInput.fill("zzz");
    await expect(page.getByText(/Searching|No users found/)).toBeVisible({ timeout: 10_000 });
  });

  // Runs last — creates and deletes a guild, which may leave Supabase realtime in a changed state
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

      await pressCtrlK(page);
      const switcher = page.getByPlaceholder("Jump to channel or conversation…");
      await expect(switcher).toBeVisible({ timeout: 5_000 });
      await switcher.fill(channelName);

      // Scope to the QuickSwitcher result list to avoid matching the channel sidebar
      const results = page.getByTestId("quick-switcher-results");
      await expect(results.getByRole("button").first()).toBeVisible({ timeout: 5_000 });
      await results.getByRole("button").first().click();
      await expect(page.getByPlaceholder(`Message #${channelName}`)).toBeVisible({ timeout: 8_000 });
    } finally {
      if (guildId) {
        const sb = await supabaseClient();
        await sb.from("guilds").delete().eq("id", guildId);
      }
    }
  });
});
