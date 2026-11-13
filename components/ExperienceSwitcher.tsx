"use client";
import { useEffect, useRef, useState } from "react";
import { Layers, ArrowUpRight, X } from "lucide-react";
import styles from "./ExperienceSwitcher.module.css";
type Experience = "alex" | "juliana";
export default function ExperienceSwitcher({
  current,
}: {
  current: Experience;
}) {
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/juliana?access=1")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setAllowed(d.allowed === true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (open) close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        trigger.current?.focus();
      }
      if (allowed && e.altKey && e.shiftKey && e.code === "KeyE") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const outside = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open, allowed]);
  async function change(next: Experience) {
    if (busy || next === current) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        current === "alex" ? "/api/action" : "/api/juliana",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "end" }),
        },
      );
      const data = await r.json();
      if (
        !r.ok &&
        !/Start a session first|Empezá una sesión primero/.test(
          data.error || "",
        )
      )
        throw new Error();
      window.location.assign(next === "alex" ? "/kiosk" : "/juliana");
    } catch {
      setError("No pudimos cerrar la sesión. Intentá de nuevo.");
      setBusy(false);
    }
  }
  if (!allowed) return null;
  return (
    <div ref={container} className={styles.switcher} data-experience={current}>
      {open && (
        <section
          className={styles.panel}
          role="dialog"
          aria-label="Elegir experiencia"
        >
          <div className={styles.heading}>
            <span>CAMBIAR EXPERIENCIA</span>
            <button
              ref={close}
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
              aria-label="Cerrar selector"
            >
              <X size={17} />
            </button>
          </div>
          {(
            [
              ["alex", "Alex", "Healthcare concierge", "/alex-preview.png"],
              ["juliana", "Juliana", "Banco Interior", "/juliana-preview.png"],
            ] as const
          ).map(([id, name, detail, image]) => (
            <button
              key={id}
              className={styles.option}
              disabled={busy || id === current}
              onClick={() => change(id)}
              aria-label={`Cambiar a ${name}`}
            >
              <img src={image} alt="" />
              <span>
                <strong>{name}</strong>
                <small>{detail}</small>
              </span>
              {id === current ? (
                <span className={styles.current}>Actual</span>
              ) : (
                <ArrowUpRight size={17} />
              )}
            </button>
          ))}
          <p>
            {busy
              ? "Cerrando la sesión actual…"
              : "Cambiar termina la sesión actual."}
          </p>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <a href="/platform">
            Administrar experiencias <ArrowUpRight size={13} />
          </a>
        </section>
      )}
      <button
        ref={trigger}
        className={styles.trigger}
        aria-label="Cambiar experiencia"
        title="Cambiar experiencia · Alt + Shift + E"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Layers size={19} />
      </button>
    </div>
  );
}
