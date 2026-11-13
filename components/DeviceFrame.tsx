"use client";
import { Monitor, Tablet, MessagesSquare, LockKeyhole } from "lucide-react";
export type Presentation = "kiosk" | "tablet" | "web";
export default function DeviceFrame({
  mode,
  onChange,
  spanish,
  children,
  assistantName = "Alex",
}: {
  mode: Presentation;
  onChange: (mode: Presentation) => void;
  spanish: boolean;
  children: React.ReactNode;
  assistantName?: string;
}) {
  return (
    <div className={"device-preview device-" + mode}>
      <div
        className="device-selector"
        aria-label={spanish ? "Vista del dispositivo" : "Device preview"}
      >
        {(
          [
            { id: "kiosk", label: spanish ? "Kiosco" : "Kiosk", Icon: Monitor },
            { id: "tablet", label: "Tablet", Icon: Tablet },
            {
              id: "web",
              label: spanish ? "Chat web" : "Web chat",
              Icon: MessagesSquare,
            },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            aria-pressed={mode === id}
            onClick={() => onChange(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
      <div className="device-body">
        <div className="device-chrome">
          <span className="device-camera" />
          <span className="device-address">
            <LockKeyhole size={10} /> OneSource · AI Kiosk
          </span>
          <span className="device-dots">•••</span>
        </div>
        <div className="device-screen">{children}</div>
        <div className="device-home" />
      </div>
      <div className="device-stand" aria-hidden="true">
        <span />
      </div>
      <div className="device-description">
        {spanish
          ? `Vista de presentación · La misma experiencia de ${assistantName}`
          : `Presentation preview · The same ${assistantName} experience`}
      </div>
    </div>
  );
}
