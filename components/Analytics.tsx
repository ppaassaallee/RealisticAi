"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Download,
  Headphones,
  LayoutDashboard,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import Brand from "./Brand";
import { action } from "@/lib/client";
import { knowledgeVersion, publicKnowledge } from "@/lib/knowledge";
import type { Analytics as Metrics, EventType } from "@/lib/analytics";
const titles: Record<EventType, string> = {
  session_started: "A new welcome",
  appointment_found: "Appointment verified",
  lookup_unverified: "Identity needs review",
  appointment_missing: "No appointment found",
  check_in_completed: "Check-in completed",
  check_in_duplicate: "Already checked in",
  handoff_requested: "Reception requested",
  handoff_accepted: "Reception accepted",
  handoff_resolved: "Request resolved",
  tool_error: "Workflow needs attention",
  avatar_connected: "Alex connected",
  avatar_error: "Connection needs attention",
  response_observed: "Response observed",
};
const duration = (n: number | null) =>
  n === null ? "—" : n < 1000 ? `${n} ms` : `${(n / 1000).toFixed(1)} s`;
export default function Analytics() {
  const [tab, setTab] = useState<"overview" | "knowledge">("overview"),
    [days, setDays] = useState(7),
    [sample, setSample] = useState(false),
    [data, setData] = useState<Metrics | null>(null),
    [error, setError] = useState(""),
    [locked, setLocked] = useState(false),
    [loading, setLoading] = useState(false),
    [query, setQuery] = useState("");
  const requestVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const r = await fetch(
        `/api/analytics?days=${days}&sample=${sample ? 1 : 0}`,
      );
      if (version !== requestVersion.current) return;
      if (r.status === 401) {
        setLocked(true);
        return;
      }
      if (!r.ok)
        throw new Error("Analytics could not be loaded. Please retry.");
      const result = await r.json();
      if (version !== requestVersion.current) return;
      setData(result);
      setLocked(false);
      setError("");
    } catch (e) {
      if (version === requestVersion.current)
        setError(e instanceof Error ? e.message : "Unable to load");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [days, sample]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      requestVersion.current++;
      clearInterval(timer);
    };
  }, [refresh]);
  const exportCsv = () => {
    if (!data) return;
    const rows = [
      [
        "AI Kiosk analytics",
        sample ? "ILLUSTRATIVE SAMPLE" : "ACTUAL APP EVENTS",
      ],
      ["Range", `${days} days`],
      ["Sessions", data.totalSessions],
      ["Check-ins", data.checkIns],
      ["Handoffs", data.handoffs],
      ["Resolved", data.resolved],
      ["Response ms", data.responseMs ?? "No samples"],
      ["Response samples", data.responseSamples],
      ["Tool ms", data.toolMs ?? "No samples"],
      ["Reception wait ms", data.waitMs ?? "No samples"],
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-kiosk-${sample ? "sample" : "activity"}-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const articles = publicKnowledge.filter((e) =>
    (e.id + " " + e.category + " " + e.title.en + " " + e.title.es)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <main className="insights-app">
      <aside className="insights-sidebar">
        <Brand />
        <div className="sidebar-section">WORKSPACE</div>
        <button
          className={tab === "overview" ? "selected" : ""}
          onClick={() => setTab("overview")}
        >
          <LayoutDashboard size={18} />
          Overview
          <ChevronRight size={14} />
        </button>
        <button
          className={tab === "knowledge" ? "selected" : ""}
          onClick={() => setTab("knowledge")}
        >
          <BookOpen size={18} />
          Alex’s knowledge
          <ChevronRight size={14} />
        </button>
        <a href="/staff">
          <Headphones size={18} />
          Reception
          <ArrowUpRight size={14} />
        </a>
        <a href="/demo">
          <Monitor size={18} />
          Demo studio
          <ArrowUpRight size={14} />
        </a>
        <div className="sidebar-bottom">
          <div className="sidebar-alex">
            <img src="/alex-preview.png" alt="" />
            <div>
              <strong>Alex</strong>
              <span>Patient concierge</span>
            </div>
            <span className="dot" />
          </div>
          <p>
            Synthetic-data demonstration.
            <br />
            Human care, thoughtfully connected.
          </p>
        </div>
      </aside>
      <div className="insights-main">
        <header className="insights-top">
          <span>
            Workspace <ChevronRight size={13} />{" "}
            <strong>{tab === "overview" ? "Overview" : "Knowledge"}</strong>
          </span>
          <a href="/kiosk">
            Open AI Kiosk <ArrowUpRight size={15} />
          </a>
        </header>
        <section className="insights-content">
          <div className="insights-heading">
            <div>
              <div className="eyebrow">ONESOURCE INTELLIGENCE</div>
              <h1>
                {tab === "overview"
                  ? "Every welcome tells a story."
                  : "A thoughtful answer starts here."}
              </h1>
              <p>
                {tab === "overview"
                  ? "See how Alex connects visitors with the care team."
                  : "A grounded, bilingual foundation. Clear answers. Honest boundaries."}
              </p>
            </div>
            <span className="insights-status">
              <span className="dot" />
              {sample ? "Sample preview" : "Local activity"}
            </span>
          </div>
          {locked ? (
            <div className="insights-panel access-panel">
              <ShieldCheck />
              <h2>For your team’s eyes.</h2>
              <p>Use your staff access token to view operational insights.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const token = new FormData(e.currentTarget).get("token");
                  void action("login", { token })
                    .then(refresh)
                    .catch((e) => setError(e.message));
                }}
              >
                <label>
                  Staff access token
                  <input type="password" name="token" required />
                </label>
                <button className="primary">Unlock insights</button>
              </form>
            </div>
          ) : (
            <>
              {tab === "overview" ? (
                <>
                  <div className="insights-toolbar">
                    <div className="data-toggle">
                      <button
                        aria-pressed={!sample}
                        onClick={() => {
                          setData(null);
                          setSample(false);
                        }}
                      >
                        Actual activity
                      </button>
                      <button
                        aria-pressed={sample}
                        onClick={() => {
                          setData(null);
                          setSample(true);
                        }}
                      >
                        Sample preview
                      </button>
                    </div>
                    <div className="toolbar-actions">
                      <select
                        aria-label="Analytics date range"
                        value={days}
                        onChange={(e) => {
                          setData(null);
                          setDays(Number(e.target.value));
                        }}
                      >
                        <option value={1}>Last 24 hours</option>
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                      </select>
                      <button
                        aria-label="Refresh analytics"
                        disabled={loading}
                        onClick={() => void refresh()}
                      >
                        <RefreshCw
                          size={16}
                          className={loading ? "spin" : ""}
                        />
                      </button>
                      <button onClick={exportCsv} disabled={!data}>
                        <Download size={15} />
                        Export
                      </button>
                    </div>
                  </div>
                  {sample && (
                    <div className="sample-banner">
                      <Sparkles size={16} />
                      Illustrative sample data. These figures are not your
                      results.
                    </div>
                  )}
                  {!data ? (
                    <div className="insights-loading" role="status">
                      {loading
                        ? "Gathering your insights…"
                        : "No data available. Use refresh to retry."}
                    </div>
                  ) : (
                    <>
                      <div className="metric-grid">
                        {[
                          {
                            label: "Sessions started",
                            value: data.totalSessions,
                            detail: "Sessions created in this period",
                            Icon: Users,
                          },
                          {
                            label: "Successful check-ins",
                            value: data.checkIns,
                            detail: "Confirmed by the application",
                            Icon: Check,
                          },
                          {
                            label: "Alex response time",
                            value: duration(data.responseMs),
                            detail: `${data.responseSamples} client-observed turns`,
                            Icon: Timer,
                          },
                          {
                            label: "Human handoffs",
                            value: data.handoffs,
                            detail: `${data.resolved} resolved · ${data.accepted} accepted`,
                            Icon: Headphones,
                          },
                        ].map(({ label, value, detail, Icon }) => (
                          <article className="metric-card" key={label}>
                            <div>
                              <span>{label}</span>
                              <Icon size={18} />
                            </div>
                            <strong>{value}</strong>
                            <small>{detail}</small>
                          </article>
                        ))}
                      </div>
                      <div className="insight-charts">
                        <section className="insights-panel trend-panel">
                          <div className="panel-heading">
                            <div>
                              <h2>
                                A little less waiting.
                                <br />A little more care.
                              </h2>
                              <p>Conversation and check-in activity</p>
                            </div>
                            <span className="chart-key">
                              <i />
                              Sessions <i />
                              Check-ins
                            </span>
                          </div>
                          {data.totalSessions === 0 ? (
                            <div className="chart-empty">
                              <Activity size={28} />
                              <h3>Your story starts with the next visit.</h3>
                              <p>
                                Run a demo journey to see real events here, or
                                explore the sample preview.
                              </p>
                              <button
                                className="text-button"
                                onClick={() => {
                                  setData(null);
                                  setSample(true);
                                }}
                              >
                                Explore sample insights{" "}
                                <ArrowUpRight size={15} />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="bar-chart"
                              role="img"
                              aria-label="Session and check-in counts by time interval"
                            >
                              {data.series.map((point, i) => {
                                const max = Math.max(
                                  1,
                                  ...data.series.map((s) => s.sessions),
                                  ...data.series.map((s) => s.checkIns),
                                );
                                return (
                                  <div className="bar-column" key={point.at}>
                                    <div
                                      className="bar-pair"
                                      title={`${new Date(point.at).toLocaleString()}: ${point.sessions} sessions, ${point.checkIns} check-ins`}
                                    >
                                      <div
                                        style={{
                                          height: `${(point.sessions / max) * 100}%`,
                                        }}
                                      >
                                        <span>{point.sessions}</span>
                                      </div>
                                      <div
                                        style={{
                                          height: `${(point.checkIns / max) * 100}%`,
                                        }}
                                      >
                                        <span>{point.checkIns}</span>
                                      </div>
                                    </div>
                                    <small>
                                      {days === 1
                                        ? new Date(point.at).toLocaleTimeString(
                                            [],
                                            { hour: "numeric" },
                                          )
                                        : i %
                                              Math.ceil(
                                                data.series.length / 7,
                                              ) ===
                                            0
                                          ? new Date(
                                              point.at,
                                            ).toLocaleDateString([], {
                                              month: "short",
                                              day: "numeric",
                                            })
                                          : ""}
                                    </small>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="trend-footer">
                            <span>
                              <span className="dot" />
                              Events from this demo application
                            </span>
                            <span>
                              No estimated savings or satisfaction scores
                            </span>
                          </div>
                        </section>
                        <section className="insights-panel journey-panel">
                          <div className="panel-heading">
                            <div>
                              <h2>The path to checked in.</h2>
                              <p>Sessions started in this period</p>
                            </div>
                          </div>
                          <div className="journey-rate">
                            <strong>
                              {data.completionRate === null
                                ? "—"
                                : `${data.completionRate}%`}
                            </strong>
                            <span>
                              of sessions with a lookup
                              <br />
                              completed check-in
                            </span>
                          </div>
                          {data.funnel.map((item, i) => (
                            <div className="journey-step" key={item.label}>
                              <span className="journey-number">0{i + 1}</span>
                              <div>
                                <div>
                                  <span>{item.label}</span>
                                  <strong>{item.count}</strong>
                                </div>
                                <div className="mini-track">
                                  <i
                                    style={{
                                      width: `${(item.count / Math.max(1, ...data.funnel.map((x) => x.count))) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <p className="chart-footnote">
                            Counts unique sessions; repeat confirmations do not
                            increase completed check-ins.
                          </p>
                        </section>
                      </div>
                      <div className="insight-bottom">
                        <section className="insights-panel">
                          <div className="panel-heading">
                            <div>
                              <h2>Where Alex meets people.</h2>
                              <p>Selected presentation at session start</p>
                            </div>
                            <Monitor size={19} />
                          </div>
                          {data.presentations.map((c) => (
                            <div className="presentation-row" key={c.label}>
                              <span>
                                {c.label === "web"
                                  ? "Web chat"
                                  : c.label === "tablet"
                                    ? "Tablet"
                                    : "Kiosk"}
                              </span>
                              <div className="mini-track">
                                <i
                                  style={{
                                    width: `${(c.count / Math.max(1, data.totalSessions)) * 100}%`,
                                  }}
                                />
                              </div>
                              <strong>{c.count}</strong>
                            </div>
                          ))}
                          <div className="language-block">
                            <span>In their own language</span>
                            <div>
                              {data.languages.map((l) => (
                                <span key={l.label}>
                                  <i
                                    className={
                                      l.label === "English" ? "en" : "es"
                                    }
                                  />
                                  {l.label}
                                  <strong>{l.count}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        </section>
                        <section className="insights-panel">
                          <div className="panel-heading">
                            <div>
                              <h2>Care, with a human touch.</h2>
                              <p>Reception and workflow health</p>
                            </div>
                            <Headphones size={19} />
                          </div>
                          <div className="health-row">
                            <span>Average time to acceptance</span>
                            <strong>{duration(data.waitMs)}</strong>
                          </div>
                          <div className="health-row">
                            <span>Average server tool duration</span>
                            <strong>{duration(data.toolMs)}</strong>
                          </div>
                          <div className="health-row">
                            <span>Errors recorded</span>
                            <strong className={data.errors ? "attention" : ""}>
                              {data.errors}
                            </strong>
                          </div>
                          <p className="chart-footnote">
                            Response timing is observed in the browser. Tool
                            duration measures server actions only. No timing is
                            shown without samples.
                          </p>
                        </section>
                        <section className="insights-panel activity-panel">
                          <div className="panel-heading">
                            <div>
                              <h2>The latest moments.</h2>
                              <p>Operational events · no patient details</p>
                            </div>
                            <Activity size={19} />
                          </div>
                          {!data.activity.length ? (
                            <p className="empty-small">
                              The next interaction will appear here.
                            </p>
                          ) : (
                            data.activity.slice(0, 5).map((e) => (
                              <div className="activity-row" key={e.id}>
                                <span
                                  className={
                                    e.type.includes("error")
                                      ? "event-dot error"
                                      : "event-dot"
                                  }
                                />
                                <div>
                                  <strong>{titles[e.type]}</strong>
                                  <span>
                                    {e.presentation === "web"
                                      ? "Web chat"
                                      : e.presentation}{" "}
                                    ·{" "}
                                    {e.language === "en"
                                      ? "English"
                                      : "Español"}
                                  </span>
                                </div>
                                <time>
                                  {new Date(e.at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </time>
                              </div>
                            ))
                          )}
                        </section>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="knowledge-summary">
                    <div className="knowledge-count">
                      <BookOpen size={22} />
                      <strong>{publicKnowledge.length}</strong>
                      <span>curated bilingual entries</span>
                    </div>
                    <div>
                      <strong>Knowledge version {knowledgeVersion}</strong>
                      <p>
                        General education and implemented demo capabilities. No
                        invented facility, insurance or pricing facts.
                      </p>
                    </div>
                  </div>
                  <div className="knowledge-catalog-toolbar">
                    <label className="knowledge-search">
                      <Search size={17} />
                      <input
                        aria-label="Search knowledge catalog"
                        placeholder="Search topics, questions or article IDs…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <span>English + Español</span>
                  </div>
                  <div className="knowledge-catalog">
                    {articles.map((e) => (
                      <details key={e.id}>
                        <summary>
                          <span className="article-id">{e.id}</span>
                          <div>
                            <strong>{e.title.en}</strong>
                            <span>{e.category}</span>
                          </div>
                          <span className="article-status">Demo ready</span>
                          <ChevronRight size={16} />
                        </summary>
                        <div className="article-content">
                          <div>
                            <h3>English</h3>
                            <p>{e.answer.en}</p>
                          </div>
                          <div>
                            <h3>Español</h3>
                            <p>{e.answer.es}</p>
                          </div>
                          <small>
                            Source: {e.source} · Reviewed {e.reviewed}.
                            Demo-ready is not clinical or institutional
                            approval.
                          </small>
                        </div>
                      </details>
                    ))}
                  </div>
                  <div className="knowledge-boundary">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>Clear boundaries make a better concierge.</strong>
                      <p>
                        Clinic hours, locations, providers, accepted plans,
                        personal benefits and current prices still require
                        authoritative local content. Payments, booking changes
                        and WhatsApp remain unconnected.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          <footer className="insights-footer">
            <span>
              <ShieldCheck size={13} />
              No raw recordings, transcripts or patient identifiers in analytics
            </span>
            <span>
              {sample
                ? "Illustrative preview"
                : data
                  ? `Updated ${new Date(data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Awaiting activity"}
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
}
