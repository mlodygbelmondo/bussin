import { expect, test } from "@playwright/test";

test("home page exposes the dashboard entry point", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^dashboard$/i })).toBeVisible();
});
