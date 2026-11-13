import { test, expect } from "@playwright/test";
import { defaultConfig } from "../experiences/juliana/config";
test("live Juliana: female avatar media, Spanish banking tools, interruption and teardown", async ({
  browser,
}) => {
  test.skip(process.env.LIVE_JULIANA !== "1", "Opt-in paid Tavus call.");
  test.setTimeout(180000);
  const context = await browser.newContext({
    permissions: ["microphone"],
    viewport: { width: 1500, height: 1100 },
  });
  const page = await context.newPage();
  const api = "/api/juliana";
  const tools: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith(api)) {
      try {
        const b = r.postDataJSON();
        if (b.action === "tool") tools.push(b.name);
      } catch {}
    }
  });
  const send = async (text: string) => {
    await page.getByLabel("Escribir a Juliana").fill(text);
    await page
      .locator(".avatar-chat")
      .getByRole("button", { name: "Enviar", exact: true })
      .click();
  };
  const state = async () => {
    const r = await context.request.get(api);
    return r.json();
  };
  try {
    await context.request.post(api, {
      data: { action: "config", config: defaultConfig },
    });
    await page.goto("/juliana");
    await page
      .getByRole("button", { name: "Conversar con Juliana", exact: true })
      .click();
    await expect
      .poll(
        () =>
          page.locator("video").evaluate((v: HTMLVideoElement) => v.videoWidth),
        { timeout: 60000 },
      )
      .toBeGreaterThan(0);
    await expect
      .poll(
        () =>
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
    await page.getByRole("button", { name: "Play audio", exact: true }).click();
    await expect
      .poll(() =>
        page
          .locator("audio")
          .evaluate((a: HTMLAudioElement) => !a.paused && a.currentTime > 0),
      )
      .toBe(true);
    await page
      .getByRole("button", { name: "Interrumpir a Juliana", exact: true })
      .click();
    await send(
      "Quiero consultar una remesa ficticia. Mi identidad de prueba es DEMO-01, código de prueba PRUEBA-01 y referencia REM-001. Consultá su estado en el simulador.",
    );
    await expect
      .poll(async () => (await state()).session?.result?.title || "", {
        timeout: 40000,
      })
      .toContain("Disponible");
    console.log("LIVE JULIANA remittance lookup verified");
    await send(
      "Ahora quiero construir mi casita en Guatemala. Mi meta de ejemplo es 120000 quetzales, tengo 0 ahorrados y el plazo es 60 meses. Calculá el plan educativo de ahorro.",
    );
    await expect
      .poll(async () => (await state()).session?.result?.message || "", {
        timeout: 40000,
      })
      .toContain("2000.00");
    console.log("LIVE JULIANA savings plan verified");
    await send(
      "Quiero conocer un crédito para mi negocio. Simulá 25000 quetzales a 24 meses con tasa anual ilustrativa de 12 por ciento. No quiero un crédito real.",
    );
    await expect
      .poll(async () => (await state()).session?.result?.title || "", {
        timeout: 40000,
      })
      .toContain("Una cuota");
    console.log("LIVE JULIANA credit simulation verified");
    await send(
      "¿Qué es phishing? Consultá tu base de conocimiento y explicá en español.",
    );
    await expect
      .poll(() => tools.includes("searchBankKnowledge"), { timeout: 30000 })
      .toBe(true);
    await send(
      "Quiero hablar con una persona. Creá ahora una solicitud demo para la cola de productos.",
    );
    await expect
      .poll(async () => (await state()).session?.cases?.length || 0, {
        timeout: 40000,
      })
      .toBeGreaterThan(0);
    await expect(page.locator(".captions")).toContainText(
      /solicitud|demo|espera|caso|persona/i,
      { timeout: 20000 },
    );
    expect(tools).toEqual(
      expect.arrayContaining(["bankingJourney", "searchBankKnowledge"]),
    );
    await page.screenshot({
      path: test.info().outputPath("juliana-live.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "End avatar call", exact: true })
      .click();
    await expect(page.locator("video")).toBeHidden();
  } finally {
    await context.request.post(api, { data: { action: "end" } });
    await context.close();
  }
});
