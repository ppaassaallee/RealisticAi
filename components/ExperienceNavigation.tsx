"use client";
import { usePathname } from "next/navigation";
import { useSiteLanguage } from "./SiteLanguage";
import { useState } from "react";
import { Home, LockKeyhole, ArrowUpRight } from "lucide-react";
import styles from "./ExperienceNavigation.module.css";
export default function ExperienceNavigation() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useSiteLanguage();
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
        t("We could not close your session. Please try again before switching.", "No pudimos cerrar la sesión. Intentá de nuevo antes de cambiar."),
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
      <nav className={styles.bar} aria-label={t("Demo navigation", "Navegación de demos")}>
        <a
          href="/platform"
          onClick={link("/platform")}
          className={styles.brand}
          aria-label={t("AI Kiosk \u00b7 Home", "AI Kiosk · Inicio")}
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
            <span>{t("Home", "Inicio")}</span>
          </a>
          <a
            href="/kiosk"
            onClick={link("/kiosk")}
            aria-label={t("Alex \u00b7 Healthcare", "Alex · Salud")}
            aria-current={pathname === "/kiosk" ? "page" : undefined}
            aria-disabled={busy}
          >
            <img src="/alex-preview.png" alt="" />
            <span>
              Alex<small>{t("Healthcare", "Salud")}</small>
            </span>
          </a>
          <a
            href="/juliana"
            onClick={link("/juliana")}
            aria-label={t("Juliana \u00b7 Banking", "Juliana · Banca")}
            aria-current={pathname === "/juliana" ? "page" : undefined}
            aria-disabled={busy}
          >
            <img src="/juliana-preview.png" alt="" />
            <span>
              Juliana<small>{t("Banking", "Banca")}</small>
            </span>
          </a>
        </div>
        <button type="button" className={styles.language} onClick={() => setLanguage(language === "en" ? "es" : "en")} aria-label={t("Switch to Spanish", "Cambiar a inglés")} lang={language === "en" ? "es" : "en"}>
          {language === "en" ? "Español" : "English"}
        </button>
        <details className={styles.team}>
          <summary>
            <LockKeyhole size={15} />
            <span>{t("Team", "Equipo")}</span>
          </summary>
          <div className={styles.menu}>
            <strong>{t("Team area", "Área del equipo")}</strong>
            <p>
              {t("Staff credentials required. To present a demo, choose Alex or Juliana.", "Requiere una credencial de personal. Para presentar una demo, elegí Alex o Juliana.")}
            </p>
            <span>{t("ALEX \u00b7 HEALTHCARE", "ALEX · SALUD")}</span>
            <a href="/staff" onClick={link("/staff")}>
              {t("Reception", "Recepción")} <ArrowUpRight size={14} />
            </a>
            <a href="/analytics" onClick={link("/analytics")}>
              {t("Alex analytics", "Analítica de Alex")} <ArrowUpRight size={14} />
            </a>
            <a href="/demo" onClick={link("/demo")}>
              {t("Prepare sample data", "Preparar datos de prueba")} <ArrowUpRight size={14} />
            </a>
            <span>{t("JULIANA \u00b7 BANKING", "JULIANA · BANCA")}</span>
            <a href="/juliana/admin" onClick={link("/juliana/admin")}>
              {t("Administration", "Administración")} <ArrowUpRight size={14} />
            </a>
            <a href="/juliana/analytics" onClick={link("/juliana/analytics")}>
              {t("Juliana analytics", "Analítica de Juliana")} <ArrowUpRight size={14} />
            </a>
          </div>
        </details>
      </nav>
      {(busy || error) && (
        <div className={styles.message} role={error ? "alert" : "status"}>
          {error || t("Closing your current session…", "Cerrando la sesión actual para cambiar…")}
        </div>
      )}
    </header>
  );
}
