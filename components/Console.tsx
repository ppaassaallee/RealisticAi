"use client";
import Brand from "./Brand";
import Channels from "./Channels";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Headphones,
  RefreshCw,
  Users,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { action } from "@/lib/client";
import type { Case } from "@/lib/store";
const examples = [
  {
    name: "Jordan Rivera",
    dob: "1988-04-12",
    code: "1042",
    scenario: "Successful check-in",
  },
  {
    name: "Taylor Morgan",
    dob: "1992-08-21",
    code: "2043",
    scenario: "Missing appointment",
  },
  {
    name: "Sam Bennett",
    dob: "1975-11-03",
    code: "3044",
    scenario: "Already checked in",
  },
  {
    name: "Alex Chen",
    dob: "1986-02-14",
    code: "4045",
    scenario: "Multiple appointments",
  },
  {
    name: "Sofia Martinez",
    dob: "1990-06-18",
    code: "5046",
    scenario: "Spanish check-in",
  },
  {
    name: "Casey Brooks",
    dob: "1983-09-27",
    code: "6047",
    scenario: "Technical error",
  },
];
export default function Console({ mode }: { mode: "staff" | "demo" }) {
  const [data, setData] = useState<{
      cases: Case[];
      avatarConfigured?: boolean;
      sessions: { id: string; language: string; providerStatus: string }[];
    }>({ cases: [], sessions: [] }),
    [locked, setLocked] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [online, setOnline] = useState(false),
    [version, setVersion] = useState(0),
    [language, setLanguage] = useState("en"),
    [selected, setSelected] = useState(0),
    [failure, setFailure] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let events: EventSource;
    let cancelled = false;
    void fetch("/api/state?staff=1")
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          setLocked(true);
          return;
        }
        setLocked(false);
        setData(await r.json());
        events = new EventSource("/api/events?staff=1");
        events.onmessage = (e) => {
          setData((p) => ({ ...p, ...JSON.parse(e.data) }));
          setOnline(true);
        };
        events.onerror = () => setOnline(false);
      })
      .catch(() => setError("Unable to connect to the server."));
    return () => {
      cancelled = true;
      events?.close();
    };
  }, [version]);
  async function run(fn: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }
  const waiting = data.cases.filter((c) => c.status === "waiting"),
    accepted = data.cases.filter((c) => c.status === "accepted");
  return (
    <main className="console-shell">
      <header className="topbar">
        <Brand />
        <nav>
          <a href="/analytics">Analytics</a>
          <a href="/kiosk">
            Patient kiosk <ArrowUpRight size={15} />
          </a>
          <a className={mode === "staff" ? "active" : ""} href="/staff">
            Reception
          </a>
          <a className={mode === "demo" ? "active" : ""} href="/demo">
            Demo controls
          </a>
        </nav>
      </header>
      <div className="console-heading">
        <div>
          <div className="eyebrow">
            ONESOURCE / {mode === "staff" ? "RECEPTION" : "OPERATOR"}
          </div>
          <h1>
            {mode === "staff" ? "A warm handoff." : "Make the demo yours."}
          </h1>
          <p>
            {mode === "staff"
              ? "Everything you need to pick up where Alex left off."
              : "Three journeys. One connected experience. Only fictional patient data."}
          </p>
        </div>
        <span className={"connection-badge " + (online ? "online" : "")}>
          <span className="dot" />
          {online ? "Live updates" : "Connecting"}
        </span>
      </div>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="success-message" role="status">
          {notice}
        </div>
      )}
      {locked ? (
        <section className="panel login-panel">
          <ShieldCheck />
          <h2>Staff access</h2>
          <p>Enter the staff access token configured on this server.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const token = new FormData(e.currentTarget).get("token");
              void run(async () => {
                await action("login", { token });
                setVersion((v) => v + 1);
              });
            }}
          >
            <label>
              Access token
              <input type="password" name="token" required />
            </label>
            <button disabled={busy} className="primary">
              Continue
            </button>
          </form>
        </section>
      ) : mode === "staff" ? (
        <>
          <div className="stat-grid">
            <div className="stat">
              <Headphones />
              <span>Waiting for a welcome</span>
              <strong>{waiting.length.toString().padStart(2, "0")}</strong>
            </div>
            <div className="stat">
              <Users />
              <span>Being assisted</span>
              <strong>{accepted.length.toString().padStart(2, "0")}</strong>
            </div>
            <div className="stat">
              <Check />
              <span>Resolved today</span>
              <strong>
                {data.cases
                  .filter((c) => c.status === "resolved")
                  .length.toString()
                  .padStart(2, "0")}
              </strong>
            </div>
          </div>
          <div className="section-heading">
            <h2>Reception queue</h2>
            <span>Welcome clinic · Kiosk 01</span>
          </div>
          {data.cases.length === 0 ? (
            <div className="empty-state">
              <Headphones size={34} />
              <h2>Ready when they need you.</h2>
              <p>
                When a patient asks Alex for help, their request appears here
                automatically.
              </p>
            </div>
          ) : (
            <div className="case-list">
              {data.cases.map((c) => (
                <article className={"case-card " + c.status} key={c.id}>
                  <div className="case-header">
                    <span className={"case-status " + c.status}>
                      {c.status}
                    </span>
                    <span>
                      {new Date(c.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {c.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <h2>{c.reason}</h2>
                  <div className="case-meta">
                    <span>{c.clinic}</span>
                    <span>{c.kiosk}</span>
                    <span>{c.language === "es" ? "Español" : "English"}</span>
                  </div>
                  <div className="context-grid">
                    <div>
                      <h3>Collected patient context</h3>
                      <p>{c.context}</p>
                    </div>
                    <div>
                      <h3>Concierge summary</h3>
                      <p>{c.summary}</p>
                      <small>Generated from verified workflow state</small>
                    </div>
                  </div>
                  <div className="case-actions">
                    {c.status === "waiting" && (
                      <button
                        disabled={busy}
                        className="primary compact"
                        onClick={() =>
                          void run(async () => {
                            await action("case", {
                              id: c.id,
                              status: "accepted",
                            });
                          })
                        }
                      >
                        Accept handoff <ArrowUpRight size={17} />
                      </button>
                    )}
                    {c.status === "accepted" && (
                      <button
                        disabled={busy}
                        className="primary compact"
                        onClick={() =>
                          void run(async () => {
                            await action("case", {
                              id: c.id,
                              status: "resolved",
                            });
                          })
                        }
                      >
                        Resolve request <Check size={17} />
                      </button>
                    )}
                    {c.status === "resolved" && (
                      <span className="verified">
                        <Check size={17} />
                        Reception completed this request
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="operator-grid">
            <section className="panel">
              <div className="eyebrow">01 / PREPARE A JOURNEY</div>
              <h2>Choose your scenario</h2>
              <label>
                Demo patient
                <select
                  value={selected}
                  onChange={(e) => {
                    setSelected(+e.target.value);
                    if (+e.target.value === 4) setLanguage("es");
                  }}
                >
                  {examples.map((p, i) => (
                    <option value={i} key={p.code}>
                      {p.scenario} — {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Language
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </label>
              <div className="demo-identity">
                <strong>{examples[selected].name}</strong>
                <span>Date of birth: {examples[selected].dob}</span>
                <span>Patient code: {examples[selected].code}</span>
              </div>
              <p className="muted">
                Say these fictional details to Alex, or enter them on the
                touchscreen.
              </p>
              <button
                disabled={busy}
                className="primary"
                onClick={() =>
                  void run(async () => {
                    await action("session", { language });
                    window.location.href = "/kiosk";
                  })
                }
              >
                Start this session <ArrowUpRight size={18} />
              </button>
            </section>
            <section className="panel">
              <div className="eyebrow">02 / CONNECTION & RELIABILITY</div>
              <h2>Behind the welcome</h2>
              <div className="provider-summary">
                <Activity />
                <div>
                  <strong>
                    {data.avatarConfigured
                      ? "Tavus configured"
                      : "Tavus setup required"}
                  </strong>
                  <span>
                    {data.avatarConfigured
                      ? "Ready for a live connection test"
                      : "Touchscreen workflows remain available"}
                  </span>
                </div>
              </div>
              {data.sessions.map((s) => (
                <div className="session-row" key={s.id}>
                  <span>
                    {s.id.slice(0, 8)} · {s.language.toUpperCase()}
                  </span>
                  <strong>{s.providerStatus}</strong>
                </div>
              ))}
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await action("failure", { enabled: !failure });
                    setFailure(!failure);
                    setNotice(
                      !failure
                        ? "Technical failure enabled for this browser’s session."
                        : "Technical failure cleared.",
                    );
                  })
                }
              >
                {failure
                  ? "Clear simulated failure"
                  : "Simulate lookup failure"}
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await action("end");
                    setNotice(
                      "Session ended. Microphone stops in the connected kiosk.",
                    );
                  })
                }
              >
                End current session
              </button>
              <button
                className="text-button reset-control"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await action("reset");
                    setFailure(false);
                    setNotice(
                      "Synthetic data restored. All sessions ended. Ready for another demo.",
                    );
                  })
                }
              >
                <RefreshCw size={16} />
                Restore all synthetic data
              </button>
            </section>
          </div>
          <section className="panel runbook">
            <h2>A quick demo, with real outcomes.</h2>
            <div>
              <p>
                <strong>A · Check-in</strong>Start Jordan’s session. Give Alex
                the name, birth date, and code. Confirm the appointment. The
                record changes to checked in.
              </p>
              <p>
                <strong>B · Human handoff</strong>Start Taylor’s session. After
                the missing appointment result, request assistance. Open
                Reception, accept the case, and watch the kiosk update.
              </p>
              <p>
                <strong>C · Español</strong>Start Sofia’s session in Spanish.
                Ask Alex to continue in Spanish and complete the same
                verification and check-in.
              </p>
            </div>
          </section>
        </>
      )}
      {mode === "demo" && <Channels />}
      <footer className="kiosk-footer">
        <span>Executive demonstration · Synthetic data only</span>
        <span>OneSource AI Kiosk</span>
      </footer>
    </main>
  );
}
