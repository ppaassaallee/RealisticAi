import { test, expect } from "@playwright/test";
import knowledge from "../experiences/juliana/knowledge.json" with { type: "json" };
import {
  users,
  remittances,
  accounts,
  bills,
  products,
  creditScenarios,
  savingsGoals,
  locations,
} from "../experiences/juliana/data";
import { defaultConfig } from "../experiences/juliana/config";
const action = async (r: any, action: string, args: any = {}) => {
  const out = await r.post("/api/juliana", { data: { action, ...args } });
  expect(out.ok(), await out.text()).toBeTruthy();
  return out.json();
};
const tool = (r: any, journey: string, step: string, args: any = {}) =>
  action(r, "tool", {
    name: "bankingJourney",
    args: { journey, step, ...args },
  });
test.beforeEach(async ({ request }) => {
  await action(request, "config", { config: defaultConfig });
  await action(request, "session");
});
test("all ten banking journeys return explicit backend results", async ({
  request,
}) => {
  const quote = await tool(request, "send", "calculate", {
    amount: 200,
    origin: "US",
    destination: "GT",
  });
  expect(quote.details.join(" ")).toContain("1500.00");
  expect(quote.pendingId).toBeTruthy();
  expect(
    (
      await tool(request, "send", "confirm", {
        pendingId: quote.pendingId,
        confirmed: true,
      })
    ).kind,
  ).toBe("request");
  const remit = await tool(request, "collect", "lookup", {
    userId: "DEMO-01",
    demoCode: "PRUEBA-01",
    reference: "REM-001",
  });
  expect(remit.title).toContain("Disponible");
  const account = await tool(request, "account", "prepare", {
    product: "savings",
  });
  expect(
    (
      await tool(request, "account", "confirm", {
        pendingId: account.pendingId,
        confirmed: true,
        consent: true,
      })
    ).reference,
  ).toMatch(/^DEMO-/);
  const bill = await tool(request, "pay", "prepare", {
    service: "electricity",
    reference: "SERV-001",
  });
  const paid = await tool(request, "pay", "confirm", {
    pendingId: bill.pendingId,
    confirmed: true,
  });
  expect(paid.reference).toMatch(/^SIM-/);
  expect(
    (
      await tool(request, "loan", "calculate", {
        amount: 12000,
        months: 12,
        annualRate: 0,
      })
    ).message,
  ).toContain("1000.00");
  expect(
    (
      await tool(request, "save", "calculate", {
        target: 120000,
        saved: 0,
        months: 60,
      })
    ).message,
  ).toContain("2000.00");
  for (const j of ["migrant", "consular"]) {
    const r = await tool(request, j, "information", {
      country: "Estados Unidos",
      jurisdiction: "California",
      need: "Pasaporte",
    });
    expect(r.message).toContain("No tenemos requisitos");
    expect(
      r.links.some((l: any) => l.url === "https://www.minex.gob.gt/"),
    ).toBeTruthy();
  }
  expect((await tool(request, "fraud", "information")).message).toContain(
    "no bloquea",
  );
  const handoff = await tool(request, "help", "request", { queue: "general" });
  expect(handoff.reference).toMatch(/^CASO-/);
  expect((await tool(request, "help", "request")).reference).toBe(
    handoff.reference,
  );
  await action(request, "case", { id: handoff.reference, status: "accepted" });
  expect(
    (await (await request.get("/api/juliana")).json()).session.cases[0].status,
  ).toBe("accepted");
});
test("banking confirmations, ownership, authorization and isolation fail closed", async ({
  request,
  browser,
}) => {
  const invalid = async (name: string, args: any) => {
    expect(
      (
        await request.post("/api/juliana", {
          data: { action: "tool", name, args },
        })
      ).status(),
    ).toBe(400);
  };
  await invalid("searchAppointment", {
    name: "Jordan Rivera",
    dob: "1988-04-12",
    code: "1042",
  });
  await invalid("bankingJourney", {
    journey: "collect",
    step: "lookup",
    userId: "DEMO-01",
    demoCode: "PRUEBA-01",
    reference: "REM-002",
  });
  await invalid("bankingJourney", {
    journey: "collect",
    step: "lookup",
    userId: "DEMO-01",
    demoCode: "wrong",
    reference: "REM-001",
  });
  await invalid("bankingJourney", {
    journey: "pay",
    step: "confirm",
    pendingId: "invented",
    confirmed: true,
  });
  const interest = await tool(request, "account", "prepare", {
    product: "savings",
  });
  await invalid("bankingJourney", {
    journey: "account",
    step: "confirm",
    pendingId: interest.pendingId,
    confirmed: true,
    consent: false,
  });
  const p = await tool(request, "pay", "prepare", {
    service: "electricity",
    reference: "SERV-001",
  });
  await invalid("bankingJourney", {
    journey: "pay",
    step: "confirm",
    pendingId: p.pendingId,
    confirmed: false,
  });
  const r = await tool(request, "pay", "confirm", {
    pendingId: p.pendingId,
    confirmed: true,
  });
  await invalid("bankingJourney", {
    journey: "pay",
    step: "confirm",
    pendingId: p.pendingId,
    confirmed: true,
  });
  const p2 = await tool(request, "pay", "prepare", {
    service: "electricity",
    reference: "SERV-001",
  });
  expect(
    (
      await tool(request, "pay", "confirm", {
        pendingId: p2.pendingId,
        confirmed: true,
      })
    ).reference,
  ).toBe(r.reference);
  expect(
    (
      await request.post("/api/juliana", {
        headers: { origin: "https://evil.example" },
        data: { action: "session" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get("/api/juliana?admin=1", {
        headers: { host: "external.example" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/juliana", {
        headers: { host: "external.example" },
        data: { action: "config", config: defaultConfig },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/juliana", {
        data: {
          action: "config",
          config: { ...defaultConfig, integration: "integrated" },
        },
      })
    ).status(),
  ).toBe(400);
  const second = await browser.newContext();
  const other = second.request;
  expect((await other.get("/api/juliana")).ok()).toBeTruthy();
  expect((await (await other.get("/api/juliana")).json()).session).toBeNull();
  await second.close();
  const metrics = await (await request.get("/api/juliana?admin=1")).json();
  expect(metrics.metrics.realTransactions).toBe(0);
  expect(JSON.stringify(metrics.metrics)).not.toMatch(
    /PRUEBA-|María|Jordan|1988|REM-001/,
  );
  await action(request, "end");
  await invalid("bankingJourney", {
    journey: "save",
    step: "calculate",
    target: 12000,
    months: 12,
    saved: 0,
  });
});
test("modes and tool switches are enforced on server, Alex remains separate", async ({
  request,
}) => {
  const alexBefore = await (await request.get("/api/analytics")).json();
  for (const mode of ["community", "consulate", "fair", "mall"]) {
    await action(request, "config", { config: { ...defaultConfig, mode } });
    await action(request, "session");
    expect(
      (await (await request.get("/api/juliana")).json()).session.mode,
    ).toBe(mode);
    if (mode === "fair" || mode === "consulate")
      expect(
        (
          await request.post("/api/juliana", {
            data: {
              action: "tool",
              name: "bankingJourney",
              args: {
                journey: "pay",
                step: "prepare",
                service: "electricity",
                reference: "SERV-001",
              },
            },
          })
        ).status(),
      ).toBe(400);
  }
  await action(request, "config", {
    config: {
      ...defaultConfig,
      enabled: defaultConfig.enabled.filter((j) => j !== "loan"),
    },
  });
  expect(
    (
      await request.post("/api/juliana", {
        data: {
          action: "tool",
          name: "bankingJourney",
          args: {
            journey: "loan",
            step: "calculate",
            amount: 1000,
            months: 12,
            annualRate: 12,
          },
        },
      })
    ).status(),
  ).toBe(400);
  const alexAfter = await (await request.get("/api/analytics")).json();
  expect(alexAfter.totalSessions).toBe(alexBefore.totalSessions);
  expect(alexAfter.checkIns).toBe(alexBefore.checkIns);
  await action(request, "config", { config: defaultConfig });
});
test("catalog and synthetic dataset cover the required domains without duplicate answers", async () => {
  expect(knowledge.length).toBeGreaterThanOrEqual(150);
  expect(new Set(knowledge.map((k) => k.id)).size).toBe(knowledge.length);
  expect(new Set(knowledge.map((k) => k.answer)).size).toBe(knowledge.length);
  for (const k of knowledge)
    for (const key of [
      "id",
      "topic",
      "question",
      "answer",
      "source",
      "category",
      "validity",
      "conditions",
      "demo",
      "escalation",
    ])
      expect(k).toHaveProperty(key);
  expect([
    users.length,
    remittances.length,
    accounts.length,
    bills.length,
    products.length,
    creditScenarios.length,
    savingsGoals.length,
    locations.length,
  ]).toEqual([20, 20, 10, 10, 5, 5, 5, 10]);
});
test("touch journey, return home, live state handoff and accessible responsive UI", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/juliana");
  await page
    .getByRole("button", { name: "Enviar o cobrar remesas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Consultar envío", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Disponible en el simulador" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Menú principal", exact: true })
    .click();
  await page.waitForTimeout(4500);
  await expect(
    page.getByRole("heading", { name: /Tu próximo paso/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pagos y servicios", exact: true })
    .click();
  await page.getByRole("button", { name: "Revisar datos" }).click();
  const confirm = page.getByRole("button", { name: "Confirmar simulación" });
  await expect(confirm).toBeDisabled();
  await page.locator(".bank-consent input").check();
  await confirm.click();
  await expect(
    page.getByRole("heading", { name: "Pago simulado confirmado" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ayuda humana", exact: true }).click();
  await page
    .getByRole("button", { name: "Solicitar atención", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Solicitud en espera" }),
  ).toBeVisible();
  const api = await (await page.request.get("/api/juliana")).json();
  await action(request, "case", {
    id: api.session.cases[0].id,
    status: "accepted",
  });
  await expect(page.getByText("Un operador aceptó tu caso demo")).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: "Texto grande", exact: true }).click();
  await expect(page.locator(".bank-kiosk")).toHaveClass(/bank-large/);
  await page
    .getByRole("button", { name: "Alto contraste", exact: true })
    .click();
  for (const width of [390, 768, 1080]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("button", { name: "Finalizar y limpiar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Tu próximo paso/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("offline mode allows public questions but disables all server actions", async ({
  page,
  context,
}) => {
  await page.goto("/juliana");
  await context.setOffline(true);
  await expect(page.getByRole("status")).toContainText("Sin conexión");
  await expect(
    page.getByRole("button", { name: "Conversar con Juliana", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Buscar conocimiento público").fill("remesa");
  expect(await page.locator(".bank-knowledge details").count()).toBeGreaterThan(
    0,
  );
  await context.setOffline(false);
  await expect(
    page.getByRole("button", { name: "Conversar con Juliana", exact: true }),
  ).toBeEnabled();
});
test("admin analytics, KB switches and CSV work without leaking patient state", async ({
  page,
}) => {
  await page.goto("/juliana/admin");
  await page.getByRole("button", { name: "Analítica", exact: true }).click();
  await expect(
    page.getByText("Operaciones bancarias reales", { exact: true }),
  ).toBeVisible();
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  expect((await d).suggestedFilename()).toBe(
    "banco-interior-demo-analytics.csv",
  );
  await page.getByRole("button", { name: "Conocimiento", exact: true }).click();
  await page.getByLabel("Buscar catálogo de Juliana").fill("remesa");
  await page.locator("details summary").first().click();
  await expect(page.getByText("Disponible en consultas").first()).toBeVisible();
});
test("session expiry and explicit end reject subsequent banking actions", async ({
  request,
}) => {
  const { bankSession } = await import("../experiences/juliana/store");
  expect(() =>
    bankSession(
      {
        sessions: { expired: { expires: Date.now() - 1, ended: false } },
      } as any,
      "expired",
    ),
  ).toThrow(/Sesión finalizada/);
  expect(() =>
    bankSession(
      {
        sessions: { ended: { expires: Date.now() + 60000, ended: true } },
      } as any,
      "ended",
    ),
  ).toThrow(/Sesión finalizada/);
  await action(request, "end");
  expect((await (await request.get("/api/juliana")).json()).session).toBeNull();
  expect(
    (
      await request.post("/api/juliana", {
        data: {
          action: "tool",
          name: "bankingJourney",
          args: { journey: "help", step: "request" },
        },
      })
    ).status(),
  ).toBe(400);
});
test("discreet switcher moves both ways and ends the outgoing session", async ({
  page,
}) => {
  await page.goto("/juliana");
  await page
    .getByRole("button", { name: "Enviar o cobrar remesas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cambiar experiencia", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Elegir experiencia" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cambiar a Alex", exact: true })
    .click();
  await expect(page).toHaveURL(/\/kiosk$/);
  expect(
    (await (await page.request.get("/api/juliana")).json()).session,
  ).toBeNull();
  await page.request.post("/api/action", {
    data: { action: "session", language: "en" },
  });
  await page
    .getByRole("button", { name: "Cambiar experiencia", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cambiar a Juliana", exact: true })
    .click();
  await expect(page).toHaveURL(/\/juliana$/);
  expect(
    (
      await page.request.post("/api/action", {
        data: {
          action: "tool",
          name: "searchAppointment",
          args: { name: "Jordan Rivera", dob: "1988-04-12", code: "1042" },
        },
      })
    ).status(),
  ).toBe(400);
  await page.keyboard.press("Alt+Shift+KeyE");
  await expect(
    page.getByRole("dialog", { name: "Elegir experiencia" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Elegir experiencia" }),
  ).toBeHidden();
});
