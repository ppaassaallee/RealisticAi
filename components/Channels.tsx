import {
  Tv,
  Tablet,
  Monitor,
  Smartphone,
  MessagesSquare,
  MessageCircle,
} from "lucide-react";
export default function Channels({ spanish = false }: { spanish?: boolean }) {
  const channels = [
    { name: "TV", icon: Tv },
    { name: "Tablet", icon: Tablet },
    { name: spanish ? "Kiosco" : "Kiosk", icon: Monitor },
    { name: spanish ? "Teléfono" : "Phone", icon: Smartphone },
    { name: spanish ? "Chat web" : "Web chat", icon: MessagesSquare },
    { name: "WhatsApp", icon: MessageCircle, integration: true },
  ];
  return (
    <section
      className="channel-showcase"
      aria-label={spanish ? "Canales de AI Kiosk" : "AI Kiosk channels"}
    >
      <div className="channel-heading">
        <div>
          <div className="eyebrow">
            AI KIOSK ·{" "}
            {spanish ? "EN CADA PUNTO DE CONTACTO" : "ACROSS EVERY TOUCHPOINT"}
          </div>
          <h2>
            {spanish
              ? "Alex, donde lo necesites."
              : "Meet Alex, wherever you are."}
          </h2>
        </div>
        <p>
          {spanish
            ? "En una pantalla, en un espacio físico o en una conversación digital."
            : "On a screen, in your space, or in a digital conversation."}
        </p>
      </div>
      <div className="channel-grid">
        {channels.map(({ name, icon: Icon, integration }) => (
          <div className="channel-item" key={name}>
            <Icon size={23} strokeWidth={1.5} aria-hidden="true" />
            <strong>{name}</strong>
            {integration && (
              <span>
                {spanish ? "Opción de integración" : "Integration option"}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="channel-note">
        {spanish
          ? "Demo disponible en navegador. WhatsApp requiere una integración adicional y no está conectado en esta demo."
          : "This demo runs in a browser. WhatsApp requires a separate integration and is not connected in this demo."}
      </p>
    </section>
  );
}
