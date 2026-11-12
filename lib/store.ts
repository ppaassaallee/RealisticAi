import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
export type Language = "en" | "es";
export type Patient = {
  id: string;
  name: string;
  dob: string;
  code: string;
  appointments: {
    id: string;
    time: string;
    department: string;
    checkedIn: boolean;
  }[];
  error?: boolean;
};
export type Case = {
  id: string;
  sessionId: string;
  language: Language;
  reason: string;
  context: string;
  summary: string;
  status: "waiting" | "accepted" | "resolved";
  createdAt: string;
  clinic: string;
  kiosk: string;
};
export type Session = {
  id: string;
  language: Language;
  verifiedPatientId?: string;
  name?: string;
  lookup?: string;
  ended?: boolean;
  failure?: boolean;
  conversation?: { id: string; url: string; token?: string };
  providerStatus?: string;
  createdAt: number;
};
type Store = {
  patients: Patient[];
  sessions: Record<string, Session>;
  cases: Case[];
  revision: number;
};
const file = () =>
  path.resolve(process.env.DEMO_DATA_FILE || "./data/demo.json");
export function seed(): Patient[] {
  return [
    {
      id: "p1",
      name: "Jordan Rivera",
      dob: "1988-04-12",
      code: "1042",
      appointments: [
        {
          id: "a1",
          time: "09:30 AM",
          department: "Primary care",
          checkedIn: false,
        },
      ],
    },
    {
      id: "p2",
      name: "Taylor Morgan",
      dob: "1992-08-21",
      code: "2043",
      appointments: [],
    },
    {
      id: "p3",
      name: "Sam Bennett",
      dob: "1975-11-03",
      code: "3044",
      appointments: [
        {
          id: "a3",
          time: "10:00 AM",
          department: "Primary care",
          checkedIn: true,
        },
      ],
    },
    {
      id: "p4",
      name: "Alex Chen",
      dob: "1986-02-14",
      code: "4045",
      appointments: [
        {
          id: "a4",
          time: "10:30 AM",
          department: "Primary care",
          checkedIn: false,
        },
        {
          id: "a5",
          time: "11:15 AM",
          department: "Wellness visit",
          checkedIn: false,
        },
      ],
    },
    {
      id: "p5",
      name: "Sofia Martinez",
      dob: "1990-06-18",
      code: "5046",
      appointments: [
        {
          id: "a6",
          time: "11:00 AM",
          department: "Primary care",
          checkedIn: false,
        },
      ],
    },
    {
      id: "p6",
      name: "Casey Brooks",
      dob: "1983-09-27",
      code: "6047",
      appointments: [],
      error: true,
    },
  ];
}
export function read(): Store {
  if (!fs.existsSync(file()))
    write({ patients: seed(), sessions: {}, cases: [], revision: 0 });
  return JSON.parse(fs.readFileSync(file(), "utf8"));
}
function write(db: Store) {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  const temp = file() + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(db), { mode: 0o600 });
  fs.renameSync(temp, file());
}
// Synchronous read/modify/atomic-rename is serialized by the single Node event loop.
export function mutate<T>(fn: (db: Store) => T): T {
  const db = read();
  const result = fn(db);
  db.revision++;
  write(db);
  return result;
}
export function createSession(language: Language) {
  return mutate((db) => {
    const s: Session = { id: randomUUID(), language, createdAt: Date.now() };
    db.sessions[s.id] = s;
    return s;
  });
}
export function session(db: Store, id: string) {
  const s = db.sessions[id];
  if (!s || s.ended || Date.now() - s.createdAt > 4 * 60 * 60 * 1000)
    throw new Error("Session expired. Start a new session.");
  return s;
}
export function snapshot(id?: string, staff = false) {
  const db = read();
  if (staff)
    return {
      cases: db.cases,
      revision: db.revision,
      sessions: Object.values(db.sessions)
        .filter((s) => !s.ended)
        .map((s) => ({
          id: s.id,
          language: s.language,
          providerStatus: s.providerStatus || "offline",
        })),
    };
  const s = id ? db.sessions[id] : undefined;
  const patient =
    s?.verifiedPatientId &&
    !s.ended &&
    Date.now() - s.createdAt < 4 * 60 * 60 * 1000
      ? db.patients.find((p) => p.id === s.verifiedPatientId)
      : undefined;
  return {
    session: s
      ? {
          id: s.id,
          language: s.language,
          ended: s.ended,
          lookup: s.lookup,
          providerStatus: s.providerStatus,
        }
      : null,
    patient: patient
      ? { name: patient.name, appointments: patient.appointments }
      : null,
    cases: db.cases.filter((c) => c.sessionId === id),
    revision: db.revision,
  };
}
const identity = z.object({
  name: z.string().trim().min(2).max(100),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  code: z.string().regex(/^\d{4}$/),
});
const checkin = z.object({
  appointmentId: z.string().min(1).max(50),
  confirmed: z.literal(true),
});
const handoff = z.object({
  reason: z.string().trim().min(3).max(300),
  language: z.enum(["en", "es"]).optional(),
});
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
export function executeTool(id: string, name: string, args: unknown) {
  return mutate((db) => {
    const s = session(db, id);
    if (name === "searchAppointment") {
      const input = identity.parse(args);
      delete s.verifiedPatientId;
      s.name = input.name;
      if (s.failure) {
        s.lookup = "technical_error";
        return { status: "technical_error", offerHumanAssistance: true };
      }
      const matches = db.patients.filter(
        (p) =>
          normalize(p.name) === normalize(input.name) &&
          p.dob === input.dob &&
          p.code === input.code,
      );
      if (matches.length !== 1) {
        s.lookup = "not_verified";
        return {
          status: "not_verified",
          message:
            "Identity could not be verified. Check the supplied details or request human assistance.",
        };
      }
      const p = matches[0];
      if (p.error) {
        s.lookup = "technical_error";
        return { status: "technical_error", offerHumanAssistance: true };
      }
      s.verifiedPatientId = p.id;
      s.lookup = p.appointments.length ? "found" : "missing";
      return {
        status: s.lookup,
        patientName: p.name,
        appointments: p.appointments,
      };
    }
    if (name === "checkInAppointment") {
      const input = checkin.parse(args);
      if (s.failure) return { status: "technical_error" };
      if (!s.verifiedPatientId)
        throw new Error("Identity verification is required.");
      const p = db.patients.find((p) => p.id === s.verifiedPatientId)!;
      const a = p.appointments.find((a) => a.id === input.appointmentId);
      if (!a)
        throw new Error("Appointment does not belong to the verified patient.");
      const already = a.checkedIn;
      a.checkedIn = true;
      return {
        status: already ? "already_checked_in" : "checked_in",
        appointment: a,
        patientName: p.name,
      };
    }
    if (name === "requestHumanAssistance") {
      const input = handoff.parse(args);
      if (input.language) s.language = input.language;
      const existing = db.cases.find(
        (c) => c.sessionId === id && c.status !== "resolved",
      );
      if (existing) return existing;
      const context = `${s.name || "Name not collected"}; identity ${s.verifiedPatientId ? "verified" : "not verified"}; lookup ${s.lookup || "not attempted"}.`;
      const c: Case = {
        id: randomUUID(),
        sessionId: id,
        language: s.language,
        reason: input.reason,
        context,
        summary: `Concierge handoff: ${input.reason}. ${context}`,
        status: "waiting",
        createdAt: new Date().toISOString(),
        clinic: "OneSource · Welcome clinic",
        kiosk: "Kiosk 01",
      };
      db.cases.unshift(c);
      return c;
    }
    throw new Error("Unknown tool.");
  });
}
export function reset() {
  return mutate((db) => {
    db.patients = seed();
    db.cases = [];
    for (const s of Object.values(db.sessions)) {
      s.ended = true;
      delete s.verifiedPatientId;
    }
    return { ok: true };
  });
}
