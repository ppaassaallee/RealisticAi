"use client";
import Brand from "./Brand";
import Channels from "./Channels";
import { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  Check,
  Globe2,
  Headphones,
  ShieldCheck,
  Sparkles,
  CalendarDays,
  RotateCcw,
} from "lucide-react";
import Avatar from "./Avatar";
import DeviceFrame, { type Presentation } from "./DeviceFrame";
import KnowledgePanel from "./KnowledgePanel";
import { action } from "@/lib/client";
type Appointment = {
  id: string;
  time: string;
  department: string;
  checkedIn: boolean;
};
type State = {
  session?: {
    id: string;
    language: "en" | "es";
    ended?: boolean;
    lookup?: string;
  };
  patient?: { name: string; appointments: Appointment[] };
  cases: { id: string; status: string }[];
  avatarConfigured?: boolean;
};
export default function Kiosk() {
  const [state, setState] = useState<State>({ cases: [] }),
    [language, setLanguage] = useState<"en" | "es">("en"),
    [step, setStep] = useState("welcome"),
    [presentation, setPresentation] = useState<Presentation>("kiosk"),
    [active, setActive] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [connection, setConnection] = useState(true),
    [streamKey, setStreamKey] = useState(0);
  const es = language === "es";
  const currentSession = useRef<string | undefined>(undefined);
  useEffect(() => {
    let events: EventSource;
    let stopped = false;
    void fetch("/api/state")
      .then((r) => r.json())
      .then((data) => {
        if (stopped) return;
        if (
          currentSession.current &&
          data.session?.id !== currentSession.current
        )
          return;
        setState(data);
        if (data.session && !data.session.ended)
          setLanguage(data.session.language);
        events = new EventSource("/api/events");
        events.onmessage = (e) => {
          if (stopped) return;
          const s = JSON.parse(e.data);
          if (
            currentSession.current &&
            s.session?.id !== currentSession.current
          )
            return;
          setState((previous) => ({ ...previous, ...s }));
          setConnection(true);
          if (s.session?.ended) {
            setActive(false);
            setStep("welcome");
          } else if (s.patient) {
            setStep((previous) =>
              previous === "welcome" ? "identity" : previous,
            );
          } else if (s.cases?.length) {
            setStep((previous) =>
              previous === "welcome" ? "handoff" : previous,
            );
          }
        };
        events.onerror = () => setConnection(false);
      });
    return () => {
      stopped = true;
      events?.close();
    };
  }, [streamKey]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }
  async function ensureSession() {
    if (!state.session || state.session.ended) {
      const s = await action("session", { language, presentation });
      currentSession.current = s.id;
      setState((p) => ({ ...p, session: s, patient: undefined, cases: [] }));
      setStreamKey((k) => k + 1);
      return true;
    }
    return true;
  }
  // Initial session is created on a deliberate interaction; SSE reconnects after cookie changes.
  async function begin(next: string) {
    await run(async () => {
      if (!state.session || state.session.ended) {
        const s = await action("session", { language, presentation });
        currentSession.current = s.id;
        setState((p) => ({ ...p, session: s, patient: undefined, cases: [] }));
        setStreamKey((k) => k + 1);
        setStep(next);
        return;
      }
      setStep(next);
    });
  }

  async function assist() {
    await run(async () => {
      if (!(await ensureSession())) return;
      await action("tool", {
        name: "requestHumanAssistance",
        args: {
          reason:
            state.session?.lookup === "missing"
              ? "Appointment not found"
              : "Patient requested a receptionist",
          language,
        },
      });
      setStep("handoff");
    });
  }
  const currentCase =
    state.cases?.find((c) => c.status !== "resolved") || state.cases?.[0];
  const verified = state.patient;
  const appointments = verified?.appointments || [];
  const lookup = state.session?.lookup;
  return (
    <main className="kiosk-shell">
      <header className="topbar">
        <Brand />
        <div className="location-label">
          WELCOME CLINIC <span>Patient concierge</span>
        </div>
        <div className="language-toggle">
          <Globe2 size={17} />
          <button
            className={!es ? "selected" : ""}
            onClick={() => {
              setLanguage("en");
              if (state.session) void action("language", { language: "en" });
            }}
          >
            EN
          </button>
          <button
            className={es ? "selected" : ""}
            onClick={() => {
              setLanguage("es");
              if (state.session) void action("language", { language: "es" });
            }}
          >
            ES
          </button>
        </div>
      </header>
      <div className={"kiosk-grid " + (step !== "welcome" ? "in-flow" : "")}>
        <section className="hero-copy">
          <div className="eyebrow">
            <span />{" "}
            {es ? "ESTAMOS AQUÍ PARA TI" : "HERE TO MAKE YOU FEEL AT HOME"}
          </div>
          <h1>
            {es ? "Tu visita empieza" : "Your visit starts"}
            <br />
            <em>{es ? "con una bienvenida." : "with a welcome."}</em>
          </h1>
          <p className="intro">
            {es
              ? "Soy Alex, tu asistente virtual. Te ayudaré a registrarte o a hablar con nuestro equipo."
              : "I’m Alex, your AI concierge. I’ll help you check in and connect with our care team."}
          </p>
          {step === "welcome" && (
            <div className="welcome-actions">
              <button
                className="primary"
                disabled={busy}
                onClick={() => void begin("identity")}
              >
                <CalendarDays size={22} />
                {es ? "Registrarme" : "Check in"}
                <ArrowRight className="trailing" size={21} />
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void begin("assistance")}
              >
                <Headphones size={22} />
                {es ? "Asistencia humana" : "Human assistance"}
                <ArrowRight className="trailing" size={21} />
              </button>
              <div className="small-note">
                <ShieldCheck size={17} />
                {es
                  ? "Demostración · Solo datos ficticios"
                  : "Demonstration · Fictional patient data only"}
              </div>
            </div>
          )}
          {step !== "welcome" && (
            <section className="workflow">
              <div className="workflow-top">
                <span>{es ? "TU VISITA" : "YOUR VISIT"}</span>
                <button
                  className="text-button"
                  onClick={() => {
                    setStep("welcome");
                    setMessage("");
                    setError("");
                  }}
                >
                  {es ? "Volver" : "Back"}
                </button>
              </div>
              {step === "assistance" && (
                <>
                  <h2>
                    {es
                      ? "Nuestro equipo puede ayudarte."
                      : "Let’s get you to our team."}
                  </h2>
                  <p>
                    {es
                      ? "Enviaremos tu solicitud a recepción."
                      : "We’ll send your request to the front desk, along with any details already collected."}
                  </p>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void assist()}
                  >
                    {es ? "Solicitar asistencia" : "Request a receptionist"}
                    <ArrowRight size={20} />
                  </button>
                </>
              )}
              {step === "identity" && !verified && (
                <>
                  <h2>{es ? "Empecemos contigo." : "Let’s start with you."}</h2>
                  <p>
                    {es
                      ? "Verifica tus datos antes de ver tu cita."
                      : "Verify your details to securely find your appointment."}
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const data = new FormData(e.currentTarget);
                      void run(async () => {
                        const result = await action("tool", {
                          name: "searchAppointment",
                          args: {
                            name: data.get("name"),
                            dob: data.get("dob"),
                            code: data.get("code"),
                          },
                        });
                        if (result.status === "not_verified")
                          setError(
                            es
                              ? "No pudimos verificar tus datos. Inténtalo de nuevo."
                              : "We couldn’t verify those details. Please try again.",
                          );
                        if (result.status === "technical_error")
                          setError(
                            es
                              ? "No pudimos consultar tu cita. Recepción puede ayudarte."
                              : "We couldn’t retrieve your appointment. Our reception team can help.",
                          );
                      });
                    }}
                  >
                    <label>
                      {es ? "Nombre completo" : "Full name"}
                      <input
                        name="name"
                        required
                        autoComplete="off"
                        placeholder="Jordan Rivera"
                      />
                    </label>
                    <div className="field-row">
                      <label>
                        {es ? "Fecha de nacimiento" : "Date of birth"}
                        <input name="dob" type="date" required />
                      </label>
                      <label>
                        {es ? "Código del paciente" : "Patient code"}
                        <input
                          name="code"
                          required
                          pattern="[0-9]{4}"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="4 digits"
                        />
                      </label>
                    </div>
                    <button className="primary" disabled={busy}>
                      {busy
                        ? es
                          ? "Buscando…"
                          : "Finding your visit…"
                        : es
                          ? "Buscar mi cita"
                          : "Find my appointment"}
                      <ArrowRight size={20} />
                    </button>
                  </form>
                </>
              )}
              {verified && step === "identity" && (
                <>
                  <div className="verified">
                    <ShieldCheck size={16} />
                    {es ? "Identidad verificada" : "Identity verified"}
                  </div>
                  <h2>{verified.name}</h2>
                  {!appointments.length ? (
                    <p>
                      {es
                        ? "No encontramos una cita. Nuestro equipo puede ayudarte."
                        : "We couldn’t find an appointment. Let’s ask our team to help."}
                    </p>
                  ) : (
                    <>
                      <p>
                        {appointments.length > 1
                          ? es
                            ? "Selecciona la cita para registrarte."
                            : "Choose the appointment you’re checking in for."
                          : es
                            ? "Confirma tu cita para registrarte."
                            : "Confirm your appointment to complete check-in."}
                      </p>
                      {appointments.map((a) => (
                        <div className="appointment" key={a.id}>
                          <div>
                            <span className="appointment-time">{a.time}</span>
                            <span>
                              {es && a.department === "Primary care"
                                ? "Atención primaria"
                                : a.department}
                            </span>
                          </div>
                          {a.checkedIn ? (
                            <span className="success-badge">
                              <Check size={16} />
                              {es ? "Registrado" : "Checked in"}
                            </span>
                          ) : (
                            <button
                              disabled={busy}
                              className="primary compact"
                              onClick={() =>
                                void run(async () => {
                                  await action("tool", {
                                    name: "checkInAppointment",
                                    args: {
                                      appointmentId: a.id,
                                      confirmed: true,
                                    },
                                  });
                                  setMessage(
                                    es
                                      ? "Ya estás registrado. Toma asiento; nuestro equipo te llamará."
                                      : "You’re checked in. Take a seat; our team will call you shortly.",
                                  );
                                })
                              }
                            >
                              {es ? "Confirmar" : "Confirm check-in"}
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
              {(step === "handoff" || currentCase) && currentCase && (
                <div className="handoff-status">
                  <div className="status-icon">
                    {currentCase.status === "waiting" ? (
                      <Headphones />
                    ) : (
                      <Check />
                    )}
                  </div>
                  <h2>
                    {currentCase.status === "accepted"
                      ? es
                        ? "Una persona te está ayudando."
                        : "A person is here to help."
                      : currentCase.status === "resolved"
                        ? es
                          ? "Solicitud resuelta."
                          : "Your request is resolved."
                        : es
                          ? "Recepción ha recibido tu solicitud."
                          : "You’re in the right hands."}
                  </h2>
                  <p>
                    {currentCase.status === "waiting"
                      ? es
                        ? "Tu solicitud está en la cola de recepción."
                        : "Your request is in the reception queue. We’ll update you here when someone accepts it."
                      : es
                        ? "Nuestro equipo recibió el contexto de tu visita."
                        : "Our front desk has your visit context and will assist you at reception."}
                  </p>
                  <span className="case-ref">
                    {es ? "Referencia" : "Reference"}{" "}
                    {currentCase.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              )}
              {message && (
                <div className="success-message" role="status">
                  <Check size={20} />
                  {message}
                </div>
              )}
              {step === "identity" && (
                <button
                  className="text-button assistance-link"
                  disabled={busy}
                  onClick={() => void assist()}
                >
                  <Headphones size={16} />
                  {es
                    ? "Pedir ayuda a recepción"
                    : "Ask the front desk for help"}
                </button>
              )}
            </section>
          )}
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          {!connection && (
            <div className="error-message" role="status">
              {es
                ? "Reconectando con recepción…"
                : "Reconnecting to reception…"}
            </div>
          )}
          <KnowledgePanel spanish={es} />
          <div className="voice-invite">
            <Sparkles size={20} />
            <div>
              <strong>
                {es ? "¿Prefieres conversar?" : "Prefer a conversation?"}
              </strong>
              <span>
                {active
                  ? es
                    ? "Habla de forma natural. Puedes interrumpir a Alex."
                    : "Speak naturally. You can interrupt Alex."
                  : es
                    ? "Inicia una llamada con Alex. Tu cámara permanece apagada."
                    : "Start a call with Alex. Your camera stays off."}
              </span>
            </div>
            <button
              className="text-button"
              disabled={busy || active}
              onClick={() =>
                void run(async () => {
                  if (!(await ensureSession())) return;
                  if (!state.avatarConfigured)
                    throw new Error(
                      es
                        ? "La conversación en vivo requiere configurar Tavus. Puedes usar el registro táctil."
                        : "Live conversation needs Tavus configuration. Touchscreen check-in is ready.",
                    );
                  setActive(true);
                })
              }
            >
              {active
                ? es
                  ? "Conectado"
                  : "In session"
                : es
                  ? "Hablar"
                  : "Talk to Alex"}
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
        <section className="avatar-column">
          <DeviceFrame
            mode={presentation}
            onChange={setPresentation}
            spanish={es}
          >
            <Avatar
              active={active}
              language={language}
              onStop={() => setActive(false)}
              onError={setError}
            />
          </DeviceFrame>
          <div className="avatar-footnote">
            <span className="dot" />
            {es ? "Inglés y español" : "English & Español"}
            <span>
              {active
                ? es
                  ? "Conversación en vivo"
                  : "Live conversation"
                : es
                  ? "Inicia una llamada para conversar"
                  : "Start a call to connect"}
            </span>
          </div>
        </section>
      </div>
      <Channels spanish={es} />
      <footer className="kiosk-footer">
        <span>
          {es
            ? "Una llegada más sencilla. Una atención más cercana."
            : "An easier arrival. A little more care."}
        </span>
        <div>
          {state.session && !state.session.ended && (
            <button
              onClick={() =>
                void run(async () => {
                  setActive(false);
                  await action("end");
                  setState((p) => ({
                    ...p,
                    session: p.session
                      ? { ...p.session, ended: true }
                      : undefined,
                    patient: undefined,
                    cases: [],
                  }));
                  setStep("welcome");
                  setMessage("");
                })
              }
            >
              <RotateCcw size={14} />
              {es ? "Terminar sesión" : "End session"}
            </button>
          )}
          <a href="/staff">{es ? "Recepción" : "Staff"}</a>
          <a href="/demo">Demo</a>
          <a href="/analytics">{es ? "Analítica" : "Analytics"}</a>
        </div>
      </footer>
    </main>
  );
}
