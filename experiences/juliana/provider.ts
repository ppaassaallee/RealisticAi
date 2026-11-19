import { MAX_CALL_SECONDS } from "@/lib/voice-budget";
import { tavus, TavusError, endConversation } from "@/lib/tavus";
import { modes } from "./config";
import type { BankSession } from "./store";
export const bankVoiceConfigured = () =>
  Boolean(
    process.env.TAVUS_API_KEY &&
    process.env.JULIANA_PAL_ID &&
    process.env.JULIANA_FACE_ID,
  );
export async function startBankConversation(s: BankSession) {
  if (!bankVoiceConfigured())
    throw new Error(
      "Voz en vivo no configurada. Podés seguir con la pantalla y las consultas escritas.",
    );
  if (process.env.JULIANA_PAL_ID === process.env.TAVUS_PAL_ID)
    throw new Error(
      "La configuración de Juliana debe ser independiente de Alex.",
    );
  const c = await tavus("/conversations", {
    pal_id: process.env.JULIANA_PAL_ID,
    face_id: process.env.JULIANA_FACE_ID,
    conversation_name: "OneSource · synthetic demo",
    require_auth: true,
    custom_greeting:
      s.language === "en"
        ? "Welcome! I'm Juliana, OneSource's virtual assistant. How can I help you today?"
        : "¡Qué gusto saludarte! Soy Juliana, tu asistente virtual de OneSource. ¿En qué te puedo ayudar hoy?",
    conversational_context: `OneSource banking experience, synthetic demonstration only. Present OneSource as the solution brand. Context: ${modes[s.mode].name}. Language: ${s.language}. Every bankingJourney call opens the relevant screen. Use step open only when required data is missing; otherwise execute lookup/calculate/prepare directly in the same turn; searchBankKnowledge for approved information. Never access healthcare tools. Never claim real money moved. Ask one question at a time. Keep explanations warm and concise; do not repeat demo disclaimers on every turn or read every backend caveat aloud. Clearly distinguish simulated transaction confirmations once, and never claim real funds moved.`,
    properties: {
      languages: s.language === "es" ? ["es", "en"] : ["en", "es"],
      max_call_duration: MAX_CALL_SECONDS,
      participant_left_timeout: 10,
      participant_absent_timeout: 30,
      enable_recording: false,
      enable_closed_captions: true,
    },
  });
  return {
    id: c.conversation_id,
    url: c.conversation_url,
    token: c.meeting_token,
  };
}

export async function endBankConversation(id: string) {
  try {
    await endConversation(id);
  } catch (error) {
    if (!(error instanceof TavusError && [404, 410].includes(error.status)))
      throw error;
  }
}
export function bankVoiceError(error: unknown) {
  if (error instanceof TavusError) {
    const messages = {
      quota:
        "Se alcanzó el límite de conversación en vivo. Contactá al administrador de OneSource. Podés seguir usando la pantalla.",
      concurrency:
        "Ya hay una llamada activa en este workspace. Cerrala antes de volver a conectar.",
      rate_limit:
        "El servicio de conversación está ocupado. Esperá un momento y volvé a intentar.",
      credentials:
        "No se pudo autorizar la conversación. Contactá al administrador de OneSource.",
      unavailable:
        "La conversación en vivo no está disponible en este momento. Podés continuar por pantalla y volver a conectar después.",
      request:
        "No se pudo iniciar la llamada. Podés continuar por pantalla o revisar la configuración de voz.",
    };
    return {
      code: error.code,
      message: messages[error.code],
      status:
        error.code === "quota"
          ? 402
          : error.code === "concurrency"
            ? 409
            : error.status === 429
              ? 429
              : 503,
    };
  }
  if (
    error instanceof Error &&
    ["TimeoutError", "AbortError"].includes(error.name)
  )
    return {
      code: "timeout",
      message:
        "La conexión tardó demasiado. Podés seguir por pantalla y volver a intentar.",
      status: 504,
    };
  return null;
}
