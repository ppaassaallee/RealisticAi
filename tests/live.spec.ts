import { test, expect } from "@playwright/test";
test("live Tavus video, audio tracks, tool results, bilingual turns and teardown", async ({
  browser,
}) => {
  test.skip(
    process.env.LIVE_TAVUS !== "1",
    "Requires Tavus credentials and incurs a short CVI call.",
  );
  test.setTimeout(180000);
  const context = await browser.newContext({
    permissions: ["microphone"],
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();
  const tools: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/api/action")) {
      try {
        const body = r.postDataJSON();
        if (body.action === "tool") {
          tools.push(body.name);
          console.log("LIVE TOOL:", body.name);
        }
      } catch {}
    }
  });
  page.on("pageerror", (e) => console.log("LIVE PAGE ERROR:", e.message));
  try {
    await context.request.post(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:3000") + "/api/action",
      {
        data: { action: "reset" },
      },
    );
    await context.request.post(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:3000") + "/api/action",
      {
        data: { action: "session", language: "en" },
      },
    );
    await page.goto("/kiosk");
    await page
      .getByRole("button", { name: "Talk to Alex", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          page.locator("video").evaluate((v: HTMLVideoElement) => v.videoWidth),
        { timeout: 60000 },
      )
      .toBeGreaterThan(0);
    console.log("LIVE video frames received");
    await expect
      .poll(
        async () =>
          page
            .locator("audio")
            .evaluate((a: HTMLAudioElement) =>
              (a.srcObject as MediaStream)
                ?.getAudioTracks()
                .some((t) => t.readyState === "live"),
            ),
        { timeout: 30000 },
      )
      .toBe(true);
    console.log("LIVE remote audio track received");
    await page.getByRole("button", { name: "Play audio", exact: true }).click();
    await expect
      .poll(
        () =>
          page
            .locator("audio")
            .evaluate((a: HTMLAudioElement) => !a.paused && a.currentTime > 0),
        { timeout: 10000 },
      )
      .toBe(true);
    await page.screenshot({
      path: test.info().outputPath("live-avatar.png"),
      fullPage: true,
    });
    await page
      .getByLabel("Type to Alex")
      .fill("What is a deductible? Please explain briefly.");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.locator('.captions[data-speaker="alex"]')).toContainText(
      /deductible/i,
      { timeout: 30000 },
    );
    await page
      .getByLabel("Type to Alex")
      .fill("¿Qué es un copago? Responde brevemente en español.");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.locator('.captions[data-speaker="alex"]')).toContainText(
      /monto fijo|cantidad fija|pago fijo|importe fijo|tarifa fija/i,
      { timeout: 30000 },
    );
    console.log("LIVE bilingual knowledge answers received");
    await page
      .getByLabel("Type to Alex")
      .fill(
        "I want to check in. My full name is Jordan Rivera, date of birth April 12, 1988, and my four-digit patient code is 1042. Please find my appointment.",
      );
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(
      page.getByText("Identity verified", { exact: true }),
    ).toBeVisible({ timeout: 45000 });
    console.log("LIVE identity tool verified");
    await expect(page.locator('.captions[data-speaker="alex"]')).toContainText(/would you like|do you confirm|shall I|want me to|confirm.*check|check.*confirm/i,{timeout:20000});
    await page
      .getByLabel("Type to Alex")
      .fill("Yes, I confirm. Please check me in for that appointment.");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Checked in", { exact: true })).toBeVisible({
      timeout: 45000,
    });
    console.log("LIVE check-in tool persisted");
    await page
      .getByLabel("Type to Alex")
      .fill(
        "Por favor, habla español. Necesito ayuda de una persona en recepción, envía mi solicitud de asistencia por favor.",
      );
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.locator(".captions")).toContainText(
      /asistencia|recepci[oó]n/i,
      { timeout: 20000 },
    );
    await page
      .getByLabel("Type to Alex")
      .fill(
        "Sí, estoy de acuerdo. Confirmo que quiero asistencia humana. Envía la solicitud ahora, por favor.",
      );
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect
      .poll(
        async () => {
          const r = await context.request.get(
            (process.env.TEST_BASE_URL || "http://127.0.0.1:3000") +
              "/api/state",
          );
          return (await r.json()).cases.length;
        },
        { timeout: 30000 },
      )
      .toBe(1);
    console.log("LIVE Spanish request created handoff");
    expect(tools).toEqual(
      expect.arrayContaining([
        "searchAppointment",
        "checkInAppointment",
        "requestHumanAssistance",
      ]),
    );
    console.log(
      "LIVE caption:",
      await page
        .locator(".captions")
        .innerText()
        .catch(() => "(no captions)"),
    );
    await page.getByRole("button", { name: "End avatar call" }).click();
    await expect(page.locator("video")).toBeHidden();
  } finally {
    await context.request.post(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:3000") + "/api/action",
      {
        data: { action: "end" },
      },
    );
    await context.close();
  }
});
