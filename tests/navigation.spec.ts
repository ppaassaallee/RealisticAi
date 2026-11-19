import { test, expect } from "@playwright/test";
test("demo home and switching need no administrator credentials or paid calls", async ({
  page,
}) => {
  let adminRequests = 0,
    paidCalls = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/juliana?admin=1")) adminRequests++;
    if (r.method() === "POST") {
      try {
        if (r.postDataJSON()?.action === "avatar") paidCalls++;
      } catch {}
    }
  });
  await page.route("**/api/juliana?access=1", (r) =>
    r.fulfill({ json: { allowed: false } }),
  );
  await page.goto("/platform");
  await expect(
    page.getByRole("heading", { name: /Dos asistentes/ }),
  ).toBeVisible();
  expect(adminRequests).toBe(0);
  await page
    .getByRole("link", { name: "Abrir demo de Alex", exact: true })
    .click();
  await expect(page).toHaveURL(/\/kiosk$/);
  await page
    .getByRole("link", { name: "Juliana · Banca", exact: true })
    .click();
  await expect(page).toHaveURL(/\/juliana$/);
  await page.locator("summary").filter({ hasText: "Equipo" }).click();
  await expect(
    page.getByText(/Requiere una credencial de personal/),
  ).toBeVisible();
  expect(paidCalls).toBe(0);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("link", { name: "Alex · Salud", exact: true }),
    ).toBeVisible();
  }
});
test("failed session close keeps the current experience and offers retry", async ({
  page,
}) => {
  await page.goto("/juliana");
  await page.route("**/api/juliana", async (route) => {
    if (
      route.request().method() === "POST" &&
      route.request().postDataJSON()?.action === "end"
    )
      await route.fulfill({
        status: 503,
        json: { error: "Provider unavailable" },
      });
    else await route.continue();
  });
  await page.getByRole("link", { name: "Alex · Salud", exact: true }).click();
  await expect(page.locator("header [role=alert]")).toContainText(
    "No pudimos cerrar la sesión",
  );
  await expect(page).toHaveURL(/\/juliana$/);
});
