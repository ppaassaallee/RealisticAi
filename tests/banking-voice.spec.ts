import { test, expect } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  isConversationActivity,
  sessionShouldExpire,
} from "../experiences/juliana/voice";
import { classifyTavusError, TavusError } from "../lib/tavus";
import {
  closeBankVoice,
  drainBankVoice,
} from "../experiences/juliana/lifecycle";
import {
  newBankSession,
  readBank,
  writeBank,
} from "../experiences/juliana/store";
import { bankVoiceError } from "../experiences/juliana/provider";

test("spoken turns renew inactivity but preserve silence and absolute expiry", () => {
  let lastActivity = 0;
  for (const now of [60000, 120000, 180000, 240000]) {
    if (isConversationActivity({ event_type: "conversation.started_speaking" }))
      lastActivity = now;
    expect(sessionShouldExpire(now + 1000, lastActivity, 600000)).toBe(false);
  }
  expect(isConversationActivity({ event_type: "heartbeat" })).toBe(false);
  expect(sessionShouldExpire(361000, lastActivity, 600000)).toBe(true);
  expect(sessionShouldExpire(600000, 599999, 600000)).toBe(true);
});

test("provider failures have actionable safe messages", () => {
  expect(classifyTavusError(429, "concurrent conversation limit")).toBe(
    "concurrency",
  );
  expect(classifyTavusError(400, "minutes exhausted")).toBe("quota");
  expect(classifyTavusError(429, "too many requests")).toBe("rate_limit");
  expect(classifyTavusError(401, "unauthorized")).toBe("credentials");
  expect(classifyTavusError(503, "provider secret detail")).toBe("unavailable");
  expect(bankVoiceError(new TavusError(402, "quota"))?.message).toContain(
    "minutos",
  );
});

test("stale closes cannot stop a newer call; failed closes retry before reconnect", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "juliana-voice-"));
  const originalFile = process.env.BANK_DATA_FILE,
    originalFetch = globalThis.fetch;
  process.env.BANK_DATA_FILE = path.join(dir, "store.json");
  const requests: string[] = [];
  let fail = false;
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    return new Response(null, { status: fail ? 503 : 204 });
  };
  try {
    const s = newBankSession("es");
    writeBank((db) => {
      db.sessions[s.id].conversation = {
        id: "new-call",
        url: "https://example.test",
      };
    });
    await closeBankVoice(s.id, "old-call");
    expect(requests).toHaveLength(0);
    expect(readBank().sessions[s.id].conversation?.id).toBe("new-call");
    fail = true;
    await expect(closeBankVoice(s.id, "new-call")).rejects.toThrow();
    expect(readBank().sessions[s.id].conversation).toBeUndefined();
    expect(readBank().sessions[s.id].pendingEndId).toBe("new-call");
    fail = false;
    await drainBankVoice(s.id);
    expect(readBank().sessions[s.id].pendingEndId).toBeUndefined();
    expect(requests).toHaveLength(2);
    await closeBankVoice(s.id, "new-call");
    expect(requests).toHaveLength(2);
    const epoch = readBank().sessions[s.id].voiceEpoch!;
    await closeBankVoice(s.id);
    expect(readBank().sessions[s.id].voiceEpoch).toBeGreaterThan(epoch);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalFile === undefined) delete process.env.BANK_DATA_FILE;
    else process.env.BANK_DATA_FILE = originalFile;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("quota failure releases call controls and leaves touchscreen usable", async ({
  page,
}) => {
  await page.route("**/api/juliana", async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.postDataJSON()?.action === "avatar") {
      await route.fulfill({
        status: 402,
        contentType: "application/json",
        body: JSON.stringify({
          code: "quota",
          error:
            "Se agotaron los minutos de Tavus. Revisá Billing en tu workspace. Podés seguir usando la pantalla.",
        }),
      });
    } else await route.continue();
  });
  await page.goto("/juliana");
  await page
    .getByRole("button", { name: "Conversar con Juliana", exact: true })
    .click();
  await expect(
    page.getByText("Se agotaron los minutos de Tavus.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Conversar con Juliana", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "End avatar call", exact: true }),
  ).toHaveCount(0);
  await page.request.post("/api/juliana", { data: { action: "end" } });
});
