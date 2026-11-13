import { test, expect } from "@playwright/test";
import { aggregate, type OperationalEvent } from "../lib/analytics";
test("funnel stays inside its start-date cohort and empty timings stay unknown", () => {
  const now = Date.now();
  const event = (
    id: string,
    type: OperationalEvent["type"],
    at: number,
  ): OperationalEvent => ({
    id: id + type,
    sessionId: id,
    type,
    at,
    language: "en",
    presentation: "kiosk",
  });
  const metrics = aggregate(
    [
      event("older", "session_started", now - 2 * 86400000),
      event("older", "appointment_found", now - 2 * 86400000 + 1000),
      event("older", "check_in_completed", now - 1000),
      event("new", "session_started", now - 5000),
      event("new", "appointment_found", now - 4000),
    ],
    1,
    now,
  );
  expect(metrics.checkIns).toBe(1);
  expect(metrics.funnel.at(-1)?.count).toBe(0);
  expect(metrics.completionRate).toBe(0);
  expect(metrics.responseMs).toBeNull();
  expect(metrics.waitMs).toBeNull();
});
