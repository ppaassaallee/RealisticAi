import { test, expect } from "@playwright/test";
const action = async (request: any, action: string, args: any = {}) => {
  const r = await request.post("/api/action", { data: { action, ...args } });
  expect(r.ok()).toBeTruthy();
  return r.json();
};
test("device frames preserve the mounted avatar and bilingual knowledge is usable", async ({
  page,
}) => {
  await page.goto("/kiosk");
  await page
    .locator("video")
    .evaluate((v) => v.setAttribute("data-instance", "preserved"));
  await page.getByRole("button", { name: "Tablet", exact: true }).click();
  await expect(page.locator(".device-tablet")).toBeVisible();
  await expect(page.locator("video")).toHaveAttribute(
    "data-instance",
    "preserved",
  );
  await page.getByRole("button", { name: "Web chat", exact: true }).click();
  await expect(page.locator(".device-web")).toBeVisible();
  await expect(page.locator("video")).toHaveAttribute(
    "data-instance",
    "preserved",
  );
  await page.getByRole("button", { name: /More than a welcome/ }).click();
  await page
    .getByRole("textbox", { name: "Search knowledge" })
    .fill("deductible");
  await page.locator(".knowledge-answers summary").first().click();
  await expect(page.locator(".knowledge-answers details[open]")).toContainText(
    "cannot verify your remaining deductible",
  );
  await page.getByRole("button", { name: "ES", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Buscar conocimiento" })
    .fill("copago");
  await expect(
    page.locator(".knowledge-answers summary").first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("analytics derives real events, avoids duplicate completions and separates sample data", async ({
  request,
}) => {
  const before = await (await request.get("/api/analytics?days=1")).json();
  await action(request, "reset");
  await action(request, "session", { language: "es", presentation: "tablet" });
  await action(request, "tool", {
    name: "searchAppointment",
    args: { name: "Jordan Rivera", dob: "1988-04-12", code: "1042" },
  });
  await action(request, "tool", {
    name: "checkInAppointment",
    args: { appointmentId: "a1", confirmed: true },
  });
  await action(request, "tool", {
    name: "checkInAppointment",
    args: { appointmentId: "a1", confirmed: true },
  });
  const handoff = await action(request, "tool", {
    name: "requestHumanAssistance",
    args: { reason: "Help requested" },
  });
  await action(request, "tool", {
    name: "requestHumanAssistance",
    args: { reason: "Help requested" },
  });
  await action(request, "case", { id: handoff.id, status: "accepted" });
  await action(request, "case", { id: handoff.id, status: "accepted" });
  await action(request, "response-observed", { durationMs: 1250 });
  const data = await (await request.get("/api/analytics?days=1")).json();
  expect(data.totalSessions).toBe(before.totalSessions + 1);
  expect(data.checkIns).toBe(before.checkIns + 1);
  expect(data.handoffs).toBe(before.handoffs + 1);
  expect(data.accepted).toBe(before.accepted + 1);
  expect(data.presentations.find((p: any) => p.label === "tablet").count).toBe(
    before.presentations.find((p: any) => p.label === "tablet").count + 1,
  );
  expect(JSON.stringify(data)).not.toMatch(
    /Jordan|1988|1042|patientName|sessionId|Help requested/,
  );
  const sample = await (
    await request.get("/api/analytics?days=7&sample=1")
  ).json();
  expect(sample.source).toBe("sample");
  const after = await (await request.get("/api/analytics?days=1")).json();
  expect(after.checkIns).toBe(data.checkIns);
  expect((await request.get("/api/analytics?days=9")).status()).toBe(400);
  expect(
    (
      await request.get("/api/analytics", {
        headers: { host: "external.example" },
      })
    ).status(),
  ).toBe(401);
});
test("analytics navigation, sample disclosure, knowledge and export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/analytics");
  await page
    .getByRole("button", { name: "Sample preview", exact: true })
    .click();
  await expect(
    page.getByText(
      "Illustrative sample data. These figures are not your results.",
    ),
  ).toBeVisible();
  await expect(page.locator(".metric-card")).toHaveCount(4);
  await expect(page.locator(".metric-card").first()).toContainText("162");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  expect((await download).suggestedFilename()).toContain("sample");
  await page.getByRole("button", { name: "Alex’s knowledge" }).click();
  await page
    .getByRole("textbox", { name: "Search knowledge catalog" })
    .fill("insurance");
  await expect(
    page.locator(".knowledge-catalog details").first(),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
