import { test, expect } from "@playwright/test";
import { defaultConfig } from "../experiences/juliana/config";
test("bank roles isolate credentials and enforce administrator/operator/viewer permissions", async ({
  playwright,
}) => {
  test.skip(
    process.env.BANK_ROLE_TEST !== "1",
    "Requires isolated server with QA-only role credentials.",
  );
  const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
  const anon = await playwright.request.newContext({ baseURL });
  const admin = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { authorization: "Bearer qa-admin-example" },
  });
  const operator = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { authorization: "Bearer qa-operator-example" },
  });
  const viewer = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { authorization: "Bearer qa-viewer-example" },
  });
  try {
    expect((await anon.get("/api/juliana?admin=1")).status()).toBe(401);
    for (const [r, role] of [
      [admin, "admin"],
      [operator, "operator"],
      [viewer, "viewer"],
    ] as const)
      expect((await (await r.get("/api/juliana?admin=1")).json()).role).toBe(
        role,
      );
    for (const r of [anon, operator, viewer])
      expect(
        (
          await r.post("/api/juliana", {
            data: { action: "config", config: defaultConfig },
          })
        ).status(),
      ).toBe(403);
    expect(
      (
        await admin.post("/api/juliana", {
          data: { action: "config", config: defaultConfig },
        })
      ).ok(),
    ).toBe(true);
    await anon.post("/api/juliana", { data: { action: "session" } });
    const c = await (
      await anon.post("/api/juliana", {
        data: {
          action: "tool",
          name: "bankingJourney",
          args: { journey: "help", step: "request" },
        },
      })
    ).json();
    expect(
      (
        await viewer.post("/api/juliana", {
          data: { action: "case", id: c.reference, status: "accepted" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await operator.post("/api/juliana", {
          data: { action: "case", id: c.reference, status: "accepted" },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await anon.post("/api/juliana", {
          data: { action: "login", token: "wrong" },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await anon.post("/api/juliana", {
          data: { action: "login", token: "qa-viewer-example" },
        })
      ).ok(),
    ).toBe(true);
    expect((await (await anon.get("/api/juliana?admin=1")).json()).role).toBe(
      "viewer",
    );
  } finally {
    for (const r of [anon, admin, operator, viewer]) await r.dispose();
  }
});
