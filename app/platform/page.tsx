import { ArrowUpRight, Mic, LayoutGrid, ArrowLeftRight } from "lucide-react";
import styles from "./platform.module.css";
export const metadata = { title: "AI Kiosk | Elegí tu demo" };
export default function Page() {
  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <span>ONESOURCE · AI KIOSK</span>
        <h1>
          Dos asistentes.
          <br />
          Una forma más humana de atender.
        </h1>
        <p>
          Elegí una experiencia para empezar. Podés pasar de Alex a Juliana
          desde la barra superior, en cualquier momento.
        </p>
      </div>
      <div className={styles.cards}>
        <a
          href="/kiosk"
          className={styles.card}
          aria-label="Abrir demo de Alex"
        >
          <div className={styles.portrait}>
            <img
              src="/alex-preview.png"
              alt="Alex, asistente virtual de salud"
            />
            <span>SALUD · ONESOURCE</span>
          </div>
          <div className={styles.copy}>
            <h2>Conocé a Alex</h2>
            <p>
              Una bienvenida más cercana. Consultá citas, probá el check-in y
              pedí ayuda en recepción.
            </p>
            <strong>
              Abrir demo de Alex <ArrowUpRight size={20} />
            </strong>
          </div>
        </a>
        <a
          href="/juliana"
          className={`${styles.card} ${styles.bank}`}
          aria-label="Abrir demo de Juliana"
        >
          <div className={styles.portrait}>
            <img
              src="/juliana-preview.png"
              alt="Juliana, asesora virtual de banca"
            />
            <span>BANCA · BANCO INTERIOR</span>
          </div>
          <div className={styles.copy}>
            <h2>Conocé a Juliana</h2>
            <p>
              Más cerca de tus metas. Explorá remesas, ahorro, servicios y
              orientación financiera.
            </p>
            <strong>
              Abrir demo de Juliana <ArrowUpRight size={20} />
            </strong>
          </div>
        </a>
      </div>
      <div className={styles.steps}>
        <div>
          <LayoutGrid size={20} />
          <span>
            <strong>Elegí tu formato</strong>Kiosco, tablet o chat web.
          </span>
        </div>
        <div>
          <Mic size={20} />
          <span>
            <strong>Iniciá la conversación</strong>Activá la voz cuando estés
            listo.
          </span>
        </div>
        <div>
          <ArrowLeftRight size={20} />
          <span>
            <strong>Cambiá con un clic</strong>La sesión anterior se cierra al
            salir.
          </span>
        </div>
      </div>
      <p className={styles.note}>
        Explorar las pantallas no inicia una llamada. Las herramientas del
        personal están en <strong>Equipo</strong>.
      </p>
    </main>
  );
}
