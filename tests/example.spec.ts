import { test, expect } from "@playwright/test";

test("homepage has title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/RentalManager/i);
});

test("can navigate to login", async ({ page }) => {
  await page.goto("/");
  await page.click('text="Connexion"');
  await expect(page).toHaveURL(/.*login/);
});
