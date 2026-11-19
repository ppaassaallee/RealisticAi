"use client";
import { useSiteLanguage } from "@/components/SiteLanguage";
import { ArrowUpRight, Mic, LayoutGrid, ArrowLeftRight } from "lucide-react";
import styles from "./platform.module.css";
export default function Page() {
  const { language, t } = useSiteLanguage();
  return (
    <main className={styles.page} lang={language}>
      <div className={styles.intro}>
        <span>ONESOURCE · AI KIOSK</span>
        <h1>
          {t("Two assistants.", "Dos asistentes.")}
          <br />
          {t("A more human way to help.", "Una forma más humana de atender.")}
        </h1>
        <p>
          {t("Choose an experience to get started. Switch between Alex and Juliana anytime using the navigation above.", "Elegí una experiencia para empezar. Podés pasar de Alex a Juliana desde la barra superior, en cualquier momento.")}
        </p>
      </div>
      <div className={styles.cards}>
        <a
          href="/kiosk"
          className={styles.card}
          aria-label={t("Open Alex demo", "Abrir demo de Alex")}
        >
          <div className={styles.portrait}>
            <img
              src="/alex-preview.png"
              alt={t("Alex, virtual healthcare assistant", "Alex, asistente virtual de salud")}
            />
            <span>{t("HEALTHCARE \u00b7 ONESOURCE", "SALUD · ONESOURCE")}</span>
          </div>
          <div className={styles.copy}>
            <h2>{t("Meet Alex", "Conocé a Alex")}</h2>
            <p>
              {t("A warmer welcome. Find appointments, try check-in, and request help from reception.", "Una bienvenida más cercana. Consultá citas, probá el check-in y pedí ayuda en recepción.")}
            </p>
            <strong>
              {t("Open Alex demo", "Abrir demo de Alex")} <ArrowUpRight size={20} />
            </strong>
          </div>
        </a>
        <a
          href="/juliana"
          className={`${styles.card} ${styles.bank}`}
          aria-label={t("Open Juliana demo", "Abrir demo de Juliana")}
        >
          <div className={styles.portrait}>
            <img
              src="/juliana-preview.png"
              alt={t("Juliana, virtual banking assistant", "Juliana, asesora virtual de banca")}
            />
            <span>{t("BANKING \u00b7 ONESOURCE", "BANCA · ONESOURCE")}</span>
          </div>
          <div className={styles.copy}>
            <h2>{t("Meet Juliana", "Conocé a Juliana")}</h2>
            <p>
              {t("Closer to your goals. Explore remittances, savings, bill payments, and financial guidance.", "Más cerca de tus metas. Explorá remesas, ahorro, servicios y orientación financiera.")}
            </p>
            <strong>
              {t("Open Juliana demo", "Abrir demo de Juliana")} <ArrowUpRight size={20} />
            </strong>
          </div>
        </a>
      </div>
      <div className={styles.steps}>
        <div>
          <LayoutGrid size={20} />
          <span>
            <strong>{t("Choose your format", "Elegí tu formato")}</strong>{t("Kiosk, tablet, or web chat.", "Kiosco, tablet o chat web.")}
          </span>
        </div>
        <div>
          <Mic size={20} />
          <span>
            <strong>{t("Start a conversation", "Iniciá la conversación")}</strong>{t("Turn on voice when you are ready.", "Activá la voz cuando estés   listo.")}
          </span>
        </div>
        <div>
          <ArrowLeftRight size={20} />
          <span>
            <strong>{t("Switch in one click", "Cambiá con un clic")}</strong>{t("Your previous session closes when you leave.", "La sesión anterior se cierra al   salir.")}
          </span>
        </div>
      </div>
      <p className={styles.note}>
        {t("Browsing does not start a call. Staff tools are under", "Explorar las pantallas no inicia una llamada. Las herramientas del personal están en")} <strong>{t("Team", "Equipo")}</strong>.
      </p>
    </main>
  );
}
