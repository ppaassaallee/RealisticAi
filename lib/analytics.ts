import { read } from "./store";
export type EventType =
  | "session_started"
  | "appointment_found"
  | "lookup_unverified"
  | "appointment_missing"
  | "check_in_completed"
  | "check_in_duplicate"
  | "handoff_requested"
  | "handoff_accepted"
  | "handoff_resolved"
  | "tool_error"
  | "avatar_connected"
  | "avatar_error"
  | "response_observed";
export type OperationalEvent = {
  id: string;
  at: number;
  sessionId: string;
  type: EventType;
  language: "en" | "es";
  presentation: "kiosk" | "tablet" | "web";
  durationMs?: number;
};
export function aggregate(
  events: OperationalEvent[],
  days: number,
  now = Date.now(),
) {
  const start = now - days * 86400000;
  const e = events.filter((e) => e.at >= start && e.at <= now);
  const count = (type: EventType) => e.filter((x) => x.type === type).length;
  const started = e.filter((x) => x.type === "session_started");
  const handoffs = e.filter((x) => x.type === "handoff_requested");
  const responses = e
    .filter((x) => x.type === "response_observed" && x.durationMs !== undefined)
    .map((x) => x.durationMs!);
  const toolTimes = e
    .filter(
      (x) =>
        [
          "appointment_found",
          "lookup_unverified",
          "appointment_missing",
          "check_in_completed",
          "check_in_duplicate",
          "tool_error",
        ].includes(x.type) && x.durationMs !== undefined,
    )
    .map((x) => x.durationMs!);
  const accepted = e.filter((x) => x.type === "handoff_accepted");
  const waits = accepted.flatMap((a) => {
    const requested = events
      .filter(
        (x) =>
          x.type === "handoff_requested" &&
          x.sessionId === a.sessionId &&
          x.at <= a.at,
      )
      .at(-1);
    return requested ? [a.at - requested.at] : [];
  });
  const mean = (n: number[]) =>
    n.length ? Math.round(n.reduce((a, b) => a + b, 0) / n.length) : null;
  const cohortIds = new Set(started.map((x) => x.sessionId));
  const cohort = e.filter((x) => cohortIds.has(x.sessionId));
  const unique = (types: EventType[]) =>
    new Set(
      cohort.filter((x) => types.includes(x.type)).map((x) => x.sessionId),
    ).size;
  const lookups = unique([
    "appointment_found",
    "appointment_missing",
    "lookup_unverified",
  ]);
  const completed = unique(["check_in_completed"]);
  const bucketCount = days === 1 ? 12 : days;
  const bucketWidth = (days * 86400000) / bucketCount;
  const series = Array.from({ length: bucketCount }, (_, i) => {
    const from = start + i * bucketWidth,
      to = from + bucketWidth;
    return {
      at: to,
      sessions: started.filter((x) => x.at >= from && x.at < to).length,
      checkIns: e.filter(
        (x) => x.type === "check_in_completed" && x.at >= from && x.at < to,
      ).length,
    };
  });
  return {
    days,
    generatedAt: now,
    totalSessions: started.length,
    checkIns: count("check_in_completed"),
    handoffs: handoffs.length,
    resolved: count("handoff_resolved"),
    accepted: accepted.length,
    errors: count("tool_error") + count("avatar_error"),
    responseMs: mean(responses),
    responseSamples: responses.length,
    toolMs: mean(toolTimes),
    waitMs: mean(waits),
    completionRate: lookups ? Math.round((completed / lookups) * 100) : null,
    lookupSessions: lookups,
    series,
    languages: [
      {
        label: "English",
        count: started.filter((x) => x.language === "en").length,
      },
      {
        label: "Español",
        count: started.filter((x) => x.language === "es").length,
      },
    ],
    presentations: ["kiosk", "tablet", "web"].map((label) => ({
      label,
      count: started.filter((x) => x.presentation === label).length,
    })),
    funnel: [
      { label: "Sessions started", count: started.length },
      { label: "Appointment looked up", count: lookups },
      {
        label: "Identity verified",
        count: unique(["appointment_found", "appointment_missing"]),
      },
      { label: "Check-in completed", count: completed },
    ],
    activity: e
      .filter((x) => x.type !== "response_observed")
      .slice(-12)
      .reverse()
      .map(({ sessionId, ...safe }) => safe),
  };
}
export function getAnalytics(days: number) {
  return aggregate(read().events || [], days);
}
export function sampleAnalytics(days: number) {
  const now = Date.now();
  const events: OperationalEvent[] = [];
  let n = 0;
  for (let d = 0; d < days; d++) {
    const total = days === 1 ? 34 : 12 + ((d * 7) % 23);
    for (let i = 0; i < total; i++) {
      const sid = `sample-${d}-${i}`,
        at = now - d * 86400000 - (i + 1) * (days === 1 ? 1800000 : 2100000);
      const base = {
        sessionId: sid,
        at,
        language: (i % 4 === 0 ? "es" : "en") as "en" | "es",
        presentation: (["kiosk", "tablet", "web"] as const)[i % 3],
      };
      const push = (type: EventType, offset: number, durationMs?: number) =>
        events.push({
          ...base,
          id: `sample-${++n}`,
          type,
          at: at + offset,
          durationMs,
        });
      push("session_started", 0);
      if (i % 7 !== 0) {
        push("appointment_found", 15000, 90 + i * 7);
        if (i % 4 !== 0) push("check_in_completed", 32000, 30 + i * 2);
      }
      if (i % 4 === 0) {
        push("handoff_requested", 40000);
        push("handoff_accepted", 65000);
        if (i % 8 === 0) push("handoff_resolved", 110000);
      }
      push("response_observed", 8000, 900 + i * 45);
      if (i % 17 === 0) push("avatar_error", 5000);
    }
  }
  return aggregate(
    events.sort((a, b) => a.at - b.at),
    days,
    now,
  );
}
export type Analytics = ReturnType<typeof aggregate>;
