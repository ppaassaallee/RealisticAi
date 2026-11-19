"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, LockKeyhole, ArrowUpRight } from "lucide-react";
import styles from "./ExperienceNavigation.module.css";
export default function ExperienceNavigation() {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function navigate(href: string) {
    if (busy || href === pathname) return;
    setBusy(true);
    setError("");
    try {
      const api =
        pathname === "/kiosk"
          ? "/api/action"
          : pathname === "/juliana"
            ? "/api/juliana"
            : null;
      if (api) {
        const response = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "end" }),
        });
        const data = await response.json();
        if (
          !response.ok &&
          !/Start a session first|Empezá una sesión primero/.test(
            data.error || "",
          )
        )
          throw new Error();
      }
      window.location.assign(href);
    } catch {
      setError(
        "No pudimos cerrar la sesión. Intentá de nuevo antes de cambiar.",
      );
      setBusy(false);
    }
  }
  const link =
    (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      void navigate(href);
    };
  return (
    <header className={styles.shell}>
      <nav className={styles.bar} aria-label="Navegación de demos">
        <a
          href="/platform"
          onClick={link("/platform")}
          className={styles.brand}
          aria-label="AI Kiosk · Inicio"
        >
          AI Kiosk<span>by OneSource</span>
        </a>
        <div className={styles.destinations}>
          <a
            href="/platform"
            onClick={link("/platform")}
            aria-current={pathname === "/platform" ? "page" : undefined}
            aria-disabled={busy}
          >
            <Home size={17} />
            <span>Inicio</span>
          </a>
          <a
            href="/kiosk"
            onClick={link("/kiosk")}
            aria-label="Alex · Salud"
            aria-current={pathname === "/kiosk" ? "page" : undefined}
            aria-disabled={busy}
          >
            <img src="/alex-preview.png" alt="" />
            <span>
              Alex<small>Salud</small>
            </span>
          </a>
          <a
            href="/juliana"
            onClick={link("/juliana")}
            aria-label="Juliana · Banca"
            aria-current={pathname === "/juliana" ? "page" : undefined}
            aria-disabled={busy}
          >
            <img src="/juliana-preview.png" alt="" />
            <span>
              Juliana<small>Banca</small>
            </span>
          </a>
        </div>
        <details className={styles.team}>
          <summary>
            <LockKeyhole size={15} />
            <span>Equipo</span>
          </summary>
          <div className={styles.menu}>
            <strong>Área del equipo</strong>
            <p>
              Requiere una credencial de personal. Para presentar una demo,
              elegí Alex o Juliana.
            </p>
            <span>ALEX · SALUD</span>
            <a href="/staff" onClick={link("/staff")}>
              Recepción <ArrowUpRight size={14} />
            </a>
            <a href="/analytics" onClick={link("/analytics")}>
              Analítica de Alex <ArrowUpRight size={14} />
            </a>
            <a href="/demo" onClick={link("/demo")}>
              Preparar datos de prueba <ArrowUpRight size={14} />
            </a>
            <span>JULIANA · BANCA</span>
            <a href="/juliana/admin" onClick={link("/juliana/admin")}>
              Administración <ArrowUpRight size={14} />
            </a>
            <a href="/juliana/analytics" onClick={link("/juliana/analytics")}>
              Analítica de Juliana <ArrowUpRight size={14} />
            </a>
          </div>
        </details>
      </nav>
      {(busy || error) && (
        <div className={styles.message} role={error ? "alert" : "status"}>
          {error || "Cerrando la sesión actual para cambiar…"}
        </div>
      )}
    </header>
  );
}
