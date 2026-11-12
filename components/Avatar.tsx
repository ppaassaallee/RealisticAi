"use client";
import { useEffect, useRef, useState } from "react";
import type { DailyCall } from "@daily-co/daily-js";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { action } from "@/lib/client";
let pendingShutdown: Promise<unknown> = Promise.resolve();
export default function Avatar({
  active,
  language,
  onStop,
  onError,
}: {
  active: boolean;
  language: "en" | "es";
  onStop: () => void;
  onError: (message: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    audio = useRef<HTMLAudioElement>(null),
    call = useRef<DailyCall | null>(null),
    conversation = useRef("");
  const [status, setStatus] = useState("offline"),
    [muted, setMuted] = useState(false),
    [caption, setCaption] = useState(""),
    [hasVideo, setHasVideo] = useState(false),
    [typed, setTyped] = useState("");
  const callbacks = useRef({ onStop, onError });
  callbacks.current = { onStop, onError };
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let instance: DailyCall | null = null;
    const handled = new Map<string, Promise<unknown>>();
    const update = (s: string) => {
      if (cancelled) return;
      setStatus(s);
      void action("avatar-status", { status: s }).catch(() => {});
    };
    const attach = () => {
      if (!instance || cancelled) return;
      const remote = Object.values(instance.participants()).find(
        (p) => !p.local,
      );
      if (!remote) return;
      const vt = remote.tracks.video.persistentTrack,
        at = remote.tracks.audio.persistentTrack;
      if (
        vt &&
        video.current &&
        (video.current.srcObject as MediaStream | null)?.getVideoTracks()[0]
          ?.id !== vt.id
      ) {
        video.current.srcObject = new MediaStream([vt]);
        setHasVideo(vt.readyState === "live");
      }
      if (
        at &&
        audio.current &&
        (audio.current.srcObject as MediaStream | null)?.getAudioTracks()[0]
          ?.id !== at.id
      ) {
        audio.current.srcObject = new MediaStream([at]);
        void audio.current.play().catch((error: DOMException) => {
          if (error.name !== "NotAllowedError") return;
          callbacks.current.onError(
            language === "es"
              ? "Toca el control de audio para escuchar a Alex."
              : "Tap the audio control to hear Alex.",
          );
        });
      }
    };
    async function start() {
      try {
        await pendingShutdown;
        if (cancelled) return;
        setMuted(false);
        update("connecting");
        const c = await action("avatar");
        conversation.current = c.id;
        if (cancelled) {
          await action("avatar-end");
          return;
        }
        const Daily = (await import("@daily-co/daily-js")).default;
        if (cancelled) return;
        instance = Daily.createCallObject({
          videoSource: false,
          audioSource: true,
        });
        call.current = instance;
        instance
          .on("participant-updated", attach)
          .on("track-started", attach)
          .on("participant-joined", attach);
        instance
          .on("joined-meeting", () => update("listening"))
          .on("left-meeting", () => {
            if (!cancelled) callbacks.current.onStop();
          })
          .on("error", () => {
            update("error");
            callbacks.current.onError(
              "Avatar connection interrupted. End the session and reconnect.",
            );
          });
        instance.on("active-speaker-change", (event) => {
          if (!event || !instance) return;
          const speaker = instance.participants()[event.activeSpeaker.peerId];
          update(speaker && !speaker.local ? "speaking" : "listening");
        });
        instance.on("app-message", async (event) => {
          if (!event || cancelled) return;
          const data = event.data;
          const props = data?.properties || {};
          if (
            data?.event_type === "conversation.started_speaking" &&
            ["pal", "replica"].includes(props.role)
          )
            update("speaking");
          if (
            data?.event_type === "conversation.stopped_speaking" &&
            ["pal", "replica"].includes(props.role)
          )
            update("listening");
          if (
            data?.event_type === "conversation.utterance" ||
            data?.event_type === "conversation.utterance.streaming"
          ) {
            const text = props.speech || props.text || props.transcript;
            if (typeof text === "string") setCaption(text);
          }
          if (data?.event_type !== "conversation.tool_call") return;
          const toolId = props.tool_call_id || data.tool_call_id;
          if (typeof toolId !== "string") {
            callbacks.current.onError(
              "Provider sent a tool call without a correlation ID.",
            );
            return;
          }
          try {
            if (!handled.has(toolId)) {
              const args =
                typeof props.arguments === "string"
                  ? JSON.parse(props.arguments)
                  : props.arguments;
              handled.set(toolId, action("tool", { name: props.name, args }));
            }
            const result = await handled.get(toolId);
            instance?.sendAppMessage(
              {
                message_type: "conversation",
                event_type: "conversation.tool_result",
                conversation_id: c.id,
                properties: {
                  tool_call_id: toolId,
                  output: JSON.stringify(result),
                  status: "success",
                },
              },
              "*",
            );
          } catch {
            instance?.sendAppMessage(
              {
                message_type: "conversation",
                event_type: "conversation.tool_result",
                conversation_id: c.id,
                properties: {
                  tool_call_id: toolId,
                  output:
                    "The action failed. Do not claim success. Offer human assistance.",
                  status: "error",
                },
              },
              "*",
            );
          }
        });
        await instance.join({
          url: c.url,
          token: c.token,
          startVideoOff: true,
          startAudioOff: false,
        });
      } catch (e) {
        update("error");
        callbacks.current.onError(
          e instanceof Error ? e.message : "Unable to connect",
        );
        callbacks.current.onStop();
      }
    }
    const started = start();
    const leave = () => {
      instance?.setLocalAudio(false);
      void instance?.destroy();
      navigator.sendBeacon(
        "/api/action",
        new Blob([JSON.stringify({ action: "avatar-end" })], {
          type: "application/json",
        }),
      );
    };
    window.addEventListener("pagehide", leave);
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", leave);
      instance?.setLocalAudio(false);
      void instance?.destroy();
      call.current = null;
      setHasVideo(false);
      setStatus("offline");
      setCaption("");
      pendingShutdown = started
        .catch(() => {})
        .then(() => action("avatar-end"))
        .catch(() => {});
    };
  }, [active]);
  useEffect(() => {
    const c = call.current;
    if (c && active)
      c.sendAppMessage(
        {
          message_type: "conversation",
          event_type: "conversation.respond",
          conversation_id: conversation.current,
          properties: {
            text:
              language === "es"
                ? "Por favor, continúa en español."
                : "Please continue in English.",
          },
        },
        "*",
      );
  }, [language, active]);
  const es = language === "es";
  const label =
    status === "connecting"
      ? es
        ? "Conectando"
        : "Connecting"
      : status === "speaking"
        ? es
          ? "Alex está hablando"
          : "Alex is speaking"
        : status === "listening"
          ? es
            ? "Te escucho"
            : "Listening to you"
          : es
            ? "Vista previa de Alex"
            : "Alex · portrait preview";
  return (
    <div className="avatar-scene">
      <img
        src="/alex-preview.png"
        alt="Alex, friendly AI concierge portrait preview"
        className={hasVideo ? "hidden" : ""}
      />
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        className={!hasVideo ? "hidden" : ""}
      />
      <audio ref={audio} autoPlay />
      <div className="avatar-top">
        <span className="glass-pill">
          <span className={active ? "dot pulse" : "dot"} />
          {label}
        </span>
        <span className="glass-pill">AI {es ? "asistente" : "concierge"}</span>
      </div>
      <div className="avatar-bottom">
        <div className="avatar-name">
          Alex
          <span>
            {es ? "Una bienvenida más humana." : "A more personal welcome."}
          </span>
        </div>
        {caption && (
          <div className="captions" aria-live="polite">
            {caption}
          </div>
        )}
        {active && (
          <div className="call-controls">
            <button
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              onClick={() => {
                call.current?.setLocalAudio(muted);
                setMuted(!muted);
              }}
            >
              {muted ? <MicOff size={21} /> : <Mic size={21} />}
            </button>
            <button
              aria-label="Play audio"
              onClick={() => {
                void audio.current
                  ?.play()
                  .then(() => callbacks.current.onError(""))
                  .catch(() =>
                    callbacks.current.onError(
                      "Audio playback is unavailable. Check your output device.",
                    ),
                  );
              }}
            >
              <Volume2 size={21} />
            </button>
            <button
              aria-label="End avatar call"
              className="hangup"
              onClick={onStop}
            >
              <PhoneOff size={21} />
            </button>
          </div>
        )}
        {active && (
          <form
            className="avatar-chat"
            onSubmit={(e) => {
              e.preventDefault();
              if (!typed.trim()) return;
              call.current?.sendAppMessage(
                {
                  message_type: "conversation",
                  event_type: "conversation.respond",
                  conversation_id: conversation.current,
                  properties: { text: typed },
                },
                "*",
              );
              setTyped("");
            }}
          >
            <input
              aria-label={es ? "Escribir a Alex" : "Type to Alex"}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={es ? "O escribe a Alex…" : "Or type to Alex…"}
              maxLength={500}
            />
            <button type="submit" disabled={!typed.trim()}>
              {es ? "Enviar" : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
