import { test as setup, expect } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("you@example.com").fill(process.env.E2E_EMAIL!);
  await page.locator("input[type=password]").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page.getByTitle("Create a server")).toBeVisible({ timeout: 20_000 });
  await page.context().storageState({ path: authFile });
});
