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

async function createServer(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

  const guildName = `e2e-srv-${Date.now()}`;
  await page.getByTitle("Create a server").click();
  await page.getByPlaceholder("My Awesome Server").fill(guildName);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByTitle(guildName)).toBeVisible({ timeout: 8_000 });

  const sb = await supabaseClient();
  const { data: guild } = await sb.from("guilds").select("id").eq("name", guildName).single();
  const guildId = guild?.id ?? null;

  return {
    guildName,
    guildId,
    cleanup: async () => {
      if (guildId) {
        const sb2 = await supabaseClient();
        await sb2.from("guilds").delete().eq("id", guildId);
      }
    },
  };
}

test.describe("server settings", () => {
  test("can open and close server settings modal", async ({ page }) => {
    const { cleanup } = await createServer(page);
    try {
      await page.getByTitle("Server settings").click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
      await page.getByRole("button", { name: /close/i }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("can rename the server", async ({ page }) => {
    const { guildName, cleanup } = await createServer(page);
    try {
      const newName = `renamed-${Date.now()}`;
      await page.getByTitle("Server settings").click();

      const nameInput = page.getByLabel(/server name/i);
      await nameInput.clear();
      await nameInput.fill(newName);
      await page.getByRole("button", { name: /save/i }).click();

      await page.getByRole("button", { name: /close/i }).click();
      await expect(page.getByTitle(newName)).toBeVisible({ timeout: 8_000 });
    } finally {
      await cleanup();
    }
  });

  test("can create an invite link", async ({ page }) => {
    const { cleanup } = await createServer(page);
    try {
      // Click the invite icon on the channel sidebar header (or context menu)
      await page.getByTitle("Invite people").click();

      const inviteInput = page.getByRole("textbox").filter({ hasText: /[A-Za-z0-9]{6,}/ });
      // Just check an invite code appears (a non-empty value in the invite modal)
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
      const code = await page.locator("input[readonly]").inputValue();
      expect(code.length).toBeGreaterThan(4);
    } finally {
      await cleanup();
    }
  });

  test("can create a role in server settings", async ({ page }) => {
    const { cleanup } = await createServer(page);
    try {
      await page.getByTitle("Server settings").click();
      await page.getByRole("button", { name: "Roles" }).click();

      await page.getByRole("button", { name: "Create Role" }).click();
      await expect(page.getByPlaceholder("Role name")).toBeVisible({ timeout: 5_000 });

      await page.getByPlaceholder("Role name").fill("Testers");
      await page.getByRole("button", { name: /save/i }).click();

      // Check the role appears in the role list (getByText would match the input too — use button role)
      await expect(page.getByRole("button", { name: "Testers" })).toBeVisible({ timeout: 8_000 });
    } finally {
      await cleanup();
    }
  });
});

test.describe("user settings", () => {
  test("can open user settings and close them", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    await page.getByTitle("User settings").click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /close/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("can toggle minimize-to-tray setting", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 15_000 });

    await page.getByTitle("User settings").click();
    await page.getByRole("button", { name: "App" }).click();

    const toggle = page.getByRole("switch");
    await expect(toggle).toBeVisible({ timeout: 5_000 });

    const before = await toggle.getAttribute("aria-checked");
    await toggle.click();
    const after = await toggle.getAttribute("aria-checked");
    expect(after).not.toBe(before);

    // Restore original state
    await toggle.click();
    await page.getByRole("button", { name: /close/i }).click();
  });
});
