"use client";
import { useEffect, useRef, useState } from "react";
import {
  MAX_CALL_SECONDS,
  VOICE_IDLE_MS,
  voiceBudgetReason,
} from "@/lib/voice-budget";
export function useVoiceBudget(
  active: boolean,
  connected: boolean,
  spanish: boolean,
  onStop: () => void,
  onError: (message: string) => void,
) {
  const lastActivity = useRef(Date.now());
  const current = useRef({ connected, spanish, onStop, onError });
  current.current = { connected, spanish, onStop, onError };
  const [notice, setNotice] = useState("");
  const touch = () => {
    lastActivity.current = Date.now();
  };
  useEffect(() => {
    if (connected) touch();
  }, [connected]);
  useEffect(() => {
    if (!active) {
      setNotice("");
      return;
    }
    const started = Date.now();
    touch();
    let stopped = false;
    const stop = (reason: "limit" | "connection" | "idle" | "offline") => {
      if (stopped) return;
      stopped = true;
      const { spanish: es, onStop, onError } = current.current;
      const messages = {
        limit: es
          ? "Llamada finalizada al llegar a 5 minutos. Podés iniciar otra cuando la necesités."
          : "Call ended at the 5-minute limit. Start another when needed.",
        idle: es
          ? "Voz pausada después de 90 segundos sin conversación para ahorrar minutos."
          : "Voice stopped after 90 seconds without conversation to save minutes.",
        connection: es
          ? "La conexión tardó demasiado. La llamada se cerró; podés volver a intentar."
          : "Connection timed out. The call was closed; you can try again.",
        offline: es
          ? "Sin conexión. La llamada se cerró; reconectá cuando estés listo."
          : "Offline. The call was closed; reconnect when ready.",
      };
      onError(messages[reason]);
      onStop();
    };
    const tick = () => {
      const now = Date.now(),
        { connected, spanish: es } = current.current;
      const reason = voiceBudgetReason(
        now,
        started,
        lastActivity.current,
        connected,
      );
      if (reason) {
        stop(reason);
        return;
      }
      const left = Math.ceil(
        Math.min(
          MAX_CALL_SECONDS * 1000 - (now - started),
          connected ? VOICE_IDLE_MS - (now - lastActivity.current) : Infinity,
        ) / 1000,
      );
      setNotice(
        left <= 20
          ? es
            ? `Cierre automático en ${left}s`
            : `Auto-stop in ${left}s`
          : es
            ? "Ahorro activo · máximo 5 min"
            : "Savings on · 5 min maximum",
      );
    };
    const offline = () => stop("offline");
    const timer = setInterval(tick, 1000);
    window.addEventListener("offline", offline);
    // A hidden tab can be the tab being presented in Teams/Meet. Do not end it.
    tick();
    return () => {
      clearInterval(timer);
      window.removeEventListener("offline", offline);
    };
  }, [active]);
  return { touch, notice };
}
