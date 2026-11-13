import { test, expect } from "@playwright/test";
import {
  MAX_CALL_SECONDS,
  voiceBudgetReason,
  isVoiceActivity,
} from "../lib/voice-budget";
import { startConversation } from "../lib/tavus";
import { startBankConversation } from "../experiences/juliana/provider";

test("silence, stalled connection and absolute budgets are independent", () => {
  expect(voiceBudgetReason(44999, 0, 0, false)).toBeNull();
  expect(voiceBudgetReason(45000, 0, 0, false)).toBe("connection");
  expect(voiceBudgetReason(89999, 0, 0, true)).toBeNull();
  expect(voiceBudgetReason(90000, 0, 0, true)).toBe("idle");
  expect(voiceBudgetReason(180000, 0, 179999, true)).toBeNull();
  expect(voiceBudgetReason(300000, 0, 299999, true)).toBe("limit");
  expect(isVoiceActivity({ event_type: "heartbeat" })).toBe(false);
  expect(isVoiceActivity({ event_type: "conversation.utterance" })).toBe(true);
});

test("both provider create payloads enforce five minutes and absent/left cutoffs", async () => {
  const originalFetch = globalThis.fetch;
  const keys = [
    "TAVUS_API_KEY",
    "TAVUS_PAL_ID",
    "TAVUS_REPLICA_ID",
    "JULIANA_PAL_ID",
    "JULIANA_FACE_ID",
  ];
  const original = keys.map((k) => process.env[k]);
  keys.forEach((k) => (process.env[k] = k));
  const payloads: any[] = [];
  globalThis.fetch = async (_input, init) => {
    payloads.push(JSON.parse(init!.body as string));
    return Response.json({
      conversation_id: "fake",
      conversation_url: "https://example.test",
    });
  };
  try {
    await startConversation("en");
    await startBankConversation({ language: "es", mode: "community" } as any);
    expect(payloads).toHaveLength(2);
    for (const p of payloads) {
      expect(p.properties.max_call_duration).toBe(MAX_CALL_SECONDS);
      expect(p.properties.participant_left_timeout).toBe(10);
      expect(p.properties.participant_absent_timeout).toBe(30);
      expect(p.properties.enable_recording).toBe(false);
    }
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((k, i) => {
      if (original[i] === undefined) delete process.env[k];
      else process.env[k] = original[i];
    });
  }
});

for (const [route, button] of [
  ["/kiosk", "Talk to Alex"],
  ["/juliana", "Conversar con Juliana"],
]) {
  test(`${route}: browsing frames creates no calls and another tab's call blocks creation`, async ({
    page,
  }) => {
    let creates = 0;
    await page.route("**/api/**", async (intercepted) => {
      const req = intercepted.request();
      if (req.method() === "POST" && req.postDataJSON()?.action === "avatar") {
        creates++;
        await intercepted.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Mock provider: no paid calls" }),
        });
      } else await intercepted.continue();
    });
    await page.goto(route);
    for (let i = 0; i < 3; i++)
      await page.locator(".device-selector button").nth(i).click();
    expect(creates).toBe(0);
    // Hold the same browser-origin lock used by another live demo tab.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          void navigator.locks.request("ai-kiosk-live-voice", async () => {
            resolve();
            await new Promise(() => {});
          });
        }),
    );
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(page.getByText(/Another demo call is active/)).toBeVisible();
    expect(creates).toBe(0);
    await expect(
      page.getByRole("button", { name: "End avatar call", exact: true }),
    ).toHaveCount(0);
  });
}

for (const [route, button] of [
  ["/kiosk", "Talk to Alex"],
  ["/juliana", "Conversar con Juliana"],
]) {
  test(`${route}: stalled connection stops without automatic paid retries`, async ({
    page,
  }) => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    let creates = 0;
    await page.route("**/api/**", async (intercepted) => {
      const req = intercepted.request();
      if (req.method() === "POST" && req.postDataJSON()?.action === "avatar") {
        creates++;
        await hold;
        await intercepted.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Mock provider" }),
        });
      } else await intercepted.continue();
    });
    await page.goto(route);
    await page.clock.install();
    try {
      await page.getByRole("button", { name: button, exact: true }).click();
      await expect.poll(() => creates).toBe(1);
      await page.clock.fastForward(46000);
      await expect(
        page.getByText(/Connection timed out|La conexión tardó demasiado/),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "End avatar call", exact: true }),
      ).toHaveCount(0);
      release();
      await page.clock.fastForward(60000);
      expect(creates).toBe(1);
    } finally {
      release();
    }
  });
}

test("Alex cleanup retains failed closes, ignores stale IDs and closes ended sessions", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const { createSession, read, mutate } = await import("../lib/store");
  const { closeVoice, drainVoice } = await import("../lib/voice-lifecycle");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alex-budget-"));
  const originalFile = process.env.DEMO_DATA_FILE,
    originalFetch = globalThis.fetch;
  process.env.DEMO_DATA_FILE = path.join(dir, "demo.json");
  let fail = true,
    requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return new Response(null, { status: fail ? 503 : 204 });
  };
  try {
    const s = createSession("en");
    mutate((db) => {
      db.sessions[s.id].conversation = {
        id: "new",
        url: "https://example.test",
      };
    });
    await closeVoice(s.id, "old");
    expect(requests).toBe(0);
    await expect(closeVoice(s.id, "new", true)).rejects.toThrow();
    expect(read().sessions[s.id].ended).toBe(true);
    expect(read().sessions[s.id].conversation).toBeUndefined();
    expect(read().sessions[s.id].pendingEndId).toBe("new");
    fail = false;
    await drainVoice(s.id);
    expect(requests).toBe(2);
    expect(read().sessions[s.id].pendingEndId).toBeUndefined();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalFile === undefined) delete process.env.DEMO_DATA_FILE;
    else process.env.DEMO_DATA_FILE = originalFile;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
