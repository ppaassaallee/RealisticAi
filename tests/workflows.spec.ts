import { test, expect } from "@playwright/test";
const act = async (request: any, action: string, params: any = {}) => {
  const r = await request.post("/api/action", { data: { action, ...params } });
  return { status: r.status(), body: await r.json() };
};
test.beforeEach(async ({ request }) => {
  await act(request, "reset");
});
test("identity privacy, ownership, explicit confirmation, duplicate safety and durable state", async ({
  request,
}) => {
  await act(request, "session");
  let r = await act(request, "tool", {
    name: "searchAppointment",
    args: { name: "Jordan Rivera", dob: "1988-04-12", code: "9999" },
  });
  expect(r.body.status).toBe("not_verified");
  expect(r.body.appointments).toBeUndefined();
  r = await act(request, "tool", {
    name: "checkInAppointment",
    args: { appointmentId: "a1", confirmed: true },
  });
  expect(r.status).toBe(400);
  r = await act(request, "tool", {
    name: "searchAppointment",
    args: { name: "Jordan Rivera", dob: "1988-04-12", code: "1042" },
  });
  expect(r.body.appointments).toHaveLength(1);
  expect(
    (
      await act(request, "tool", {
        name: "checkInAppointment",
        args: { appointmentId: "a6", confirmed: true },
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await act(request, "tool", {
        name: "checkInAppointment",
        args: { appointmentId: "a1", confirmed: false },
      })
    ).status,
  ).toBe(400);
  const results = await Promise.all(
    [1, 2].map(() =>
      act(request, "tool", {
        name: "checkInAppointment",
        args: { appointmentId: "a1", confirmed: true },
      }),
    ),
  );
  expect(results.map((r) => r.body.status).sort()).toEqual([
    "already_checked_in",
    "checked_in",
  ]);
  const state = await (await request.get("/api/state")).json();
  expect(state.patient.appointments[0].checkedIn).toBe(true);
  await act(request, "session");
  expect((await (await request.get("/api/state")).json()).patient).toBeNull();
});
test("touchscreen check-in, session end, repeat without page reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/kiosk");
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  await page.getByLabel("Full name").fill("Jordan Rivera");
  await page.getByLabel("Date of birth").fill("1988-04-12");
  await page.getByLabel("Patient code").fill("1042");
  await page.getByRole("button", { name: "Find my appointment" }).click();
  await page.getByRole("button", { name: "Confirm check-in" }).click();
  await expect(
    page.getByText(
      "You’re checked in. Take a seat; our team will call you shortly.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "End session", exact: true }).click();
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  await expect(page.getByLabel("Full name")).toBeVisible();
  expect(errors).toEqual([]);
});
test("missing appointment handoff and staff acceptance synchronize across browsers", async ({
  page,
  browser,
}) => {
  const staffContext = await browser.newContext();
  const staff = await staffContext.newPage();
  await staff.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:3000") + "/staff",
  );
  await page.goto("/kiosk");
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  await page.getByLabel("Full name").fill("Taylor Morgan");
  await page.getByLabel("Date of birth").fill("1992-08-21");
  await page.getByLabel("Patient code").fill("2043");
  await page.getByRole("button", { name: "Find my appointment" }).click();
  await expect(
    page.getByText(
      "We couldn’t find an appointment. Let’s ask our team to help.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ask the front desk for help" })
    .click();
  await expect(
    staff.getByRole("button", { name: "Accept handoff" }),
  ).toBeVisible();
  await staff.getByRole("button", { name: "Accept handoff" }).click();
  await expect(page.getByText("A person is here to help.")).toBeVisible();
  await staff.getByRole("button", { name: "Resolve request" }).click();
  await expect(page.getByText("Your request is resolved.")).toBeVisible();
  await staffContext.close();
});
test("Spanish flow and portrait/mobile layouts", async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto("/kiosk");
  await page.getByRole("button", { name: "ES", exact: true }).click();
  await page.getByRole("button", { name: "Registrarme", exact: true }).click();
  await page.getByLabel("Nombre completo").fill("Sofia Martinez");
  await page.getByLabel("Fecha de nacimiento").fill("1990-06-18");
  await page.getByLabel("Código del paciente").fill("5046");
  await page.getByRole("button", { name: "Buscar mi cita" }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(
    page.getByText(
      "Ya estás registrado. Toma asiento; nuestro equipo te llamará.",
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("multiple appointments, already checked in, technical failure, idempotent handoff and reset", async ({
  request,
}) => {
  await act(request, "session");
  let r = await act(request, "tool", {
    name: "searchAppointment",
    args: { name: "Alex Chen", dob: "1986-02-14", code: "4045" },
  });
  expect(r.body.appointments).toHaveLength(2);
  r = await act(request, "tool", {
    name: "searchAppointment",
    args: { name: "Sam Bennett", dob: "1975-11-03", code: "3044" },
  });
  expect(r.body.appointments[0].checkedIn).toBe(true);
  r = await act(request, "tool", {
    name: "searchAppointment",
    args: { name: "Casey Brooks", dob: "1983-09-27", code: "6047" },
  });
  expect(r.body.status).toBe("technical_error");
  expect((await (await request.get("/api/state")).json()).patient).toBeNull();
  const one = await act(request, "tool", {
    name: "requestHumanAssistance",
    args: { reason: "Technical error" },
  });
  const two = await act(request, "tool", {
    name: "requestHumanAssistance",
    args: { reason: "Technical error" },
  });
  expect(one.body.id).toBe(two.body.id);
  await act(request, "reset");
  const s = await (await request.get("/api/state")).json();
  expect(s.cases).toHaveLength(0);
  expect(s.session.ended).toBe(true);
});
test("cross-origin mutations rejected and ended sessions cannot execute tools", async ({
  request,
}) => {
  const r = await request.post("/api/action", {
    headers: { origin: "https://untrusted.example" },
    data: { action: "reset" },
  });
  expect(r.status()).toBe(403);
  await act(request, "session");
  await act(request, "end");
  expect(
    (
      await act(request, "tool", {
        name: "requestHumanAssistance",
        args: { reason: "Help please" },
      })
    ).status,
  ).toBe(400);
});
