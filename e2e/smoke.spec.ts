import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL!;
const PASSWORD = process.env.E2E_PASSWORD!;
const GUILD_NAME = process.env.E2E_GUILD_NAME ?? "Test Server";

test.describe("smoke", () => {
  test("login, create channel, send message, delete channel", async ({ page }) => {
    await page.goto("/");

    // --- Log in ---
    await page.getByPlaceholder(/email/i).fill(EMAIL);
    await page.getByPlaceholder(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for app to load (guild sidebar visible)
    await expect(page.getByText(GUILD_NAME)).toBeVisible({ timeout: 15_000 });

    // Click into the guild
    await page.getByText(GUILD_NAME).first().click();

    // --- Create a text channel ---
    const channelName = `e2e-${Date.now()}`;
    await page.getByTitle(/new channel/i).click();
    await page.getByPlaceholder(/channel-name/i).fill(channelName);
    await page.getByRole("button", { name: /create/i }).click();

    // Channel should appear and be selected
    await expect(page.getByText(`#${channelName}`)).toBeVisible({ timeout: 5_000 });

    // --- Send a message ---
    const messageText = `hello from e2e ${Date.now()}`;
    await page.getByPlaceholder(new RegExp(`Message #${channelName}`, "i")).fill(messageText);
    await page.keyboard.press("Enter");

    await expect(page.getByText(messageText)).toBeVisible({ timeout: 5_000 });

    // --- Delete the channel ---
    await page.getByText(`#${channelName}`).click({ button: "right" });
    await page.getByRole("menuitem", { name: /delete channel/i }).click();
    await page.getByRole("button", { name: /delete/i }).last().click();

    await expect(page.getByText(`#${channelName}`)).not.toBeVisible({ timeout: 5_000 });
  });
});
