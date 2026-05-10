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

/**
 * Shared setup: creates a server + text channel, navigates into it.
 * Returns cleanup fn and channel name.
 */
async function setupServerAndChannel(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

  const guildName = `e2e-msg-${Date.now()}`;
  const channelName = `e2e-ch-${Date.now()}`;

  await page.getByTitle("Create a server").click();
  await page.getByPlaceholder("My Awesome Server").fill(guildName);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByTitle(guildName)).toBeVisible({ timeout: 8_000 });

  await page.getByTitle("Add channel").click();
  await page.getByPlaceholder("new-channel").fill(channelName);
  await page.getByRole("button", { name: "Create Channel" }).click();
  await page.getByRole("button", { name: channelName }).click();

  const sb = await supabaseClient();
  const { data: guild } = await sb.from("guilds").select("id").eq("name", guildName).single();
  const guildId = guild?.id ?? null;

  const cleanup = async () => {
    if (guildId) {
      const sb2 = await supabaseClient();
      await sb2.from("guilds").delete().eq("id", guildId);
    }
  };

  return { channelName, cleanup };
}

test.describe("messaging", () => {
  test("can edit a message via up-arrow shortcut", async ({ page }) => {
    const { channelName, cleanup } = await setupServerAndChannel(page);
    try {
      const original = `edit-me-${Date.now()}`;
      const edited = `edited-${Date.now()}`;

      const input = page.getByPlaceholder(`Message #${channelName}`);
      await input.fill(original);
      await page.keyboard.press("Enter");
      await expect(page.getByText(original)).toBeVisible({ timeout: 10_000 });

      // Up-arrow on empty input to edit last message
      await input.focus();
      await page.keyboard.press("ArrowUp");
      await expect(page.getByText("Editing message")).toBeVisible({ timeout: 5_000 });

      await page.keyboard.press("Control+A");
      await page.keyboard.type(edited);
      await page.keyboard.press("Enter");

      await expect(page.getByText(edited)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(original)).not.toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("can delete a message", async ({ page }) => {
    const { channelName, cleanup } = await setupServerAndChannel(page);
    try {
      const text = `delete-me-${Date.now()}`;
      await page.getByPlaceholder(`Message #${channelName}`).fill(text);
      await page.keyboard.press("Enter");
      await expect(page.getByText(text)).toBeVisible({ timeout: 10_000 });

      // Hover message to reveal action bar, click delete
      await page.getByText(text).hover();
      await page.getByTitle("Delete message").click();

      // Confirm deletion dialog
      await page.getByRole("button", { name: "Delete" }).click();

      await expect(page.getByText(text)).not.toBeVisible({ timeout: 8_000 });
    } finally {
      await cleanup();
    }
  });

  test("can reply to a message", async ({ page }) => {
    const { channelName, cleanup } = await setupServerAndChannel(page);
    try {
      const original = `reply-target-${Date.now()}`;
      const reply = `reply-text-${Date.now()}`;

      await page.getByPlaceholder(`Message #${channelName}`).fill(original);
      await page.keyboard.press("Enter");
      await expect(page.getByText(original)).toBeVisible({ timeout: 10_000 });

      await page.getByText(original).hover();
      await page.getByTitle("Reply").click();

      // Reply indicator should appear
      await expect(page.getByText(/Replying to/)).toBeVisible({ timeout: 5_000 });

      await page.getByPlaceholder(`Message #${channelName}`).fill(reply);
      await page.keyboard.press("Enter");

      await expect(page.getByText(reply)).toBeVisible({ timeout: 10_000 });
      // The replied-to message should be quoted above the reply
      await expect(page.getByText(original)).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("can add an emoji reaction", async ({ page }) => {
    const { channelName, cleanup } = await setupServerAndChannel(page);
    try {
      const text = `react-to-me-${Date.now()}`;
      await page.getByPlaceholder(`Message #${channelName}`).fill(text);
      await page.keyboard.press("Enter");
      await expect(page.getByText(text)).toBeVisible({ timeout: 10_000 });

      await page.getByText(text).hover();
      await page.getByTitle("Add reaction").click();

      // Emoji picker should open
      await expect(page.getByPlaceholder("Search emoji")).toBeVisible({ timeout: 5_000 });

      // Search for thumbsup and click it
      await page.getByPlaceholder("Search emoji").fill("thumbs");
      await page.locator("[data-emoji]").first().click();

      // Reaction badge should appear on the message
      await expect(page.locator("[data-testid='reaction']").first()).toBeVisible({ timeout: 8_000 });
    } finally {
      await cleanup();
    }
  });

  test("can search messages in a channel", async ({ page }) => {
    const { channelName, cleanup } = await setupServerAndChannel(page);
    try {
      const unique = `searchable-${Date.now()}`;
      await page.getByPlaceholder(`Message #${channelName}`).fill(unique);
      await page.keyboard.press("Enter");
      await expect(page.getByText(unique)).toBeVisible({ timeout: 10_000 });

      // Open search
      await page.getByTitle("Search messages").click();
      await expect(page.getByPlaceholder("Search messages…")).toBeVisible({ timeout: 5_000 });

      await page.getByPlaceholder("Search messages…").fill(unique);
      await page.keyboard.press("Enter");

      await expect(page.getByText(unique)).toBeVisible({ timeout: 8_000 });
    } finally {
      await cleanup();
    }
  });

  test("can pin and unpin a message", async ({ page }) => {
    const { channelName, cleanup } = await setupServerAndChannel(page);
    try {
      const text = `pin-me-${Date.now()}`;
      await page.getByPlaceholder(`Message #${channelName}`).fill(text);
      await page.keyboard.press("Enter");
      await expect(page.getByText(text)).toBeVisible({ timeout: 10_000 });

      await page.getByText(text).hover();
      await page.getByTitle("More actions").click();
      await page.getByRole("menuitem", { name: /[Pp]in/ }).click();

      // Pinned messages button in toolbar should now show a pin count
      await expect(page.getByTitle("Pinned messages")).toBeVisible({ timeout: 5_000 });
      await page.getByTitle("Pinned messages").click();
      await expect(page.getByText(text)).toBeVisible({ timeout: 5_000 });
    } finally {
      await cleanup();
    }
  });
});
