// Provider-enforced limit remains effective if the browser disappears.
export const MAX_CALL_SECONDS = 300;
export const VOICE_IDLE_MS = 90_000;
export const CONNECT_TIMEOUT_MS = 45_000;
export function voiceBudgetReason(
  now: number,
  started: number,
  lastActivity: number,
  connected: boolean,
) {
  if (now - started >= MAX_CALL_SECONDS * 1000) return "limit";
  if (!connected && now - started >= CONNECT_TIMEOUT_MS) return "connection";
  if (connected && now - lastActivity >= VOICE_IDLE_MS) return "idle";
  return null;
}
export function isVoiceActivity(data: { event_type?: string }) {
  return [
    "conversation.started_speaking",
    "conversation.stopped_speaking",
    "conversation.utterance",
    "conversation.utterance.streaming",
    "conversation.tool_call",
  ].includes(data.event_type || "");
}
