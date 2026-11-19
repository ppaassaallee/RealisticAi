import { reserveCall, bindCall, releaseCall } from "./call-cap";
import { MAX_CALL_SECONDS } from "@/lib/voice-budget";
export type TavusErrorCode =
  | "quota"
  | "concurrency"
  | "rate_limit"
  | "credentials"
  | "unavailable"
  | "request";
export class TavusError extends Error {
  constructor(
    public status: number,
    public code: TavusErrorCode,
  ) {
    super(
      `Live conversation unavailable (${status}). Contact your OneSource administrator or continue on screen.`,
    );
    this.name = "TavusError";
  }
}
export function classifyTavusError(
  status: number,
  detail: string,
): TavusErrorCode {
  if (/concurren|simultaneous|active conversation/i.test(detail))
    return "concurrency";
  if (
    status === 402 ||
    /quota|insufficient.*(credit|balance)|minutes.*(exceed|exhaust)|usage.limit|credit.*exhaust/i.test(
      detail,
    )
  )
    return "quota";
  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "credentials";
  return status >= 500 ? "unavailable" : "request";
}
export function configured() {
  return Boolean(
    process.env.TAVUS_API_KEY &&
    process.env.TAVUS_PAL_ID &&
    process.env.TAVUS_REPLICA_ID,
  );
}
export async function tavus(path: string, body?: unknown, method = "POST") {
  const lease =
    path === "/conversations" && method === "POST" ? reserveCall() : undefined;
  // Keep an uncertain reservation until expiry if fetch times out: creation may have succeeded.
  const response = await fetch(`https://tavusapi.com/v2${path}`, {
    method,
    headers: {
      "x-api-key": process.env.TAVUS_API_KEY || "",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    if (lease && response.status < 500) releaseCall(lease);
    // Use provider detail only to classify; never return/log its raw body.
    const detail = (await response.text()).slice(0, 10000);
    throw new TavusError(
      response.status,
      classifyTavusError(response.status, detail),
    );
  }
  if (response.status === 204) return {};
  const text = await response.text();
  const result = text ? JSON.parse(text) : {};
  if (lease) bindCall(lease, result.conversation_id);
  return result;
}
export async function startConversation(language: "en" | "es") {
  if (!configured())
    throw new Error(
      "Live avatar is not configured. Touchscreen check-in is available.",
    );
  return tavus("/conversations", {
    pal_id: process.env.TAVUS_PAL_ID,
    face_id: process.env.TAVUS_REPLICA_ID,
    conversation_name: "OneSource synthetic patient demo",
    require_auth: true,
    custom_greeting:
      language === "es"
        ? "Hola, soy Alex, tu asistente virtual. ¡Bienvenido! ¿Cómo puedo ayudarte hoy?"
        : "Hi, I'm Alex, your AI patient concierge. Welcome! How can I help you today?",
    conversational_context: `Use the curated public knowledge for general questions, but no unverified facility facts. Synthetic data demo only. Begin in ${language === "es" ? "Spanish" : "English"}. Use the three registered tools for every workflow action. Never claim a check-in or handoff succeeded without the tool result.`,
    properties: {
      languages: language === "es" ? ["es", "en"] : ["en", "es"],
      max_call_duration: MAX_CALL_SECONDS,
      participant_left_timeout: 10,
      participant_absent_timeout: 30,
      enable_recording: false,
      enable_closed_captions: true,
    },
  });
}
export async function endConversation(id: string) {
  try {
    await tavus(`/conversations/${encodeURIComponent(id)}/end`);
  } catch (error) {
    if (error instanceof TavusError && [404, 410].includes(error.status))
      releaseCall(undefined, id);
    throw error;
  }
  releaseCall(undefined, id);
}
