import { expect, test } from "@playwright/test";

function futureDate(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test("guest can log in, reserve a property, see the trip, and cancel it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Places worth the detour/i })).toBeVisible();
  await page.getByRole("button", { name: "Demo login", exact: true }).click();
  await page.getByRole("button", { name: /Continue as guest/i }).click();
  await expect(page.getByRole("button", { name: "My trips" })).toBeVisible();

  await page.getByRole("button", { name: "My trips" }).click();
  while (await page.getByRole("button", { name: "Cancel" }).count()) {
    await page.getByRole("button", { name: "Cancel" }).first().click();
    await expect(page.getByText("Reservation cancelled and dates released.")).toBeVisible();
  }
  await page.getByRole("button", { name: "Explore", exact: true }).click();

  await page.getByRole("button", { name: "Reserve" }).first().click();
  await page.getByLabel("Check in", { exact: true }).last().fill(futureDate(100));
  await page.getByLabel("Check out", { exact: true }).last().fill(futureDate(103));
  await page.getByRole("button", { name: "Confirm reservation" }).click();
  await expect(page.getByRole("heading", { name: "My trips" })).toBeVisible();
  await expect(page.getByText("confirmed").first()).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).first().click();
  await expect(page.getByText("cancelled").first()).toBeVisible();
});

test("host can create, edit, and delete a property", async ({ page }) => {
  const uniqueTitle = `Recruiter Demo Loft ${Date.now()}`;
  await page.goto("/");
  await page.getByRole("button", { name: "Demo login", exact: true }).click();
  await page.getByRole("button", { name: /Continue as host/i }).click();
  await expect(page.getByRole("heading", { name: "Your properties" })).toBeVisible();
  await page.getByRole("button", { name: /Add property/i }).click();
  await page.getByLabel("Title").fill(uniqueTitle);
  await page.getByLabel("City", { exact: true }).fill("Seattle");
  await page.getByLabel("Description").fill("A straightforward test listing created through the complete React host workflow.");
  await page.getByRole("button", { name: "Create property" }).click();
  await expect(page.getByRole("heading", { name: uniqueTitle })).toBeVisible();

  const card = page.getByRole("heading", { name: uniqueTitle }).locator("..", { hasText: uniqueTitle }).locator("..");
  await card.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Price per night ($)").fill("275");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("$275/night")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: uniqueTitle })).not.toBeVisible();
});
