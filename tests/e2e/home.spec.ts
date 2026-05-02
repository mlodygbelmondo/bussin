import { expect, test } from "@playwright/test";

test("home page exposes the dashboard entry point", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^dashboard$/i })).toBeVisible();
});

test("mock auth and onboarding flow reaches generation", async ({ page }) => {
  await page.goto("/login");

  const loginForm = page.getByTestId("screen-login");
  await loginForm.locator('input[name="email"]').fill("producer@bussin.test");
  await loginForm.locator('input[name="password"]').fill("mock-password");
  await loginForm.getByRole("button", { name: /^sign in$/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: /good .+, alex/i }),
  ).toBeVisible();

  await page.goto("/onboarding");
  await page.getByTestId("primary-action").first().click();

  await expect(page).toHaveURL(/\/dashboard\/generate$/);
  await expect(page.getByTestId("screen-dashboard-generate")).toBeVisible();
});

test("mock generation flow submits to the queue", async ({ page }) => {
  await page.goto("/dashboard/generate");

  await expect(page.getByTestId("screen-dashboard-generate")).toBeVisible();
  await page.getByTestId("primary-action").click();

  await expect(page).toHaveURL(/\/dashboard\/queue$/);
  await expect(page.getByTestId("screen-dashboard-queue")).toBeVisible();
});

test("mock track preview supports approval and scheduling actions", async ({
  page,
}) => {
  await page.goto("/dashboard/tracks/mock-track-neon");

  await expect(
    page.getByTestId("screen-dashboard-tracks-mock-track-neon"),
  ).toBeVisible();

  await page.getByTestId("primary-action").click();
  await expect(
    page.getByText("Mock track approved. Render queued."),
  ).toBeVisible();

  await page.getByTestId("publish-now-action").click();
  await expect(page.getByText("Mock publishing job queued.")).toBeVisible();

  await page.getByLabel("Schedule upload time").fill(futureDatetimeLocal());
  await page.getByTestId("schedule-action").click();
  await expect(page.getByText("Mock upload scheduled.")).toBeVisible();
});

test("unknown mock tracks render the not-found state", async ({ page }) => {
  await page.goto("/dashboard/tracks/not-real-track");

  await expect(page.getByTestId("empty-state")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /back to queue/i }),
  ).toBeVisible();
});

test("mock billing, library, scheduled uploads, and channel actions are wired", async ({
  page,
}) => {
  await page.goto("/dashboard/library?q=neon");
  await expect(page.getByTestId("screen-dashboard-library")).toBeVisible();
  await expect(page.getByText("Neon Skyline")).toBeVisible();
  await page.getByTestId("generate-similar-action").first().click();
  await expect(page).toHaveURL(/\/dashboard\/generate\?/);
  await expect(page.getByTestId("screen-dashboard-generate")).toBeVisible();

  await page.goto("/dashboard/scheduled");
  await expect(page.getByTestId("screen-dashboard-scheduled")).toBeVisible();
  await page
    .getByTestId("scheduled-upload-row")
    .first()
    .getByRole("button", { name: /publish now/i })
    .click();
  await expect(
    page.getByText("Mock upload queued for publishing."),
  ).toBeVisible();

  await page.goto("/dashboard/channels");
  await expect(page.getByTestId("screen-dashboard-channels")).toBeVisible();
  await page.getByRole("button", { name: /test suno connection/i }).click();
  await expect(
    page.getByText("Mock Suno connection looks healthy."),
  ).toBeVisible();

  await page.goto("/dashboard/billing");
  await expect(page.getByTestId("screen-dashboard-billing")).toBeVisible();
  await page.getByRole("button", { name: /open billing portal/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/billing\?portal=mock$/);
});

function futureDatetimeLocal() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
