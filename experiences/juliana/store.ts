import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  defaultConfig,
  type BankConfig,
  type Journey,
  type Mode,
} from "./config";
export type Result = {
  title: string;
  message: string;
  kind: "information" | "simulation" | "request";
  details?: string[];
  reference?: string;
  pendingId?: string;
  links?: { title: string; url: string }[];
};
export type BankSession = {
  id: string;
  created: number;
  expires: number;
  mode: Mode;
  language: "es" | "en";
  journey?: Journey;
  result?: Result;
  verified?: string;
  ended?: boolean;
  calls: number;
  pending?: { id: string; journey: Journey; args: Record<string, unknown> };
  conversation?: { id: string; url: string; token?: string };
};
export type BankEvent = {
  id: string;
  at: number;
  session: string;
  type: string;
  journey?: Journey;
  mode: Mode;
  duration?: number;
  value?: number;
};
export type BankCase = {
  id: string;
  session: string;
  queue: "general" | "fraud" | "products";
  status: "waiting" | "accepted" | "resolved";
  at: number;
};
type BankStore = {
  version: 1;
  config: BankConfig;
  sessions: Record<string, BankSession>;
  events: BankEvent[];
  cases: BankCase[];
  payments: Record<string, string>;
  requests: {
    id: string;
    session: string;
    journey: Journey;
    consent: boolean;
  }[];
};
function file() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.env.BANK_DATA_FILE ||
      "data/juliana/store.json",
  );
}
export function readBank(): BankStore {
  if (!fs.existsSync(/*turbopackIgnore: true*/ file()))
    return {
      version: 1,
      config: structuredClone(defaultConfig),
      sessions: {},
      events: [],
      cases: [],
      payments: {},
      requests: [],
    };
  return JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file(), "utf8"));
}
export function writeBank<T>(fn: (db: BankStore) => T): T {
  const db = readBank();
  const result = fn(db);
  db.events = db.events.slice(-10000);
  for (const [id, s] of Object.entries(db.sessions))
    if (s.expires < Date.now() && !s.conversation) delete db.sessions[id];
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  const tmp = file() + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 });
  fs.renameSync(tmp, file());
  return result;
}
export function bankSession(db: BankStore, id: string): BankSession {
  const s = db.sessions[id];
  if (!s || s.ended || s.expires < Date.now())
    throw new Error("Sesión finalizada. Empezá una nueva sesión.");
  return s;
}
export function event(
  db: BankStore,
  s: BankSession,
  type: string,
  extra: Partial<BankEvent> = {},
) {
  db.events.push({
    id: randomUUID(),
    at: Date.now(),
    session: s.id,
    type,
    mode: s.mode,
    journey: s.journey,
    ...extra,
  });
}
export function newBankSession(language?: "es" | "en") {
  return writeBank((db) => {
    const now = Date.now();
    const s: BankSession = {
      id: randomUUID(),
      created: now,
      expires: now + 30 * 60 * 1000,
      mode: db.config.mode,
      language: language || db.config.language,
      calls: 0,
    };
    db.sessions[s.id] = s;
    event(db, s, "session_started");
    return s;
  });
}
export function publicSession(s: BankSession, db = readBank()) {
  return {
    id: s.id,
    mode: s.mode,
    language: s.language,
    journey: s.journey,
    result: s.result,
    expires: s.expires,
    cases: db.cases
      .filter((c) => c.session === s.id)
      .map(({ session, ...c }) => c),
  };
}
export function bankMetrics(db = readBank()) {
  const e = db.events,
    starts = e.filter((e) => e.type === "session_started"),
    done = e.filter((e) => e.type === "journey_completed"),
    ended = e.filter((e) => e.type === "session_ended");
  const mean = (a: number[]) =>
    a.length ? Math.round(a.reduce((a, b) => a + b, 0) / a.length) : null;
  return {
    interactions: starts.length,
    users: null,
    started: e.filter((e) => e.type === "journey_started").length,
    completed: done.length,
    selfService: new Set(
      done
        .filter((d) => !db.cases.some((c) => c.session === d.session))
        .map((d) => d.session),
    ).size,
    escalations: db.cases.length,
    abandoned: starts.filter(
      (s) =>
        !done.some((d) => d.session === s.session) &&
        (s.at + 30 * 60 * 1000 < Date.now() ||
          ended.some((d) => d.session === s.session)),
    ).length,
    averageDuration: mean(ended.map((e) => e.duration || 0)),
    errors: e.filter((e) => e.type === "error").length,
    availability: null,
    consented: db.requests.filter((r) => r.consent).length,
    satisfaction: mean(
      e.filter((e) => e.type === "satisfaction").map((e) => e.value || 0),
    ),
    simulations: e.filter((e) => e.type === "simulation").length,
    information: e.filter((e) => e.type === "information").length,
    requests: db.requests.length,
    realTransactions: 0,
    modes:
      Object.keys(defaultConfig).length &&
      ["community", "consulate", "fair", "mall"].map((mode) => ({
        mode,
        count: starts.filter((e) => e.mode === mode).length,
      })),
    intents: Object.entries(
      Object.groupBy(
        e.filter((e) => e.type === "journey_started"),
        (e) => e.journey || "other",
      ),
    ).map(([journey, events]) => ({ journey, count: events?.length || 0 })),
    recent: e
      .slice(-30)
      .reverse()
      .map(({ session, ...rest }) => rest),
  };
}
