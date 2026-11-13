"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw, Download, ShieldCheck } from "lucide-react";
import { bankAction } from "./client";
import { modes, journeys, type BankConfig } from "@/experiences/juliana/config";
export default function BankAdmin({
  platform = false,
  analytics = false,
}: {
  platform?: boolean;
  analytics?: boolean;
}) {
  const [data, setData] = useState<any>(null),
    [config, setConfig] = useState<BankConfig | null>(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState(analytics ? "analytics" : "overview"),
    [query, setQuery] = useState(""),
    [token, setToken] = useState(""),
    [locked, setLocked] = useState(false),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState("");
  const load = async () => {
    try {
      const r = await fetch("/api/juliana?admin=1");
      if (r.status === 401) {
        setLocked(true);
        return;
      }
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
      setConfig((c) => c || d.config);
      setLocked(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    }
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);
  const act = async (action: string, args: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const r = await bankAction(action, args);
      await load();
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar");
    } finally {
      setBusy(false);
    }
  };
  function csv() {
    const m = data.metrics;
    const rows = [
      "metric,value,scope",
      ...[
        "interactions",
        "started",
        "completed",
        "selfService",
        "escalations",
        "abandoned",
        "errors",
        "consented",
        "simulations",
        "information",
        "requests",
        "realTransactions",
      ].map((k) => `${k},${m[k]},juliana-demo`),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.join("\n")], { type: "text/csv" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "banco-interior-demo-analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="bank bank-admin" lang="es">
      <header className="bank-admin-top">
        <a href="/platform" className="bank-brand">
          <span className="bank-symbol">
            <span />
            <span />
            <span />
          </span>
          <span>
            SMART AI<span>KIOSK</span>
          </span>
        </a>
        <span>Espacio administrativo</span>
        <nav>
          <a href="/platform">Experiencias</a>
          <a href="/juliana">Abrir Juliana ↗</a>
          <a href="/staff">Operación Alex ↗</a>
        </nav>
      </header>
      {error && (
        <div role="alert" className="bank-error">
          {error}
        </div>
      )}
      {locked ? (
        <form
          className="bank-login"
          onSubmit={(e) => {
            e.preventDefault();
            void act("login", { token }).then(() => setToken(""));
          }}
        >
          <h1>Tu espacio de operación.</h1>
          <p>Ingresá tu credencial administrativa de Banco Interior.</p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            aria-label="Credencial administrativa"
            autoComplete="off"
          />
          <button className="bank-primary" disabled={busy}>
            Acceder
          </button>
        </form>
      ) : !data ? (
        <p role="status">Cargando espacio de trabajo…</p>
      ) : platform ? (
        <>
          <div className="bank-eyebrow">DOS EXPERIENCIAS · UNA PLATAFORMA</div>
          <h1>Elegí a quién querés conocer.</h1>
          <p>
            Administración independiente. Cada experiencia mantiene su
            identidad, conocimiento y datos.
          </p>
          <div className="bank-platform-grid">
            <article className="bank-platform-card">
              <img src="/alex-preview.png" alt="Alex" />
              <div>
                <span className="bank-eyebrow">HEALTHCARE CONCIERGE</span>
                <h2>Alex</h2>
                <p>
                  Una bienvenida más humana. Check-in y atención en recepción.
                </p>
                <a href="/kiosk">Abrir experiencia ↗</a>
                <a href="/analytics">Analítica de Alex ↗</a>
                <a href="/demo">Configuración y demo ↗</a>
              </div>
            </article>
            <article className="bank-platform-card">
              <img src="/juliana-preview.png" alt="Juliana" />
              <div>
                <span className="bank-eyebrow">BANCO INTERIOR</span>
                <h2>Juliana</h2>
                <p>
                  Cerca de vos, estés donde estés. Educación e inclusión
                  financiera.
                </p>
                <a href="/juliana">Abrir experiencia ↗</a>
                <a href="/juliana/analytics">Analítica de Juliana ↗</a>
                <a href="/juliana/admin">Configurar despliegue ↗</a>
              </div>
            </article>
          </div>
          <div className="bank-admin-panel">
            <ShieldCheck />
            <h2>El kiosco público abre su experiencia directamente.</h2>
            <p>
              Asigná <strong>/kiosk</strong> para Alex o{" "}
              <strong>/juliana</strong> para Juliana. El selector es para
              operadores; no cambia una sesión pública activa.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="bank-eyebrow">BANCO INTERIOR · JULIANA</div>
          <h1>
            {tab === "analytics"
              ? "Cada encuentro cuenta."
              : "Todo listo para acompañar."}
          </h1>
          <p>
            Rol: {data.role} · Modo demo ·{" "}
            {modes[data.config.mode as keyof typeof modes].name} ·{" "}
            {data.voice
              ? "Voz en vivo configurada"
              : "Pantalla disponible; voz pendiente"}
          </p>
          <nav className="bank-admin-tabs">
            {[
              ["overview", "Operación"],
              ["analytics", "Analítica"],
              ["config", "Configuración"],
              ["knowledge", "Conocimiento"],
            ].map(([id, title]) => (
              <button
                key={id}
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                {title}
              </button>
            ))}
            <button onClick={load} aria-label="Actualizar">
              <RefreshCw size={17} />
            </button>
          </nav>
          {tab === "overview" && (
            <>
              <section className="bank-admin-panel">
                <h2>Atención humana</h2>
                <p>
                  Casos de demostración. Aceptar confirma recepción por un
                  operador, no una videollamada.
                </p>
                <div className="bank-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Caso</th>
                        <th>Cola</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cases.map((c: any) => (
                        <tr key={c.id}>
                          <td>{c.id}</td>
                          <td>{c.queue}</td>
                          <td>{c.status}</td>
                          <td>
                            {c.status === "waiting" && (
                              <button
                                disabled={busy || data.role === "viewer"}
                                onClick={() =>
                                  act("case", { id: c.id, status: "accepted" })
                                }
                              >
                                Aceptar
                              </button>
                            )}
                            {c.status !== "resolved" && (
                              <button
                                disabled={busy || data.role === "viewer"}
                                onClick={() =>
                                  act("case", { id: c.id, status: "resolved" })
                                }
                              >
                                Resolver
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data.cases.length && (
                    <p>
                      No hay solicitudes todavía. Los nuevos casos aparecen
                      aquí.
                    </p>
                  )}
                </div>
              </section>
              <section className="bank-admin-panel">
                <h2>Actividad anónima y errores</h2>
                <p>
                  No se almacenan transcripciones, secretos ni conversaciones
                  crudas. Este registro permite revisar qué ocurrió sin leer
                  datos de visitantes.
                </p>
                <div className="bank-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Momento</th>
                        <th>Evento</th>
                        <th>Journey</th>
                        <th>Modo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.metrics.recent.map((e: any) => (
                        <tr key={e.id}>
                          <td>{new Date(e.at).toLocaleTimeString()}</td>
                          <td>{e.type}</td>
                          <td>{e.journey || "—"}</td>
                          <td>{e.mode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {tab === "analytics" && (
            <>
              <div className="bank-demo-line">
                <ShieldCheck size={16} />
                Actividad de esta aplicación demo. Ninguna simulación se cuenta
                como operación bancaria real.
                <button
                  onClick={csv}
                  style={{ marginLeft: "auto", display: "flex", gap: 8 }}
                >
                  <Download size={16} />
                  Exportar CSV
                </button>
              </div>
              <div className="bank-admin-grid">
                {[
                  [
                    "Interacciones",
                    data.metrics.interactions,
                    "Sesiones iniciadas",
                  ],
                  [
                    "Journeys completados",
                    data.metrics.completed,
                    "Resultados confirmados por backend",
                  ],
                  [
                    "Atención humana",
                    data.metrics.escalations,
                    "Casos demo creados",
                  ],
                  [
                    "Operaciones bancarias reales",
                    0,
                    "Sin integración transaccional",
                  ],
                  [
                    "Simulaciones",
                    data.metrics.simulations,
                    "Cálculos, revisiones y confirmaciones demo",
                  ],
                  [
                    "Autoservicio",
                    data.metrics.selfService,
                    "Sesiones completadas sin caso humano",
                  ],
                  [
                    "Abandonos",
                    data.metrics.abandoned,
                    "Sesiones finalizadas sin completar journey",
                  ],
                  [
                    "Satisfacción voluntaria",
                    data.metrics.satisfaction === null
                      ? "—"
                      : data.metrics.satisfaction + "/5",
                    "Valoración anónima, sin inferencias",
                  ],
                ].map(([label, value, hint]) => (
                  <article className="bank-metric" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <small>{hint}</small>
                  </article>
                ))}
              </div>
              <div className="bank-config-grid">
                <section className="bank-admin-panel">
                  <h2>Lo que las personas buscan</h2>
                  <div className="bank-bars">
                    {data.metrics.intents.map((i: any) => (
                      <div key={i.journey}>
                        <span>
                          {journeys[i.journey as keyof typeof journeys]
                            ?.short || i.journey}
                        </span>
                        <i
                          style={{
                            width:
                              Math.max(
                                3,
                                (100 * i.count) /
                                  Math.max(
                                    1,
                                    ...data.metrics.intents.map(
                                      (x: any) => x.count,
                                    ),
                                  ),
                              ) + "%",
                          }}
                        />
                        <span>{i.count}</span>
                      </div>
                    ))}
                  </div>
                  {!data.metrics.intents.length && (
                    <p>Aún no hay journeys iniciados.</p>
                  )}
                </section>
                <section className="bank-admin-panel">
                  <h2>Donde estamos cerca</h2>
                  {data.metrics.modes.map((m: any) => (
                    <p key={m.mode}>
                      {modes[m.mode as keyof typeof modes].name}:{" "}
                      <strong>{m.count}</strong>
                    </p>
                  ))}
                  <p>Usuarios únicos: no medidos, sin seguimiento personal.</p>
                  <p>Disponibilidad: no medida; requiere monitoreo externo.</p>
                  <p>
                    Duración media de sesiones finalizadas:{" "}
                    {data.metrics.averageDuration === null
                      ? "Sin muestras"
                      : Math.round(data.metrics.averageDuration / 1000) + " s"}
                  </p>
                </section>
              </div>
              <section className="bank-admin-panel">
                <h2>
                  Información, simulación y solicitud son cosas distintas.
                </h2>
                <p>
                  {data.metrics.information} respuestas informativas ·{" "}
                  {data.metrics.simulations} eventos de simulación ·{" "}
                  {data.metrics.requests} referencias demo ·{" "}
                  {data.metrics.consented} solicitudes consentidas ·{" "}
                  {data.metrics.errors} errores registrados.
                </p>
              </section>
            </>
          )}
          {tab === "config" && config && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act("config", { config }).then((r) => {
                  if (r)
                    setSaved(
                      "Configuración guardada. Se aplica a nuevas sesiones; desactivar herramientas tiene efecto inmediato.",
                    );
                });
              }}
            >
              <div className="bank-admin-panel">
                <h2>El contexto hace la diferencia.</h2>
                <div className="bank-config-grid">
                  <label className="bank-field">
                    Lugar de despliegue
                    <select
                      value={config.mode}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          mode: e.target.value as BankConfig["mode"],
                        })
                      }
                    >
                      {Object.entries(modes).map(([id, m]) => (
                        <option key={id} value={id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="bank-field">
                    Idioma inicial
                    <select
                      value={config.language}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          language: e.target.value as "es" | "en",
                        })
                      }
                    >
                      <option value="es">Español</option>
                      <option value="en">English (conversation)</option>
                    </select>
                  </label>
                  <label className="bank-field">
                    Identidad visual
                    <select
                      value={config.accent}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          accent: e.target.value as "forest" | "olive",
                        })
                      }
                    >
                      <option value="forest">Verde institucional</option>
                      <option value="olive">Verde oliva</option>
                    </select>
                  </label>
                  <label className="bank-field">
                    Modo de operación
                    <select value="demo" onChange={() => {}}>
                      <option value="demo">
                        Demostración · datos ficticios
                      </option>
                      <option disabled value="integrated">
                        Integrado · requiere adaptador aprobado
                      </option>
                    </select>
                  </label>
                </div>
                <label className="bank-field" style={{ marginTop: 20 }}>
                  Aviso público
                  <input
                    value={config.notice}
                    maxLength={240}
                    onChange={(e) =>
                      setConfig({ ...config, notice: e.target.value })
                    }
                  />
                </label>
              </div>
              <section className="bank-admin-panel">
                <h2>Servicios disponibles</h2>
                <p>
                  La validación se aplica también a las herramientas de voz en
                  el servidor. Atención humana permanece disponible.
                </p>
                <div className="bank-config-grid">
                  {Object.entries(journeys).map(([id, j]) => (
                    <label className="bank-toggle" key={id}>
                      <input
                        type="checkbox"
                        disabled={id === "help"}
                        checked={config.enabled.includes(id as any)}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            enabled: e.target.checked
                              ? [...config.enabled, id as any]
                              : config.enabled.filter((v) => v !== id),
                          })
                        }
                      />
                      {j.title}
                    </label>
                  ))}
                </div>
              </section>
              <button
                className="bank-primary"
                style={{ maxWidth: 350 }}
                disabled={busy || data.role !== "admin"}
              >
                Guardar configuración
              </button>
              {saved && <p role="status">{saved}</p>}
            </form>
          )}
          {tab === "knowledge" && (
            <section className="bank-admin-panel">
              <h2>
                {data.knowledge.length} respuestas, con sus límites claros.
              </h2>
              <p>
                Contenido versionado en el repositorio. Activá o retirá
                respuestas sin alterar Alex. Condiciones institucionales sin
                aprobar no se presentan como oficiales.
              </p>
              <input
                aria-label="Buscar catálogo de Juliana"
                placeholder="Buscar tema, pregunta o ID…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {data.knowledge
                .filter((k: any) =>
                  (k.id + " " + k.question + " " + k.topic)
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((k: any) => (
                  <details key={k.id}>
                    <summary>
                      {k.question} <small>· {k.status}</small>
                    </summary>
                    <p>{k.answer}</p>
                    <p>
                      {k.id} · {k.category} · {k.validity}
                    </p>
                    <p>Uso: {k.conditions}</p>
                    <p>Escalación: {k.escalation}</p>
                    {k.source.startsWith("https://") ? (
                      <a href={k.source} target="_blank" rel="noreferrer">
                        Consultar fuente ↗
                      </a>
                    ) : (
                      <p>Fuente: {k.source}</p>
                    )}
                    <label className="bank-toggle">
                      <input
                        type="checkbox"
                        disabled={busy || data.role !== "admin"}
                        checked={!data.config.disabledKnowledge.includes(k.id)}
                        onChange={(e) =>
                          act("knowledge", {
                            id: k.id,
                            enabled: e.target.checked,
                          }).then((r) => {
                            if (r?.config) setConfig(r.config);
                          })
                        }
                      />
                      Disponible en consultas
                    </label>
                  </details>
                ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
