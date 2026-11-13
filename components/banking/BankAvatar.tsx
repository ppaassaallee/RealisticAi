"use client";
import { useEffect, useRef, useState } from "react";
import type { DailyCall } from "@daily-co/daily-js";
import { Mic, MicOff, PhoneOff, Volume2, Square } from "lucide-react";
import { bankAction as action } from "./client";
import { isConversationActivity } from "@/experiences/juliana/voice";
let pendingShutdown: Promise<unknown> = Promise.resolve();
export default function BankAvatar({
  active,
  language,
  onStop,
  onError,
  onActivity,
}: {
  active: boolean;
  language: "en" | "es";
  onStop: () => void;
  onError: (message: string) => void;
  onActivity: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    audio = useRef<HTMLAudioElement>(null),
    call = useRef<DailyCall | null>(null),
    conversation = useRef("");
  const responseStart = useRef<number | null>(null);
  const [status, setStatus] = useState("offline"),
    [muted, setMuted] = useState(false),
    [caption, setCaption] = useState(""),
    [captionRole, setCaptionRole] = useState("juliana"),
    [hasVideo, setHasVideo] = useState(false),
    [typed, setTyped] = useState("");
  const callbacks = useRef({ onStop, onError, onActivity });
  callbacks.current = { onStop, onError, onActivity };
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let createdId = "";
    let instance: DailyCall | null = null;
    const handled = new Map<string, Promise<unknown>>();
    let lastStatus = "";
    const update = (s: string) => {
      if (lastStatus === s) return;
      lastStatus = s;
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
              ? "Toca el control de audio para escuchar a Juliana."
              : "Tap the audio control to hear Juliana.",
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
        createdId = c.id;
        conversation.current = c.id;
        if (cancelled) {
          await action("avatar-end", { conversationId: c.id });
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
            if (cancelled) return;
            update("error");
            callbacks.current.onError(
              language === "es"
                ? "Se interrumpió la conexión. Podés volver a conectar o continuar por pantalla."
                : "Connection interrupted. Reconnect or continue on screen.",
            );
            callbacks.current.onStop();
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
          if (data && isConversationActivity(data))
            callbacks.current.onActivity();
          if (
            data?.event_type === "conversation.stopped_speaking" &&
            props.role === "user"
          )
            responseStart.current = performance.now();
          if (
            data?.event_type === "conversation.started_speaking" &&
            ["pal", "replica"].includes(props.role) &&
            responseStart.current !== null
          ) {
            const elapsed = performance.now() - responseStart.current;
            responseStart.current = null;
            if (elapsed >= 0 && elapsed <= 120000)
              void action("response-observed", { durationMs: elapsed }).catch(
                () => {},
              );
          }

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
            if (typeof text === "string") {
              setCaption(text);
              setCaptionRole(props.role === "user" ? "user" : "juliana");
            }
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
            if (cancelled) return;
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
          } catch (error) {
            if (cancelled) return;
            instance?.sendAppMessage(
              {
                message_type: "conversation",
                event_type: "conversation.tool_result",
                conversation_id: c.id,
                properties: {
                  tool_call_id: toolId,
                  output: JSON.stringify({
                    error:
                      error instanceof Error
                        ? error.message
                        : "No se pudo completar la acción.",
                    instruction:
                      "Do not claim success. If fields are missing or invalid, ask one concise question to correct them and retry with a new tool call ID. Offer human assistance if the problem persists.",
                  }),
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
        if (cancelled) return;
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
        "/api/juliana",
        new Blob(
          [
            JSON.stringify({
              action: "avatar-end",
              conversationId: createdId || undefined,
            }),
          ],
          {
            type: "application/json",
          },
        ),
      );
    };
    window.addEventListener("pagehide", leave);
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", leave);
      instance?.setLocalAudio(false);
      const destroyed = instance?.destroy().catch(() => {});
      call.current = null;
      setHasVideo(false);
      setStatus("offline");
      setCaption("");
      setTyped("");
      responseStart.current = null;
      pendingShutdown = Promise.allSettled([started, destroyed])
        .then(() =>
          createdId
            ? action("avatar-end", { conversationId: createdId })
            : undefined,
        )
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
          ? "Juliana está hablando"
          : "Juliana is speaking"
        : status === "listening"
          ? es
            ? "Te escucho"
            : "Listening to you"
          : es
            ? "Retrato de Juliana · no es video"
            : "Juliana · portrait preview";
  return (
    <div className="avatar-scene">
      <img
        src="/juliana-preview.png"
        alt="Juliana, virtual banking assistant portrait preview"
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
        <span className="glass-pill">
          AI {es ? "asistente virtual" : "virtual assistant"}
        </span>
      </div>
      <div className="avatar-bottom">
        <div className="avatar-name">
          Juliana
          <span>
            {es
              ? "Cerca de vos, estés donde estés."
              : "Cerca de vos, estés donde estés."}
          </span>
        </div>
        {caption && (
          <div
            className="captions"
            data-speaker={captionRole}
            aria-live="polite"
          >
            <span className="caption-speaker">
              {captionRole === "juliana" ? "Juliana" : es ? "Tú" : "You"}
            </span>
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
              aria-label={es ? "Interrumpir a Juliana" : "Interrupt Juliana"}
              onClick={() => {
                call.current?.sendAppMessage(
                  {
                    message_type: "conversation",
                    event_type: "conversation.interrupt",
                    conversation_id: conversation.current,
                  },
                  "*",
                );
                setStatus("listening");
              }}
            >
              <Square size={18} />
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
        {active && muted && (
          <div className="glass-pill">
            {es
              ? "Micrófono pausado · activalo para hablar"
              : "Microphone paused · enable it to speak"}
          </div>
        )}
        {active && (
          <form
            className="avatar-chat"
            onSubmit={(e) => {
              e.preventDefault();
              if (!typed.trim() || !hasVideo) return;
              callbacks.current.onActivity();
              call.current?.setLocalAudio(false);
              setMuted(true);
              responseStart.current = performance.now();
              if (status === "speaking")
                call.current?.sendAppMessage(
                  {
                    message_type: "conversation",
                    event_type: "conversation.interrupt",
                    conversation_id: conversation.current,
                  },
                  "*",
                );
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
              aria-label={es ? "Escribir a Juliana" : "Type to Juliana"}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={es ? "O escribe a Juliana…" : "Or type to Juliana…"}
              maxLength={500}
            />
            <button type="submit" disabled={!typed.trim() || !hasVideo}>
              {es ? "Enviar" : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
