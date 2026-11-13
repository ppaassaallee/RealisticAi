import { tavus } from "@/lib/tavus";
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
    conversation_name: "Banco Interior · synthetic demo",
    require_auth: true,
    custom_greeting:
      s.language === "en"
        ? "Welcome! I'm Juliana, Banco Interior's virtual assistant. How can I help you today?"
        : "¡Qué gusto saludarte! Soy Juliana, tu asistente virtual de Banco Interior. ¿En qué te puedo ayudar hoy?",
    conversational_context: `Fictional bank, synthetic demonstration only. Context: ${modes[s.mode].name}. Language: ${s.language}. Every bankingJourney call opens the relevant screen. Use step open only when required data is missing; otherwise execute lookup/calculate/prepare directly in the same turn; searchBankKnowledge for approved information. Never access healthcare tools. Never claim real money moved. Ask one question at a time.`,
    properties: {
      languages: s.language === "es" ? ["es", "en"] : ["en", "es"],
      max_call_duration: 600,
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
