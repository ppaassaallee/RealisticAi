"use client";
import { useEffect, useState, useRef } from "react";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Mic,
  ShieldCheck,
  RotateCcw,
  Accessibility,
  Headphones,
  Globe,
  Wallet,
  Send,
  House,
  Landmark,
  Lightbulb,
  Check,
  WifiOff,
  MessageCircle,
  ChevronRight,
  LifeBuoy,
} from "lucide-react";
import { sessionShouldExpire } from "@/experiences/juliana/voice";
import BankAvatar from "./BankAvatar";
import DeviceFrame, { type Presentation } from "../DeviceFrame";
import { bankAction } from "./client";
import {
  defaultConfig,
  journeys,
  modes,
  modeTools,
  officialLinks,
  type Journey,
  type BankConfig,
} from "@/experiences/juliana/config";
import { products, users } from "@/experiences/juliana/data";
import knowledge from "@/experiences/juliana/knowledge.json";
import type { Result } from "@/experiences/juliana/store";
const icons = {
  send: Send,
  collect: Wallet,
  account: Landmark,
  pay: Wallet,
  loan: Lightbulb,
  save: House,
  migrant: Globe,
  consular: Globe,
  fraud: ShieldCheck,
  help: Headphones,
};
const titlesEn: Record<Journey, string> = {
  send: "Send a remittance",
  collect: "Collect a remittance",
  account: "Accounts and cards",
  pay: "Bills and services",
  loan: "Loans and savings",
  save: "Save for my home",
  migrant: "Migrant services",
  consular: "Consular services",
  fraud: "Report fraud",
  help: "Human assistance",
};
const initialValues: Record<string, string> = {
  amount: "200",
  origin: "US",
  destination: "GT",
  userId: "DEMO-01",
  demoCode: "PRUEBA-01",
  reference: "REM-001",
  service: "electricity",
  product: "savings",
  months: "24",
  annualRate: "12",
  target: "120000",
  saved: "0",
  country: "Estados Unidos",
  jurisdiction: "Por confirmar",
  need: "Ahorro y apoyo a mi familia",
  queue: "general",
};
export default function BankKiosk() {
  const [config, setConfig] = useState<BankConfig>(defaultConfig),
    [session, setSession] = useState<any>(null),
    [journey, setJourney] = useState<Journey | null>(null),
    [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [active, setActive] = useState(false),
    [online, setOnline] = useState(true),
    [large, setLarge] = useState(false),
    [contrast, setContrast] = useState(false),
    [language, setLanguage] = useState<"es" | "en">("es"),
    [message, setMessage] = useState(""),
    [faq, setFaq] = useState(""),
    [demo, setDemo] = useState(false),
    [feedback, setFeedback] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [consent, setConsent] = useState(false);
  const [presentation, setPresentation] = useState<Presentation>("kiosk");
  const activity = useRef(Date.now()),
    sessionRef = useRef<any>(null),
    fresh = useRef(false),
    refreshVersion = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const en = language === "en";
  const refresh = async () => {
    if (!navigator.onLine) return;
    const version = ++refreshVersion.current;
    const r = await fetch("/api/juliana");
    if (!r.ok) throw new Error("No se pudo conectar con el servidor.");
    const data = await r.json();
    if (version !== refreshVersion.current) return data;
    setConfig(data.config);
    if (!fresh.current) {
      setLanguage(data.session?.language || data.config.language);
      fresh.current = true;
    }
    setSession(data.session);
    sessionRef.current = data.session;
    if (data.session?.journey) setJourney(data.session.journey);
    if (data.session?.result) setResult(data.session.result);
    return data;
  };
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    const net = () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) setActive(false);
      else refresh().catch(() => {});
    };
    net();
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    const touch = () => {
      activity.current = Date.now();
    };
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    let lastRefresh = 0;
    const timer = setInterval(() => {
      if (
        sessionRef.current &&
        sessionShouldExpire(
          Date.now(),
          activity.current,
          sessionRef.current.expires,
        )
      ) {
        setActive(false);
        void bankAction("end").catch(() => {});
        setSession(null);
        sessionRef.current = null;
        setJourney(null);
        setResult(null);
        setValues({ ...initialValues });
        setMessage("");
        setFaq("");
        setConsent(false);
        setFeedback(false);
        setDemo(false);
        setError(
          "Por privacidad, finalizamos la sesión inactiva. Podés comenzar otra.",
        );
      } else if (
        sessionRef.current &&
        document.visibilityState === "visible" &&
        Date.now() - lastRefresh >=
          (activeRef.current ||
          sessionRef.current.cases?.some(
            (c: { status: string }) => c.status !== "resolved",
          )
            ? 4000
            : 30000)
      ) {
        lastRefresh = Date.now();
        refresh().catch(() => {});
      }
    }, 4000);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/bank-sw.js", { scope: "/juliana" })
        .then(() => navigator.serviceWorker.ready)
        .then((reg) =>
          reg.active?.postMessage({
            type: "CACHE_PUBLIC",
            urls: performance.getEntriesByType("resource").map((r) => r.name),
          }),
        )
        .catch(() => {});
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
    };
  }, []);
  async function ensure() {
    if (sessionRef.current && sessionRef.current.expires > Date.now())
      return sessionRef.current;
    refreshVersion.current++;
    const s = await bankAction("session", { language });
    sessionRef.current = s;
    setSession(s);
    activity.current = Date.now();
    return s;
  }
  async function perform(fn: () => Promise<any>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await ensure();
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Intentá de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  async function run(step: string, extra: Record<string, unknown> = {}) {
    await perform(async () => {
      const r = await bankAction("tool", {
        name: "bankingJourney",
        args: { journey, step, ...values, ...extra },
      });
      setResult(r);
      await refresh();
    });
  }
  async function open(j: Journey) {
    if (!online) {
      setError(
        "Sin conexión: usá las consultas públicas al final de la pantalla.",
      );
      return;
    }
    setConsent(false);
    setResult(null);
    setJourney(j);
    setValues((v) => ({
      ...v,
      reference: j === "pay" ? "SERV-001" : "REM-001",
      amount: j === "loan" ? "25000" : "200",
      months: j === "save" ? "60" : "24",
      need: j === "consular" ? "Pasaporte" : "Ahorro y apoyo a mi familia",
    }));
    await perform(async () => {
      const r = await bankAction("tool", {
        name: "bankingJourney",
        args: { journey: j, step: "open" },
      });
      setResult(r);
      await refresh();
    });
  }
  async function reset() {
    refreshVersion.current++;
    setActive(false);
    setBusy(true);
    try {
      await bankAction("end");
    } catch {
    } finally {
      setSession(null);
      sessionRef.current = null;
      setJourney(null);
      setResult(null);
      setMessage("");
      setValues({ ...initialValues });
      setFaq("");
      setDemo(false);
      setConsent(false);
      setFeedback(false);
      setError("");
      setBusy(false);
    }
  }
  function field(
    key: string,
    label: string,
    type = "text",
    options?: { value: string; label: string }[],
  ) {
    return (
      <label className="bank-field">
        {label}
        {options ? (
          <select
            value={values[key]}
            onChange={(e) =>
              setValues((v) => ({ ...v, [key]: e.target.value }))
            }
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            required
            type={type}
            min={type === "number" ? 0 : undefined}
            maxLength={100}
            value={values[key] || ""}
            onChange={(e) =>
              setValues((v) => ({ ...v, [key]: e.target.value }))
            }
          />
        )}
      </label>
    );
  }
  const cfgMode = session?.mode || config.mode;
  const priorities = modes[cfgMode as keyof typeof modes].priority;
  const showForm = journey && !result?.pendingId;
  const kb = faq.trim()
    ? knowledge
        .filter(
          (k) =>
            !config.disabledKnowledge.includes(k.id) &&
            (k.question + " " + k.answer)
              .toLowerCase()
              .includes(faq.toLowerCase()),
        )
        .slice(0, 5)
    : [];
  return (
    <main
      lang={language}
      className={`bank bank-kiosk ${large ? "bank-large" : ""} ${contrast ? "bank-contrast" : ""} bank-${config.accent}`}
    >
      <header className="bank-header">
        <a
          href="/juliana"
          className="bank-brand"
          aria-label="Banco Interior inicio"
        >
          <span className="bank-symbol">
            <span />
            <span />
            <span />
          </span>
          <span>
            BANCO<span>INTERIOR</span>
          </span>
        </a>
        <span className="bank-context">
          <span className="bank-dot" />
          {modes[cfgMode as keyof typeof modes].name}
        </span>
        <button
          className="bank-language"
          onClick={() => {
            const l = en ? "es" : "en";
            setLanguage(l);
            if (session) void bankAction("language", { language: l });
          }}
        >
          <Globe size={17} />
          {en ? "Español" : "English"}
        </button>
      </header>
      <div className="bank-demo-line">
        <ShieldCheck size={15} />
        {config.notice} <span>DEMO</span>
      </div>
      {en && (
        <p className="bank-small">
          Juliana can converse in English. Demonstration forms and knowledge
          articles are in Spanish.
        </p>
      )}
      {!online && (
        <div role="status" className="bank-alert">
          <WifiOff />
          Sin conexión · Solo contenido público guardado. Operaciones y
          consultas de remesas deshabilitadas; la información puede no estar
          actualizada.
        </div>
      )}
      <div className="bank-main-grid">
        <section className="bank-content">
          <div className="bank-eyebrow">
            {en
              ? "YOUR VIRTUAL BANKING ASSISTANT"
              : "TU ASESORA BANCARIA VIRTUAL"}
          </div>
          {!journey ? (
            <>
              <h1>
                {en ? "Your next step," : "Tu próximo paso,"}
                <br />
                <em>
                  {en ? "with someone by your side." : "con alguien a tu lado."}
                </em>
              </h1>
              <p className="bank-lead">
                {en
                  ? "Hi, I’m Juliana. Let’s take care of what matters to you, one step at a time."
                  : "¡Qué gusto saludarte! Soy Juliana. Estoy aquí para ayudarte a cuidar lo que más te importa. Vamos paso a paso."}
              </p>
              <button
                className="bank-primary bank-talk"
                disabled={!online || busy || active}
                onClick={() =>
                  perform(async () => {
                    setActive(true);
                  })
                }
              >
                <Mic size={21} />
                {active
                  ? en
                    ? "Conversation active"
                    : "Conversación activa"
                  : en
                    ? "Talk to Juliana"
                    : "Conversar con Juliana"}
                <ArrowUpRight size={20} />
              </button>
              <p className="bank-small">
                {en
                  ? "You can also use the screen. Your camera stays off."
                  : "También podés tocar la pantalla. Tu cámara permanece apagada."}
              </p>
              <div className="bank-services-heading">
                <h2>
                  {en
                    ? "What would you like to do?"
                    : "¿En qué te puedo ayudar?"}
                </h2>
                <span>01 — 06</span>
              </div>
              <div className="bank-services">
                {priorities
                  .filter(
                    (j) =>
                      config.enabled.includes(j) &&
                      modeTools[cfgMode as keyof typeof modes].includes(j),
                  )
                  .map((j) => {
                    const Icon = icons[j];
                    return (
                      <button
                        key={j}
                        disabled={busy || !online}
                        onClick={() => open(j)}
                      >
                        <Icon size={24} />
                        <span>
                          {en
                            ? titlesEn[j]
                            : j === "collect"
                              ? "Enviar o cobrar remesas"
                              : journeys[j].title}
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    );
                  })}
              </div>
              <div className="bank-secondary-links">
                {(["save", "consular", "fraud"] as Journey[])
                  .filter(
                    (j) =>
                      !priorities.includes(j as never) &&
                      config.enabled.includes(j) &&
                      modeTools[cfgMode as keyof typeof modes].includes(j),
                  )
                  .map((j) => (
                    <button
                      disabled={!online || busy}
                      key={j}
                      onClick={() => open(j)}
                    >
                      {en ? titlesEn[j] : journeys[j].short}
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <>
              <button
                className="bank-back"
                onClick={() =>
                  perform(async () => {
                    await bankAction("home");
                    setJourney(null);
                    setResult(null);
                  })
                }
              >
                <ArrowLeft size={17} />
                {en ? "Main menu" : "Menú principal"}
              </button>
              <h1 className="bank-journey-title">
                {en ? titlesEn[journey] : journeys[journey].title}
              </h1>
              <p className="bank-lead">{journeys[journey].description}</p>
              {["send", "collect"].includes(journey) && (
                <div className="bank-tabs">
                  <button
                    aria-pressed={journey === "collect"}
                    onClick={() => open("collect")}
                  >
                    Cobrar
                  </button>
                  <button
                    aria-pressed={journey === "send"}
                    onClick={() => open("send")}
                  >
                    Enviar
                  </button>
                  <button
                    onClick={() => run("information")}
                    disabled={journey === "send" || busy}
                  >
                    Cómo y dónde cobrar
                  </button>
                </div>
              )}
              {showForm && (
                <form
                  className="bank-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(
                      journey === "collect"
                        ? "lookup"
                        : ["help"].includes(journey)
                          ? "request"
                          : ["migrant", "consular", "fraud"].includes(journey)
                            ? "information"
                            : ["account", "pay"].includes(journey)
                              ? "prepare"
                              : "calculate",
                    );
                  }}
                >
                  {journey === "send" && (
                    <>
                      {field("origin", "País de origen", "text", [
                        { value: "US", label: "Estados Unidos (USD)" },
                        { value: "GT", label: "Guatemala (GTQ)" },
                      ])}
                      <p>Destino: Guatemala · GTQ</p>
                      {field("amount", "Monto de ejemplo", "number")}
                    </>
                  )}
                  {journey === "collect" && (
                    <>
                      <p className="bank-form-note">
                        Datos para probar: DEMO-01 / PRUEBA-01 / REM-001.
                      </p>
                      {field("userId", "Identidad de prueba")}
                      {field("demoCode", "Código de prueba (no es tu PIN)")}
                      {field("reference", "Referencia de remesa de prueba")}
                    </>
                  )}
                  {journey === "account" && (
                    <>
                      {field(
                        "product",
                        "¿Qué te gustaría explorar?",
                        "text",
                        products.map((p) => ({ value: p.id, label: p.name })),
                      )}
                      <p className="bank-form-note">
                        Explorá las opciones del catálogo demo.
                      </p>
                    </>
                  )}
                  {journey === "pay" && (
                    <>
                      {field("service", "Servicio", "text", [
                        { value: "electricity", label: "Electricidad" },
                        { value: "water", label: "Agua" },
                        { value: "phone", label: "Telefonía" },
                        { value: "internet", label: "Internet" },
                      ])}
                      {field("reference", "Referencia de prueba")}
                      <p className="bank-form-note">
                        Electricidad: SERV-001 · Agua: SERV-002 · Telefonía:
                        SERV-003 · Internet: SERV-004
                      </p>
                    </>
                  )}
                  {journey === "loan" && (
                    <>
                      {field("amount", "Monto de ejemplo (Q)", "number")}
                      {field("months", "Plazo en meses", "number")}
                      {field(
                        "annualRate",
                        "Tasa anual ilustrativa (%)",
                        "number",
                      )}
                    </>
                  )}
                  {journey === "save" && (
                    <>
                      {field("target", "¿Cuánto querés reunir? (Q)", "number")}
                      {field("saved", "¿Cuánto tenés ahorrado? (Q)", "number")}
                      {field("months", "¿En cuántos meses?", "number")}
                    </>
                  )}
                  {["migrant", "consular"].includes(journey) && (
                    <>
                      {field("country", "País donde estás")}
                      {field(
                        "jurisdiction",
                        "Ciudad o jurisdicción por verificar",
                      )}
                      {field(
                        "need",
                        "¿Qué necesitás?",
                        "text",
                        (journey === "consular"
                          ? [
                              "Pasaporte",
                              "DPI",
                              "Registro civil",
                              "Cita consular",
                              "Consulado móvil",
                              "Representación legal",
                            ]
                          : [
                              "Ahorro y apoyo a mi familia",
                              "Enviar dinero",
                              "Retorno a Guatemala",
                              "Emprender en Guatemala",
                              "Protección de mi patrimonio",
                            ]
                        ).map((v) => ({ value: v, label: v })),
                      )}
                    </>
                  )}
                  {journey === "fraud" && (
                    <p className="bank-form-note">
                      No ingresés números de tarjeta, contraseñas ni códigos.
                      Este kiosco no puede bloquear una tarjeta real.
                    </p>
                  )}
                  {journey === "help" && (
                    <>
                      {field("queue", "¿Con quién necesitás hablar?", "text", [
                        { value: "general", label: "Atención general" },
                        {
                          value: "products",
                          label: "Información de productos",
                        },
                        { value: "fraud", label: "Orientación sobre fraude" },
                      ])}
                      <p>
                        Elegí el equipo que mejor pueda ayudarte. Verás aquí el
                        estado de tu solicitud.
                      </p>
                    </>
                  )}
                  <button className="bank-primary" disabled={busy || !online}>
                    {busy
                      ? "Un momento…"
                      : journey === "help"
                        ? "Solicitar atención"
                        : ["fraud", "migrant", "consular"].includes(journey)
                          ? "Ver orientación"
                          : journey === "collect"
                            ? "Consultar envío"
                            : ["loan", "save"].includes(journey)
                              ? "Calcular ejemplo"
                              : "Revisar datos"}
                    <ArrowRight size={18} />
                  </button>
                </form>
              )}
              {result && result.title !== journeys[journey].title && (
                <section className="bank-result" aria-live="polite">
                  <span className="bank-result-label">
                    {result.kind === "simulation"
                      ? "SIMULACIÓN"
                      : result.kind === "request"
                        ? "SOLICITUD · DEMO"
                        : "ORIENTACIÓN"}
                  </span>
                  <h2>{result.title}</h2>
                  <p>{result.message}</p>
                  {result.details && (
                    <ul>
                      {result.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                  {result.reference && (
                    <div className="bank-reference">{result.reference}</div>
                  )}
                  {result.links?.map((l) => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {l.title}
                      <ArrowUpRight size={14} />
                    </a>
                  ))}
                  {result.pendingId && (
                    <>
                      <label className="bank-consent">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                        />
                        {["account", "loan", "save"].includes(journey)
                          ? "Autorizo crear esta solicitud en modo demo."
                          : "Confirmo esta simulación, sin movimiento de dinero."}
                      </label>
                      <button
                        className="bank-primary"
                        disabled={!consent || busy || !online}
                        onClick={() =>
                          run("confirm", {
                            pendingId: result.pendingId,
                            confirmed: true,
                            consent,
                          })
                        }
                      >
                        Confirmar{" "}
                        {["account", "loan", "save"].includes(journey)
                          ? "solicitud demo"
                          : "simulación"}
                        <Check size={18} />
                      </button>
                    </>
                  )}
                </section>
              )}
              {journey === "fraud" && (
                <button
                  className="bank-secondary"
                  disabled={!online || busy}
                  onClick={() => run("request")}
                >
                  Solicitar atención
                  <Headphones size={18} />
                </button>
              )}
              {["loan", "save"].includes(journey) &&
                result?.kind === "simulation" &&
                !result.pendingId && (
                  <button
                    className="bank-secondary"
                    disabled={busy || !online}
                    onClick={() => run("prepare")}
                  >
                    Me interesa · solicitar orientación
                  </button>
                )}
              {["loan", "save", "account"].includes(journey) && (
                <button className="bank-text-link" onClick={() => open("help")}>
                  Quiero acompañamiento de un asesor <ArrowUpRight size={16} />
                </button>
              )}
              {session?.cases?.map((c: any) => (
                <div className="bank-case" key={c.id}>
                  <Headphones size={20} />
                  <span>
                    {c.id}
                    <strong>
                      {c.status === "waiting"
                        ? "En espera · todavía sin conexión humana"
                        : c.status === "accepted"
                          ? "Un operador aceptó tu caso demo"
                          : "Caso demo resuelto"}
                    </strong>
                  </span>
                </div>
              ))}
            </>
          )}
          {error && (
            <div className="bank-error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Cerrar aviso">
                ×
              </button>
            </div>
          )}
          <form
            className="bank-message"
            onSubmit={(e) => {
              e.preventDefault();
              if (!message.trim()) return;
              void perform(async () => {
                const r = await bankAction("tool", {
                  name: "bankingMessage",
                  args: { message },
                });
                setResult(r);
                setMessage("");
                await refresh();
              });
            }}
          >
            <MessageCircle size={18} />
            <input
              aria-label="Escribir una consulta"
              placeholder={
                en ? "Or tell me what you need…" : "O contame qué necesitás…"
              }
              value={message}
              maxLength={500}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              disabled={busy || !online || !message.trim()}
              aria-label="Enviar consulta"
            >
              <ArrowRight size={20} />
            </button>
          </form>
          {!journey && result && (
            <div className="bank-result" aria-live="polite">
              <h2>{result.title}</h2>
              <p>{result.message}</p>
            </div>
          )}
        </section>
        <aside className="bank-avatar-column">
          <DeviceFrame
            mode={presentation}
            onChange={setPresentation}
            spanish={!en}
            assistantName="Juliana"
          >
            <BankAvatar
              active={active}
              language={language}
              onStop={() => setActive(false)}
              onError={setError}
              onActivity={() => {
                activity.current = Date.now();
              }}
            />
          </DeviceFrame>
          <div className="bank-avatar-foot">
            <span>
              <span className="bank-dot" />
              {active ? "Conversación en vivo" : "Juliana · tu asesora virtual"}
            </span>
            <span>ES / EN</span>
          </div>
          {!active && (
            <p className="bank-small">
              Retrato conceptual. La llamada usa un avatar conversacional de
              demostración del proveedor.
            </p>
          )}
          {journey && (
            <button
              className="bank-primary"
              disabled={!online || busy || active}
              onClick={() =>
                perform(async () => {
                  setActive(true);
                })
              }
            >
              <Mic size={20} />
              {active ? "Conversación activa" : "Conversar con Juliana"}
            </button>
          )}
          <div className="bank-trust">
            <ShieldCheck />
            <div>
              <strong>Tu confianza, primero.</strong>
              <p>
                Nunca te vamos a pedir PIN, contraseña, CVV ni códigos de
                verificación.
              </p>
            </div>
          </div>
        </aside>
      </div>
      <section className="bank-knowledge">
        <div>
          <span className="bank-eyebrow">APRENDER TAMBIÉN ES AVANZAR</span>
          <h2>Respuestas claras, a tu ritmo.</h2>
          <p>
            Contenido educativo guardado. Verificá siempre los detalles vigentes
            en los canales oficiales.
          </p>
        </div>
        <div>
          <input
            aria-label="Buscar conocimiento público"
            placeholder="Buscá remesas, ahorro, fraude…"
            value={faq}
            onChange={(e) => setFaq(e.target.value)}
          />
          {kb.map((k) => (
            <details key={k.id}>
              <summary>{k.question}</summary>
              <p>{k.answer}</p>
              <small>
                {k.status} · {k.validity}
              </small>
              {k.source.startsWith("https://") && (
                <a href={k.source} target="_blank" rel="noreferrer">
                  Consultar fuente ↗
                </a>
              )}
            </details>
          ))}
          {faq && !kb.length && (
            <p>
              No hay una respuesta aprobada para esa búsqueda. Consultá al
              equipo de atención.
            </p>
          )}
        </div>
      </section>
      <footer className="bank-footer">
        <div className="bank-footer-actions">
          <button onClick={() => setLarge((v) => !v)} aria-pressed={large}>
            <Accessibility size={20} />
            Texto grande
          </button>
          <button
            onClick={() => setContrast((v) => !v)}
            aria-pressed={contrast}
          >
            Alto contraste
          </button>
          <button onClick={() => open("help")} disabled={!online || busy}>
            <Headphones size={20} />
            Ayuda humana
          </button>
          <button onClick={reset} disabled={busy}>
            <RotateCcw size={19} />
            Finalizar y limpiar
          </button>
        </div>
        <div className="bank-footer-meta">
          <span>Cerca de vos, estés donde estés.</span>
          <button onClick={() => setDemo((v) => !v)}>Datos de prueba</button>
          <a href="/juliana/admin">Administración ↗</a>
        </div>
        {demo && (
          <section className="bank-demo-panel">
            <h3>Identidades ficticias para explorar</h3>
            <p>
              No uses datos personales reales. Cada referencia REM-001 a REM-020
              corresponde al usuario con el mismo número.
            </p>
            <div>
              {users.map((u) => (
                <span key={u.id}>
                  {u.name} · {u.id} · {u.code}
                </span>
              ))}
            </div>
          </section>
        )}
        {session && !feedback && (
          <div className="bank-feedback">
            <span>Opcional: ¿cómo fue esta experiencia?</span>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                aria-label={`Calificar ${value} de 5`}
                onClick={() =>
                  perform(async () => {
                    await bankAction("feedback", { value });
                    setFeedback(true);
                  })
                }
              >
                {value}
              </button>
            ))}
          </div>
        )}
        {feedback && <p>Gracias. Tu valoración anónima quedó registrada.</p>}
      </footer>
    </main>
  );
}
