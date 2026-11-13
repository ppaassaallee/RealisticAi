// Shared, deterministic voice rules: no vendor requests or browser globals.
export const VOICE_IDLE_MS = 120000;
export function isConversationActivity(data: {
  event_type?: string;
  properties?: { role?: string };
}) {
  return [
    "conversation.started_speaking",
    "conversation.stopped_speaking",
    "conversation.utterance",
    "conversation.utterance.streaming",
    "conversation.tool_call",
  ].includes(data.event_type || "");
}
export function sessionShouldExpire(
  now: number,
  lastActivity: number,
  expires: number,
) {
  return now >= expires || now - lastActivity > VOICE_IDLE_MS;
}
